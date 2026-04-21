import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { db } from "../../database/setup.js";
import { JWT_SECRET, authenticateToken } from "../middleware/auth.js";

const router = express.Router();
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const AADHAAR_REGEX = /^\d{12}$/;
const DISPOSABLE_DOMAINS = new Set([
  "10minutemail.com", "temp-mail.org", "tempmail.com", "mailinator.com",
  "guerrillamail.com", "yopmail.com", "sharklasers.com", "throwawaymail.com",
  "trashmail.com", "getnada.com", "maildrop.cc", "dispostable.com",
  "fakeinbox.com", "tempr.email", "mintemail.com",
]);
const ALLOWED_ROLES = new Set(["user", "owner", "service_provider"]);
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || "";

type GoogleTokenInfo = {
  sub: string;
  email: string;
  email_verified: string;
  name?: string;
  picture?: string;
  aud: string;
};

function getEmailValidationError(rawEmail: unknown) {
  if (typeof rawEmail !== "string") return "Email is required";
  const email = rawEmail.trim().toLowerCase();
  if (!EMAIL_REGEX.test(email)) return "Enter a valid email address";
  const [localPart, domain] = email.split("@");
  if (!localPart || !domain) return "Enter a valid email address";
  if (DISPOSABLE_DOMAINS.has(domain)) return "Disposable email addresses are not allowed";
  const suspiciousPatterns = [/^test\d*$/, /^fake\d*$/, /^temp\d*$/, /^dummy\d*$/, /^asdf\d*$/, /^qwerty\d*$/, /^user\d{5,}$/, /^abc\d*$/];
  if (suspiciousPatterns.some((p) => p.test(localPart))) return "Use a real email address to sign up";
  if (/(.)(\1){5,}/.test(localPart)) return "Use a real email address to sign up";
  return null;
}

function roleNeedsIdentity(role: unknown) {
  return typeof role === "string" && role !== "user";
}

function getMissingRegisterFieldError(input: { name?: unknown; email?: unknown; password?: unknown }) {
  if (typeof input.name !== "string" || !input.name.trim()) return "Full name is required";
  if (typeof input.email !== "string" || !input.email.trim()) return "Email is required";
  if (typeof input.password !== "string" || !input.password.trim()) return "Password is required";
  return null;
}

function buildAuthResponse(user: any) {
  const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      subscriptionPlan: user.subscriptionPlan,
      isPremium: Boolean(user.isPremium),
      phone: user.phone,
      aadhaarNumber: user.aadhaarNumber,
      idDocument: user.idDocument,
      selfieImage: user.selfieImage,
      isVerified: Boolean(user.isVerified),
      referralCode: user.referralCode,
      referredById: user.referredById,
      referralBalance: Number(user.referralBalance ?? 0), // BUG FIX: was missing
      referralEarnings: Number(user.referralEarnings ?? 0),
      credits: Math.floor(Number(user.credits ?? 0)),
    },
  };
}

function normalizeReferralCode(raw: unknown) {
  if (typeof raw !== "string") return "";
  return raw.trim().toUpperCase();
}

