import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { db } from "../db/setup.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET ?? (() => { throw new Error('JWT_SECRET environment variable is required'); })();
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const AADHAAR_REGEX = /^\d{12}$/;
const DISPOSABLE_DOMAINS = new Set([
  "10minutemail.com",
  "temp-mail.org",
  "tempmail.com",
  "mailinator.com",
  "guerrillamail.com",
  "yopmail.com",
  "sharklasers.com",
  "throwawaymail.com",
  "trashmail.com",
  "getnada.com",
  "maildrop.cc",
  "dispostable.com",
  "fakeinbox.com",
  "tempr.email",
  "mintemail.com",
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
  if (typeof rawEmail !== "string") {
    return "Email is required";
  }

  const email = rawEmail.trim().toLowerCase();
  if (!EMAIL_REGEX.test(email)) {
    return "Enter a valid email address";
  }

  const [localPart, domain] = email.split("@");
  if (!localPart || !domain) {
    return "Enter a valid email address";
  }

  if (DISPOSABLE_DOMAINS.has(domain)) {
    return "Disposable email addresses are not allowed";
  }

  const suspiciousLocalPatterns = [
    /^test\d*$/,
    /^fake\d*$/,
    /^temp\d*$/,
    /^dummy\d*$/,
    /^asdf\d*$/,
    /^qwerty\d*$/,
    /^user\d{5,}$/,
    /^abc\d*$/,
  ];

  if (suspiciousLocalPatterns.some((pattern) => pattern.test(localPart))) {
    return "Use a real email address to sign up";
  }

  const repeatedCharPattern = /(.)\1{5,}/;
  if (repeatedCharPattern.test(localPart)) {
    return "Use a real email address to sign up";
  }

  return null;
}

function roleNeedsIdentity(role: unknown) {
  return typeof role === "string" && role !== "user";
}

function getMissingRegisterFieldError(input: { name?: unknown; email?: unknown; password?: unknown }) {
  if (typeof input.name !== "string" || !input.name.trim()) {
    return "Full name is required";
  }
  if (typeof input.email !== "string" || !input.email.trim()) {
    return "Email is required";
  }
  if (typeof input.password !== "string" || !input.password.trim()) {
    return "Password is required";
  }

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
      isPremium: user.isPremium,
      phone: user.phone,
      aadhaarNumber: user.aadhaarNumber,
      idDocument: user.idDocument,
      selfieImage: user.selfieImage,
      isVerified: user.isVerified,
    },
  };
}

async function verifyGoogleCredential(credential: unknown) {
  if (!GOOGLE_CLIENT_ID) {
    throw new Error("Google authentication is not configured");
  }
  if (typeof credential !== "string" || !credential.trim()) {
    throw new Error("Missing Google credential");
  }

  const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
  if (!response.ok) {
    throw new Error("Invalid Google credential");
  }

  const tokenInfo = (await response.json()) as GoogleTokenInfo;
  if (tokenInfo.aud !== GOOGLE_CLIENT_ID) {
    throw new Error("Google client mismatch");
  }
  if (tokenInfo.email_verified !== "true") {
    throw new Error("Google account email is not verified");
  }

  return tokenInfo;
}

