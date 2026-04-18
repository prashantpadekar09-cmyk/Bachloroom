import jwt from "jsonwebtoken";
import { db } from "../db/setup.js";

export const JWT_SECRET =
  process.env.JWT_SECRET ?? (() => {
    throw new Error("JWT_SECRET environment variable is required");
  })();

export const verifyToken = (token: string) => jwt.verify(token, JWT_SECRET);

export const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Unauthorized" });

  const token = authHeader.split(" ")[1];
  try {
    const decoded = verifyToken(token) as any;
    const currentUser = db
      .prepare("SELECT id, role, email, name FROM users WHERE id = ?")
      .get(decoded.id) as { id: string; role: string; email: string; name: string } | undefined;

    if (!currentUser) {
      return res.status(401).json({ error: "Invalid token" });
    }

    req.user = {
      ...decoded,
      id: currentUser.id,
      role: currentUser.role,
      email: currentUser.email,
      name: currentUser.name,
    };
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
};