function generateUniqueReferralCode() {
  const createCode = () => `BR${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
  for (let attempt = 0; attempt < 12; attempt++) {
    const candidate = createCode();
    const existing = db.prepare("SELECT id FROM users WHERE referralCode = ? LIMIT 1").get(candidate) as { id: string } | undefined;
    if (!existing) return candidate;
  }
  throw new Error("Could not generate referral code");
}

async function verifyGoogleCredential(credential: unknown) {
  if (!GOOGLE_CLIENT_ID) throw new Error("Google authentication is not configured");
  if (typeof credential !== "string" || !credential.trim()) throw new Error("Missing Google credential");
  const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
  if (!response.ok) throw new Error("Invalid Google credential");
  const tokenInfo = (await response.json()) as GoogleTokenInfo;
  if (tokenInfo.aud !== GOOGLE_CLIENT_ID) throw new Error("Google client mismatch");
  if (tokenInfo.email_verified !== "true") throw new Error("Google account email is not verified");
  return tokenInfo;
}

router.post("/register", async (req, res) => {
  const { name, email, password, phone, role, aadhaarNumber, idDocument, selfieImage, referralCode } = req.body;
  const missingFieldError = getMissingRegisterFieldError({ name, email, password });
  if (missingFieldError) return res.status(400).json({ error: missingFieldError });

  const normalizedRole = typeof role === "string" && ALLOWED_ROLES.has(role) ? role : "user";
  const emailValidationError = getEmailValidationError(email);
  if (emailValidationError) return res.status(400).json({ error: emailValidationError });

  const needsIdentity = roleNeedsIdentity(normalizedRole);
  const normalizedAadhaar = typeof aadhaarNumber === "string" ? aadhaarNumber.replace(/\s+/g, "") : "";
  const normalizedIdDoc = typeof idDocument === "string" ? idDocument : "";
  const normalizedSelfie = typeof selfieImage === "string" ? selfieImage : "";

  if (needsIdentity && !normalizedIdDoc) return res.status(400).json({ error: "Identity document is required for this account type" });
  if (needsIdentity && !AADHAAR_REGEX.test(normalizedAadhaar)) return res.status(400).json({ error: "Enter a valid 12-digit Aadhaar number" });

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const id = crypto.randomUUID();
    const normalizedEmail = email.trim().toLowerCase();
    const myReferralCode = generateUniqueReferralCode();

    const normalizedReferrerCode = normalizeReferralCode(referralCode);
    let referredById: string | null = null;
    if (normalizedReferrerCode) {
      const referrer = db.prepare("SELECT id FROM users WHERE referralCode = ? LIMIT 1").get(normalizedReferrerCode) as { id: string } | undefined;
      if (!referrer) return res.status(400).json({ error: "Invalid referral code" });
      referredById = referrer.id;
    }

    db.prepare(
      "INSERT INTO users (id, name, email, password, phone, role, aadhaarNumber, idDocument, selfieImage, isVerified, referralCode, referredById) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(id, name, normalizedEmail, hashedPassword, phone || "", normalizedRole, normalizedAadhaar || null, normalizedIdDoc || null, normalizedSelfie || null, 0, myReferralCode, referredById);

    res.json(buildAuthResponse({
      id, name, email: normalizedEmail, role: normalizedRole, subscriptionPlan: "free",
      isPremium: 0, phone: phone || "", aadhaarNumber: normalizedAadhaar || null,
      idDocument: normalizedIdDoc || null, selfieImage: normalizedSelfie || null,
      isVerified: 0, referralCode: myReferralCode, referredById,
      referralBalance: 0, referralEarnings: 0, credits: 0,
    }));
  } catch (err: any) {
    if (err.code === "SQLITE_CONSTRAINT_UNIQUE") return res.status(400).json({ error: "Email already exists" });
    console.error("[REGISTER ERROR]", err?.message || err);
    res.status(500).json({ error: err?.message || "Internal server error" });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (typeof email !== "string" || !email.trim()) return res.status(400).json({ error: "Email is required" });
  if (typeof password !== "string" || !password.trim()) return res.status(400).json({ error: "Password is required" });

  try {
    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email.trim().toLowerCase()) as any;
    if (!user) return res.status(400).json({ error: "Invalid credentials" });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: "Invalid credentials" });
    res.json(buildAuthResponse(user));
  } catch (_) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/google", async (req, res) => {
  const { credential, mode, name, email, phone, role, aadhaarNumber, idDocument, selfieImage, referralCode } = req.body;
  try {
    const googleUser = await verifyGoogleCredential(credential);
    const normalizedRole = typeof role === "string" && ALLOWED_ROLES.has(role) ? role : "user";
    const normalizedEmail = googleUser.email.trim().toLowerCase();
    const requestedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
    const needsIdentity = roleNeedsIdentity(normalizedRole);
    const normalizedAadhaar = typeof aadhaarNumber === "string" ? aadhaarNumber.replace(/\s+/g, "") : "";
    const normalizedIdDoc = typeof idDocument === "string" ? idDocument : "";
    const normalizedSelfie = typeof selfieImage === "string" ? selfieImage : "";

    if (requestedEmail && requestedEmail !== normalizedEmail) {
      return res.status(400).json({ error: "Use the same email as your Google account" });
    }

    let user = db.prepare("SELECT * FROM users WHERE googleId = ? OR email = ?").get(googleUser.sub, normalizedEmail) as any;

    if (mode === "login") {
      if (!user) return res.status(404).json({ error: "No account found for this Google email. Please sign up first." });
      if (!user.googleId) {
        db.prepare("UPDATE users SET googleId = ? WHERE id = ?").run(googleUser.sub, user.id);
        user = db.prepare("SELECT * FROM users WHERE id = ?").get(user.id) as any;
      }
      return res.json(buildAuthResponse(user));
    }

    if (needsIdentity && !normalizedIdDoc) return res.status(400).json({ error: "Identity document is required for this account type" });
    if (needsIdentity && !AADHAAR_REGEX.test(normalizedAadhaar)) return res.status(400).json({ error: "Enter a valid 12-digit Aadhaar number" });

    if (user) {
      if (!user.googleId) db.prepare("UPDATE users SET googleId = ? WHERE id = ?").run(googleUser.sub, user.id);
      db.prepare(`
        UPDATE users SET name=?, phone=?, role=?, aadhaarNumber=?, idDocument=?, selfieImage=?, isVerified=? WHERE id=?
      `).run(
        (typeof name === "string" && name.trim()) || googleUser.name || user.name,
        typeof phone === "string" ? phone : user.phone || "",
        normalizedRole,
        needsIdentity ? normalizedAadhaar : user.aadhaarNumber || null,
        needsIdentity ? normalizedIdDoc : user.idDocument || null,
        !needsIdentity ? normalizedSelfie : user.selfieImage || null,
        needsIdentity ? 0 : user.isVerified ?? 0,
        user.id
      );
      user = db.prepare("SELECT * FROM users WHERE id = ?").get(user.id) as any;
      return res.json(buildAuthResponse(user));
    }

    const generatedPassword = await bcrypt.hash(`${googleUser.sub}:${Date.now()}`, 10);
    const id = crypto.randomUUID();
    const myReferralCode = generateUniqueReferralCode();

    const normalizedReferrerCode = normalizeReferralCode(referralCode);
    let referredById: string | null = null;
    if (normalizedReferrerCode) {
      const referrer = db.prepare("SELECT id FROM users WHERE referralCode = ? LIMIT 1").get(normalizedReferrerCode) as { id: string } | undefined;
      if (!referrer) return res.status(400).json({ error: "Invalid referral code" });
      referredById = referrer.id;
    }

    db.prepare(`
      INSERT INTO users (id, name, email, password, phone, role, aadhaarNumber, idDocument, selfieImage, isVerified, googleId, referralCode, referredById)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, (typeof name === "string" && name.trim()) || googleUser.name || "Google User",
      normalizedEmail, generatedPassword,
      typeof phone === "string" ? phone : "",
      normalizedRole, normalizedAadhaar || null, normalizedIdDoc || null,
      normalizedSelfie || null, 0, googleUser.sub, myReferralCode, referredById
    );

    user = db.prepare("SELECT * FROM users WHERE id = ?").get(id) as any;
    return res.json(buildAuthResponse(user));
  } catch (err: any) {
    const message = err?.message || "";
    const knownErrors = new Set(["Google authentication is not configured", "Missing Google credential", "Invalid Google credential", "Google client mismatch", "Google account email is not verified"]);
    if (knownErrors.has(message)) return res.status(400).json({ error: message });
    console.error("[GOOGLE AUTH ERROR]", err?.message || err);
    return res.status(500).json({ error: message || "Google authentication failed" });
  }
});

