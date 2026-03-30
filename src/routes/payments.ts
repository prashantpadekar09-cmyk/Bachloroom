import express from "express";
import { db } from "../db/setup.js";
import crypto from "crypto";
import Razorpay from "razorpay";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();
const razorpayKeyId = process.env.RAZORPAY_KEY_ID?.trim() || "";
const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET?.trim() || "";

const razorpay =
  razorpayKeyId && razorpayKeySecret
    ? new Razorpay({
        key_id: razorpayKeyId,
        key_secret: razorpayKeySecret,
      })
    : null;

const packageCosts: Record<string, number> = {
  mattress: 500,
  wifi: 800,
  gas: 400,
  cleaning: 1000,
};

const PREMIUM_AMOUNT = 99;
const UTR_REGEX = /^[A-Za-z0-9]{8,22}$/;

const isValidUtr = (value: unknown) => typeof value === "string" && UTR_REGEX.test(value.trim());

const normalizePackageList = (moveInPackage: unknown) => {
  if (Array.isArray(moveInPackage)) {
    return moveInPackage.filter((item): item is string => typeof item === "string");
  }

  return [];
};

const getDailyRate = (roomPrice: number) => Math.max(1, Math.round((Number(roomPrice) || 0) / 30));

const calculatePaymentBreakdown = (roomPrice: number, bookingData: any = {}) => {
  const duration = Math.max(1, Number(bookingData.duration) || 1);
  const people = Math.max(1, Number(bookingData.people) || 1);
  const packageList = normalizePackageList(bookingData.moveInPackage);
  const dailyRate = getDailyRate(roomPrice);
  const packageTotalPerDay = packageList.reduce((sum, item) => sum + Math.round((packageCosts[item] || 0) / 30), 0);
  const baseRent = dailyRate * duration * people;
  const packageTotal = packageTotalPerDay * duration;
  const subtotal = baseRent + packageTotal;
  const platformFee = Math.round(subtotal * 0.03);
  const totalAmount = subtotal + platformFee;
  const ownerAmount = totalAmount - platformFee;

  return {
    duration,
    people,
    dailyRate,
    packageList,
    packageTotal,
    platformFee,
    totalAmount,
    ownerAmount,
  };
};

const getUserPremiumFlag = (userId: string) => {
  const user = db.prepare("SELECT isPremium FROM users WHERE id = ?").get(userId) as any;
  return user?.isPremium ? 1 : 0;
};

router.post("/premium", authenticateToken, (req: any, res: any) => {
  const { utrNumber, screenshot } = req.body;
  const normalizedUtr = typeof utrNumber === "string" ? utrNumber.trim().toUpperCase() : "";

  if (!isValidUtr(normalizedUtr)) {
    return res.status(400).json({ error: "Please enter a valid UTR number." });
  }

  try {
    const existingApproved = db
      .prepare("SELECT isPremium FROM users WHERE id = ?")
      .get(req.user.id) as any;

    if (existingApproved?.isPremium) {
      return res.status(400).json({ error: "Premium is already active on your account." });
    }

    const existingRequest = db
      .prepare(
        "SELECT id, status FROM premium_payments WHERE (userId = ? AND status = 'pending') OR utrNumber = ? LIMIT 1"
      )
      .get(req.user.id, normalizedUtr) as any;

    if (existingRequest) {
      return res.status(409).json({
        error:
          existingRequest.status === "pending"
            ? "A premium payment request is already pending review."
            : "This UTR number has already been submitted.",
      });
    }

    const paymentId = crypto.randomUUID();
    db.prepare(
      "INSERT INTO premium_payments (id, userId, amount, utrNumber, screenshot, status) VALUES (?, ?, ?, ?, ?, 'pending')"
    ).run(paymentId, req.user.id, PREMIUM_AMOUNT, normalizedUtr, screenshot || null);

    res.status(201).json({ message: "Payment proof submitted. Waiting for admin approval.", paymentId });
  } catch (err: any) {
    if (err.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res.status(409).json({ error: "This UTR number has already been submitted." });
    }
    console.error(err);
    res.status(500).json({ error: "Failed to submit premium payment." });
  }
});