router.post("/register", async (req, res) => {
  const { name, email, password, phone, role, aadhaarNumber, idDocument, selfieImage } = req.body;
  const missingFieldError = getMissingRegisterFieldError({ name, email, password });
  if (missingFieldError) {
    return res.status(400).json({ error: missingFieldError });
  }

  const normalizedRole = typeof role === "string" && ALLOWED_ROLES.has(role) ? role : "user";

  const emailValidationError = getEmailValidationError(email);
  if (emailValidationError) {
    return res.status(400).json({ error: emailValidationError });
  }

  const needsIdentity = roleNeedsIdentity(normalizedRole);
  const normalizedAadhaarNumber = typeof aadhaarNumber === "string" ? aadhaarNumber.replace(/\s+/g, "") : "";
  const normalizedIdDocument = typeof idDocument === "string" ? idDocument : "";
  const normalizedSelfieImage = typeof selfieImage === "string" ? selfieImage : "";

  if (needsIdentity && !normalizedIdDocument) {
    return res.status(400).json({ error: "Identity document is required for this account type" });
  }
  if (needsIdentity && !AADHAAR_REGEX.test(normalizedAadhaarNumber)) {
    return res.status(400).json({ error: "Enter a valid 12-digit Aadhaar number" });
  }


  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const id = crypto.randomUUID();
    const normalizedEmail = email.trim().toLowerCase();
    
    const stmt = db.prepare(
      "INSERT INTO users (id, name, email, password, phone, role, aadhaarNumber, idDocument, selfieImage, isVerified) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );
    stmt.run(
      id,
      name,
      normalizedEmail,
      hashedPassword,
      phone || "",
      normalizedRole,
      normalizedAadhaarNumber || null,
      normalizedIdDocument || null,
      normalizedSelfieImage || null,
      0
    );
    
    res.json(
      buildAuthResponse({
        id,
        name,
        email: normalizedEmail,
        role: normalizedRole,
        subscriptionPlan: "free",
        isPremium: 0,
        phone: phone || "",
        aadhaarNumber: normalizedAadhaarNumber || null,
        idDocument: normalizedIdDocument || null,
        selfieImage: normalizedSelfieImage || null,
        isVerified: 0,
      })
    );
  } catch (err: any) {
    if (err.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res.status(400).json({ error: "Email already exists" });
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (typeof email !== "string" || !email.trim()) {
    return res.status(400).json({ error: "Email is required" });
  }
  if (typeof password !== "string" || !password.trim()) {
    return res.status(400).json({ error: "Password is required" });
  }

  try {
    const normalizedEmail = email.trim().toLowerCase();
    const stmt = db.prepare("SELECT * FROM users WHERE email = ?");
    const user = stmt.get(normalizedEmail) as any;

    if (!user) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    res.json(buildAuthResponse(user));
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/google", async (req, res) => {
  const { credential, mode, name, email, phone, role, aadhaarNumber, idDocument, selfieImage } = req.body;

  try {
    const googleUser = await verifyGoogleCredential(credential);
    const normalizedRole = typeof role === "string" && ALLOWED_ROLES.has(role) ? role : "user";
    const normalizedEmail = googleUser.email.trim().toLowerCase();
    const requestedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
    const needsIdentity = roleNeedsIdentity(normalizedRole);
    const normalizedAadhaarNumber = typeof aadhaarNumber === "string" ? aadhaarNumber.replace(/\s+/g, "") : "";
    const normalizedIdDocument = typeof idDocument === "string" ? idDocument : "";
    const normalizedSelfieImage = typeof selfieImage === "string" ? selfieImage : "";

    if (requestedEmail && requestedEmail !== normalizedEmail) {
      return res.status(400).json({ error: "Use the same email as your Google account" });
    }

    let user = db.prepare("SELECT * FROM users WHERE googleId = ? OR email = ?").get(googleUser.sub, normalizedEmail) as any;

    if (mode === "login") {
      if (!user) {
        return res.status(404).json({ error: "No account found for this Google email. Please sign up first." });
      }

      if (!user.googleId) {
        db.prepare("UPDATE users SET googleId = ? WHERE id = ?").run(googleUser.sub, user.id);
        user = db.prepare("SELECT * FROM users WHERE id = ?").get(user.id) as any;
      }

      return res.json(buildAuthResponse(user));
    }

    if (needsIdentity && !normalizedIdDocument) {
      return res.status(400).json({ error: "Identity document is required for this account type" });
    }
    if (needsIdentity && !AADHAAR_REGEX.test(normalizedAadhaarNumber)) {
      return res.status(400).json({ error: "Enter a valid 12-digit Aadhaar number" });
    }


    if (user) {
      if (!user.googleId) {
        db.prepare("UPDATE users SET googleId = ? WHERE id = ?").run(googleUser.sub, user.id);
      }

      db.prepare(
        `
          UPDATE users
          SET
            name = ?,
            phone = ?,
            role = ?,
            aadhaarNumber = ?,
            idDocument = ?,
            selfieImage = ?,
            isVerified = ?
          WHERE id = ?
        `
      ).run(
        (typeof name === "string" && name.trim()) || googleUser.name || user.name,
        typeof phone === "string" ? phone : user.phone || "",
        normalizedRole,
        needsIdentity ? normalizedAadhaarNumber : user.aadhaarNumber || null,
        needsIdentity ? normalizedIdDocument : user.idDocument || null,
        !needsIdentity ? normalizedSelfieImage : user.selfieImage || null,
        needsIdentity ? 0 : user.isVerified ?? 0,
        user.id
      );
      user = db.prepare("SELECT * FROM users WHERE id = ?").get(user.id) as any;
      return res.json(buildAuthResponse(user));
    }

    const generatedPassword = await bcrypt.hash(`${googleUser.sub}:${Date.now()}`, 10);
    const id = crypto.randomUUID();

    db.prepare(
      `
        INSERT INTO users (id, name, email, password, phone, role, aadhaarNumber, idDocument, selfieImage, isVerified, googleId)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
    ).run(
      id,
      (typeof name === "string" && name.trim()) || googleUser.name || "Google User",
      normalizedEmail,
      generatedPassword,
      typeof phone === "string" ? phone : "",
      normalizedRole,
      normalizedAadhaarNumber || null,
      normalizedIdDocument || null,
      normalizedSelfieImage || null,
      0,
      googleUser.sub
    );

    user = db.prepare("SELECT * FROM users WHERE id = ?").get(id) as any;
    return res.json(buildAuthResponse(user));
  } catch (err: any) {
    const message = err?.message || "Google authentication failed";
    if (
      message === "Google authentication is not configured" ||
      message === "Missing Google credential" ||
      message === "Invalid Google credential" ||
      message === "Google client mismatch" ||
      message === "Google account email is not verified"
    ) {
      return res.status(400).json({ error: message });
    }
    return res.status(500).json({ error: "Google authentication failed" });
  }
});

router.get("/me", (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Unauthorized" });

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const stmt = db.prepare(
      "SELECT id, name, email, phone, role, subscriptionPlan, isPremium, isVerified, idDocument, aadhaarNumber, selfieImage FROM users WHERE id = ?"
    );
    const user = stmt.get(decoded.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ user });
  } catch (err) {
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
    
    if (!idDocument) {
      return res.status(400).json({ error: "Missing document" });
    }

    const stmt = db.prepare("UPDATE users SET idDocument = ?, isVerified = 0 WHERE id = ?");
    stmt.run(idDocument, decoded.id);
    
    res.json({ message: "Document uploaded successfully. Pending verification." });
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
});

router.patch("/profile", authenticateToken, (req: any, res) => {
  const { name, phone } = req.body;
  const userId = req.user.id;

  try {
    const stmt = db.prepare("UPDATE users SET name = ?, phone = ? WHERE id = ?");
    stmt.run(name, phone, userId);
    res.json({ message: "Profile updated successfully" });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/password", authenticateToken, async (req: any, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id;

  try {
    const user = db.prepare("SELECT password FROM users WHERE id = ?").get(userId) as any;
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Current password incorrect" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    db.prepare("UPDATE users SET password = ? WHERE id = ?").run(hashedPassword, userId);
    res.json({ message: "Password updated successfully" });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