router.get("/me", (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Unauthorized" });
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user = db.prepare(
      "SELECT id, name, email, phone, role, subscriptionPlan, isPremium, isVerified, idDocument, aadhaarNumber, selfieImage, referralCode, referredById, referralBalance, referralEarnings, credits FROM users WHERE id = ?"
    ).get(decoded.id) as any;
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({
      user: {
        ...user,
        credits: Math.floor(Number(user.credits ?? 0)),
        referralBalance: Number(user.referralBalance ?? 0),
        referralEarnings: Number(user.referralEarnings ?? 0),
        isPremium: Boolean(user.isPremium),
        isVerified: Boolean(user.isVerified),
      },
    });
  } catch (_) {
    res.status(401).json({ error: "Invalid token" });
  }
});

router.post("/upload-document", (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Unauthorized" });
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const { idDocument } = req.body;
    if (!idDocument) return res.status(400).json({ error: "Missing document" });
    db.prepare("UPDATE users SET idDocument = ?, isVerified = 0 WHERE id = ?").run(idDocument, decoded.id);
    res.json({ message: "Document uploaded successfully. Pending verification." });
  } catch (_) {
    res.status(401).json({ error: "Invalid token" });
  }
});

router.patch("/profile", authenticateToken, (req: any, res) => {
  const { name, phone } = req.body;
  try {
    db.prepare("UPDATE users SET name = ?, phone = ? WHERE id = ?").run(name, phone, req.user.id);
    res.json({ message: "Profile updated successfully" });
  } catch (_) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/password", authenticateToken, async (req: any, res) => {
  const { currentPassword, newPassword } = req.body;
  try {
    const user = db.prepare("SELECT password FROM users WHERE id = ?").get(req.user.id) as any;
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(400).json({ error: "Current password incorrect" });
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    db.prepare("UPDATE users SET password = ? WHERE id = ?").run(hashedPassword, req.user.id);
    res.json({ message: "Password updated successfully" });
  } catch (_) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