router.get("/premium/status", authenticateToken, (req: any, res: any) => {
  try {
    const user = db
      .prepare("SELECT id, isPremium FROM users WHERE id = ?")
      .get(req.user.id) as any;

    const payment = db
      .prepare(
        `SELECT id, amount, utrNumber, screenshot, status, createdAt
         FROM premium_payments
         WHERE userId = ?
         ORDER BY createdAt DESC
         LIMIT 1`
      )
      .get(req.user.id);

    res.json({
      isPremium: Boolean(user?.isPremium),
      amount: PREMIUM_AMOUNT,
      payment: payment || null,
      paymentConfig: {
        amount: PREMIUM_AMOUNT,
        upiId: "prashantpadekar09@oksbi",
        payeeName: "Room Rental Admin",
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch premium payment status." });
  }
});

router.get("/admin/premium-requests", authenticateToken, (req: any, res: any) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Forbidden" });

  try {
    const requests = db
      .prepare(
        `SELECT p.*, u.name as userName, u.email as userEmail
         FROM premium_payments p
         JOIN users u ON u.id = p.userId
         ORDER BY CASE p.status WHEN 'pending' THEN 0 WHEN 'rejected' THEN 1 ELSE 2 END, p.createdAt DESC`
      )
      .all();

    res.json({ requests });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch premium payment requests." });
  }
});

router.put("/admin/premium-requests/:id", authenticateToken, (req: any, res: any) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Forbidden" });

  const { status } = req.body;
  if (!["approved", "rejected"].includes(status)) {
    return res.status(400).json({ error: "Invalid payment status." });
  }

  try {
    const request = db
      .prepare("SELECT id, userId, status FROM premium_payments WHERE id = ?")
      .get(req.params.id) as any;

    if (!request) {
      return res.status(404).json({ error: "Payment request not found." });
    }

    const reviewRequest = db.transaction(() => {
      db.prepare(
        "UPDATE premium_payments SET status = ?, reviewedBy = ?, reviewedAt = CURRENT_TIMESTAMP WHERE id = ?"
      ).run(status, req.user.id, req.params.id);

      if (status === "approved") {
        db.prepare("UPDATE users SET isPremium = 1, subscriptionPlan = 'premium' WHERE id = ?").run(request.userId);
      }
    });

    reviewRequest();

    res.json({ message: `Premium payment ${status}.` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update premium payment status." });
  }
});

router.post("/rent", authenticateToken, (req: any, res: any) => {
  const { bookingId, utrNumber } = req.body;
  const normalizedUtr = typeof utrNumber === "string" ? utrNumber.trim().toUpperCase() : "";

  if (!bookingId) {
    return res.status(400).json({ error: "Booking ID is required." });
  }

  if (!isValidUtr(normalizedUtr)) {
    return res.status(400).json({ error: "Please enter a valid UTR number." });
  }

  try {
    const booking = db
      .prepare(
        `SELECT b.id, b.userId, b.roomId, b.totalAmount, b.duration, r.ownerId, r.price
         FROM bookings b
         JOIN rooms r ON r.id = b.roomId
         WHERE b.id = ?`
      )
      .get(bookingId) as any;

    if (!booking) {
      return res.status(404).json({ error: "Booking not found." });
    }

    if (booking.userId !== req.user.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const existing = db.prepare("SELECT id FROM rent_payments WHERE bookingId = ?").get(bookingId) as any;
    if (existing) {
      return res.status(409).json({ error: "Rent payment proof has already been submitted for this booking." });
    }

    const amount =
      Number(booking.totalAmount) ||
      getDailyRate(Number(booking.price)) * Math.max(1, Number(booking.duration) || 1);
    const rentPaymentId = crypto.randomUUID();

    db.prepare(
      `INSERT INTO rent_payments (id, bookingId, userId, roomId, ownerId, amount, utrNumber, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`
    ).run(rentPaymentId, booking.id, booking.userId, booking.roomId, booking.ownerId, amount, normalizedUtr);

    res.status(201).json({ message: "Rent payment UTR submitted for owner verification.", rentPaymentId });
  } catch (err: any) {
    if (err.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res.status(409).json({ error: "Rent payment proof has already been submitted for this booking." });
    }
    console.error(err);
    res.status(500).json({ error: "Failed to submit rent payment." });
  }
});

router.get("/rent/owner", authenticateToken, (req: any, res: any) => {
  if (req.user.role !== "owner" && req.user.role !== "admin") {
    return res.status(403).json({ error: "Forbidden" });
  }

  try {
    const query =
      req.user.role === "admin"
        ? `SELECT rp.*, u.name as userName, u.email as userEmail, b.moveInDate, b.duration, r.title as roomTitle
           FROM rent_payments rp
           JOIN users u ON u.id = rp.userId
           JOIN bookings b ON b.id = rp.bookingId
           JOIN rooms r ON r.id = rp.roomId
           ORDER BY CASE rp.status WHEN 'pending' THEN 0 ELSE 1 END, rp.createdAt DESC`
        : `SELECT rp.*, u.name as userName, u.email as userEmail, b.moveInDate, b.duration, r.title as roomTitle
           FROM rent_payments rp
           JOIN users u ON u.id = rp.userId
           JOIN bookings b ON b.id = rp.bookingId
           JOIN rooms r ON r.id = rp.roomId
           WHERE rp.ownerId = ?
           ORDER BY CASE rp.status WHEN 'pending' THEN 0 ELSE 1 END, rp.createdAt DESC`;

    const payments =
      req.user.role === "admin" ? db.prepare(query).all() : db.prepare(query).all(req.user.id);

    res.json({ payments });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch rent payments." });
  }
});

router.get("/rent/mine", authenticateToken, (req: any, res: any) => {
  try {
    const payments = db
      .prepare(
        `SELECT rp.*, b.moveInDate, b.duration, r.title as roomTitle
         FROM rent_payments rp
         JOIN bookings b ON b.id = rp.bookingId
         JOIN rooms r ON r.id = rp.roomId
         WHERE rp.userId = ?
         ORDER BY rp.createdAt DESC`
      )
      .all(req.user.id);

    res.json({ payments });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch rent payment history." });
  }
});

router.put("/rent/:id/verify", authenticateToken, (req: any, res: any) => {
  if (req.user.role !== "owner" && req.user.role !== "admin") {
    return res.status(403).json({ error: "Forbidden" });
  }

  try {
    const payment = db
      .prepare("SELECT id, ownerId, bookingId FROM rent_payments WHERE id = ?")
      .get(req.params.id) as any;

    if (!payment) {
      return res.status(404).json({ error: "Rent payment not found." });
    }

    if (req.user.role !== "admin" && payment.ownerId !== req.user.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const verifyTransaction = db.transaction(() => {
      db.prepare("UPDATE rent_payments SET status = 'verified', verifiedAt = CURRENT_TIMESTAMP WHERE id = ?").run(
        req.params.id
      );
      db.prepare("UPDATE bookings SET status = 'paid' WHERE id = ?").run(payment.bookingId);
    });

    verifyTransaction();

    res.json({ message: "Rent payment verified successfully." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to verify rent payment." });
  }
});

router.post("/create-order", authenticateToken, async (req: any, res: any) => {
  const { roomId, amount } = req.body;

  try {
    if (!razorpay || !razorpayKeyId) {
      return res.status(503).json({ error: "Online payments are not configured right now." });
    }

    const normalizedAmount = Number(amount);
    if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
      return res.status(400).json({ error: "A valid amount is required." });
    }

    const platformFee = Math.round(normalizedAmount * 0.03);
    const ownerAmount = normalizedAmount - platformFee;

    const options = {
      amount: Math.round(normalizedAmount * 100),
      currency: "INR",
      receipt: `receipt_${crypto.randomUUID()}`,
    };

    const order = await razorpay.orders.create(options);

    res.json({
      orderId: order.id,
      amount: normalizedAmount,
      platformFee: platformFee,
      ownerAmount: ownerAmount,
      currency: "INR",
      keyId: razorpayKeyId
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create order" });
  }
});

router.post("/verify", authenticateToken, async (req: any, res: any) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    roomId,
    bookingData
  } = req.body;

  if (!razorpayKeySecret) {
    return res.status(503).json({ error: "Online payments are not configured right now." });
  }

  const sign = razorpay_order_id + "|" + razorpay_payment_id;
  const expectedSign = crypto
    .createHmac("sha256", razorpayKeySecret)
    .update(sign.toString())
    .digest("hex");

  if (razorpay_signature === expectedSign) {
    try {
      const { moveInDate, duration, people, moveInPackage } = bookingData;
      const bookingId = crypto.randomUUID();
      const paymentId = crypto.randomUUID();
      const premiumIncluded = getUserPremiumFlag(req.user.id);
      
      const room = db.prepare("SELECT price, ownerId FROM rooms WHERE id = ?").get(roomId) as any;
      if (!room) return res.status(404).json({ error: "Room not found" });

      const breakdown = calculatePaymentBreakdown(room.price, bookingData);

      const transaction = db.transaction(() => {
        // 1. Create Booking
        const bookingStmt = db.prepare(
          "INSERT INTO bookings (id, userId, roomId, moveInDate, duration, people, premiumIncluded, serviceFee, paymentFee, totalAmount, status, moveInPackage) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        );
        const packageStr = JSON.stringify(breakdown.packageList);
        bookingStmt.run(
          bookingId,
          req.user.id,
          roomId,
          moveInDate,
          breakdown.duration,
          people,
          premiumIncluded,
          breakdown.packageTotal,
          breakdown.platformFee,
          breakdown.totalAmount,
          'confirmed',
          packageStr
        );

        // 2. Create Payment Record
        const paymentStmt = db.prepare(
          "INSERT INTO payments (id, userId, roomId, bookingId, totalAmount, platformFee, ownerAmount, paymentStatus, transactionId, razorpayOrderId, razorpayPaymentId, razorpaySignature) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        );
        paymentStmt.run(
          paymentId,
          req.user.id,
          roomId,
          bookingId,
          breakdown.totalAmount,
          breakdown.platformFee,
          breakdown.ownerAmount,
          'completed',
          razorpay_payment_id,  // transactionId
          razorpay_order_id,    // razorpayOrderId
          razorpay_payment_id,  // razorpayPaymentId
          razorpay_signature    // razorpaySignature
        );
      });

      transaction();

      res.json({ message: "Payment verified and booking confirmed", bookingId });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to save booking" });
    }
  } else {
    res.status(400).json({ error: "Invalid signature" });
  }
});

router.post("/manual-verify", authenticateToken, async (req: any, res: any) => {
  const { roomId, bookingData, transactionId, screenshot } = req.body;
  const normalizedUtr = typeof transactionId === "string" ? transactionId.trim().toUpperCase() : "";

  if (!isValidUtr(normalizedUtr)) {
    return res.status(400).json({ error: "Please enter a valid UTR number." });
  }

  try {
    const { moveInDate, duration, people, moveInPackage } = bookingData;
    const bookingId = crypto.randomUUID();
    const paymentId = crypto.randomUUID();
    const premiumIncluded = getUserPremiumFlag(req.user.id);
    
    const room = db.prepare("SELECT price, ownerId FROM rooms WHERE id = ?").get(roomId) as any;
    if (!room) return res.status(404).json({ error: "Room not found" });

    const existingBooking = db
      .prepare(
        `SELECT b.id
         FROM bookings b
         WHERE b.userId = ? AND b.roomId = ? AND b.moveInDate = ? AND b.status IN ('pending_payment', 'under_review', 'confirmed')`
      )
      .get(req.user.id, roomId, moveInDate) as any;

    if (existingBooking) {
      return res.status(409).json({ error: "A booking request for this room is already active." });
    }

    const existingPayment = db
      .prepare("SELECT id FROM payments WHERE transactionId = ? LIMIT 1")
      .get(normalizedUtr) as any;

    if (existingPayment) {
      return res.status(409).json({ error: "This UTR number has already been used." });
    }

    const breakdown = calculatePaymentBreakdown(room.price, bookingData);

    const transaction = db.transaction(() => {
      const bookingStmt = db.prepare(
        "INSERT INTO bookings (id, userId, roomId, moveInDate, duration, people, premiumIncluded, serviceFee, paymentFee, totalAmount, status, moveInPackage) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      );
      const packageStr = JSON.stringify(breakdown.packageList);
      bookingStmt.run(
        bookingId,
        req.user.id,
        roomId,
        moveInDate,
        breakdown.duration,
        people,
        premiumIncluded,
        breakdown.packageTotal,
        breakdown.platformFee,
        breakdown.totalAmount,
        'under_review',
        packageStr
      );

      const paymentStmt = db.prepare(
        `INSERT INTO payments (
          id, userId, roomId, bookingId, totalAmount, platformFee, ownerAmount,
          paymentStatus, paymentMethod, transactionId, paymentScreenshot, razorpayPaymentId
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );
      paymentStmt.run(
        paymentId,
        req.user.id,
        roomId,
        bookingId,
        breakdown.totalAmount,
        breakdown.platformFee,
        breakdown.ownerAmount,
        'pending',
        'manual',
        normalizedUtr,
        screenshot || null,
        normalizedUtr
      );
    });

    transaction();

    res.json({ message: "Booking pending - waiting for admin approval.", bookingId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save booking" });
  }
});

router.get("/stats", authenticateToken, (req: any, res: any) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Forbidden" });

  try {
    const stats = db.prepare(`
      SELECT 
        SUM(totalAmount) as totalVolume,
        SUM(platformFee) as totalCommission,
        COUNT(*) as totalTransactions
      FROM payments
      WHERE paymentStatus = 'completed'
    `).get();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/owner-earnings", authenticateToken, (req: any, res: any) => {
  try {
    const earnings = db.prepare(`
      SELECT 
        SUM(p.ownerAmount) as totalEarnings,
        COUNT(p.id) as totalBookings,
        SUM(p.totalAmount) as totalCollected,
        SUM(p.platformFee) as totalCommission
      FROM payments p
      JOIN rooms r ON p.roomId = r.id
      WHERE r.ownerId = ? AND p.paymentStatus = 'completed'
    `).get(req.user.id);
    
    const transactions = db.prepare(`
      SELECT p.*, r.title as roomTitle, u.name as userName, u.email as userEmail, b.status as bookingStatus
      FROM payments p
      JOIN rooms r ON p.roomId = r.id
      JOIN users u ON p.userId = u.id
      LEFT JOIN bookings b ON p.bookingId = b.id
      WHERE r.ownerId = ?
      ORDER BY p.createdAt DESC
    `).all(req.user.id);

    res.json({ earnings, transactions });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/owner-payouts", authenticateToken, (req: any, res: any) => {
  try {
    const payouts = db.prepare(`
      SELECT * FROM payouts
      WHERE ownerId = ?
      ORDER BY createdAt DESC
    `).all(req.user.id);
    res.json(payouts);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/all-payouts", authenticateToken, (req: any, res: any) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Forbidden" });

  try {
    const payouts = db.prepare(`
      SELECT p.*, u.name as ownerName
      FROM payouts p
      JOIN users u ON p.ownerId = u.id
      ORDER BY p.createdAt DESC
    `).all();
    res.json(payouts);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/admin-transactions", authenticateToken, (req: any, res: any) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Forbidden" });

  try {
    const summary = db.prepare(`
      SELECT
        COUNT(*) as totalTransactions,
        SUM(CASE WHEN paymentStatus = 'completed' THEN totalAmount ELSE 0 END) as completedVolume,
        SUM(CASE WHEN paymentStatus = 'completed' THEN platformFee ELSE 0 END) as completedCommission,
        SUM(CASE WHEN paymentStatus = 'completed' THEN ownerAmount ELSE 0 END) as ownerSettlements,
        SUM(CASE WHEN paymentStatus = 'pending' THEN totalAmount ELSE 0 END) as pendingVolume
      FROM payments
    `).get();

    const transactions = db.prepare(`
      SELECT
        p.*,
        u.name as userName,
        u.email as userEmail,
        r.title as roomTitle,
        owner.name as ownerName,
        b.status as bookingStatus
      FROM payments p
      JOIN users u ON p.userId = u.id
      JOIN rooms r ON p.roomId = r.id
      JOIN users owner ON r.ownerId = owner.id
      LEFT JOIN bookings b ON p.bookingId = b.id
      ORDER BY p.createdAt DESC
    `).all();

    res.json({ summary, transactions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:id/status", authenticateToken, (req: any, res: any) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Forbidden" });

  const { status, transactionId } = req.body;
  if (!["completed", "failed", "pending"].includes(status)) {
    return res.status(400).json({ error: "Invalid payment status" });
  }

  try {
    const payment = db.prepare("SELECT id, bookingId FROM payments WHERE id = ?").get(req.params.id) as any;
    if (!payment) {
      return res.status(404).json({ error: "Payment not found" });
    }

    const bookingStatus =
      status === "completed" ? "confirmed" :
      status === "failed" ? "rejected" :
      "pending_payment";

    const updateTransaction = db.transaction(() => {
      db.prepare(
        "UPDATE payments SET paymentStatus = ?, transactionId = COALESCE(?, transactionId) WHERE id = ?"
      ).run(status, transactionId || null, req.params.id);
      db.prepare("UPDATE bookings SET status = ? WHERE id = ?").run(bookingStatus, payment.bookingId);
    });

    updateTransaction();

    res.json({ message: "Payment status updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/request-payout", authenticateToken, (req: any, res: any) => {
  const amount = Number(req.body?.amount);
  const upiId = typeof req.body?.upiId === "string" ? req.body.upiId.trim() : "";

  try {
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ error: "Valid payout amount is required" });
    }

    if (!upiId) {
      return res.status(400).json({ error: "UPI ID is required" });
    }

    const earnings = db.prepare(`
      SELECT SUM(ownerAmount) as total FROM payments p
      JOIN rooms r ON p.roomId = r.id
      WHERE r.ownerId = ? AND p.paymentStatus = 'completed'
    `).get(req.user.id) as any;

    const paidOut = db.prepare(`
      SELECT SUM(amount) as total FROM payouts
      WHERE ownerId = ? AND status != 'failed'
    `).get(req.user.id) as any;

    const balance = (earnings.total || 0) - (paidOut.total || 0);

    if (amount > balance) {
      return res.status(400).json({ error: "Insufficient balance" });
    }

    const payoutId = crypto.randomUUID();
    db.prepare("INSERT INTO payouts (id, ownerId, amount, upiId, status) VALUES (?, ?, ?, ?, ?)").run(
      payoutId,
      req.user.id,
      amount,
      upiId,
      'pending'
    );

    res.json({ message: "Payout requested successfully", payoutId });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/payouts/:id/status", authenticateToken, (req: any, res: any) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Forbidden" });
  const { status, transactionId } = req.body;

  try {
    db.prepare("UPDATE payouts SET status = ?, transactionId = ? WHERE id = ?").run(
      status,
      transactionId,
      req.params.id
    );
    res.json({ message: "Payout status updated" });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
