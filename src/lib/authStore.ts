import fs from "fs";
import path from "path";
import crypto from "crypto";
import { cookies } from "next/headers";

export const SESSION_COOKIE_NAME = "trend_intel_session";
const SECRET_KEY = process.env.AUTH_SECRET || "trend-intel-secret-key-2026-secure-hmac";

export interface AppUser {
  id: string;
  username: string;
  email: string;
  name: string;
  role: "admin" | "user";
  passwordHash: string;
  createdAt: string;
  googleId?: string;
  googlePicture?: string;
}

export interface SessionUser {
  id: string;
  username: string;
  email: string;
  name: string;
  role: "admin" | "user";
}

function hashPassword(password: string, salt?: string): string {
  const s = salt || crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, s, 64).toString("hex");
  return `${s}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, originalHash] = (stored || "").split(":");
  if (!salt || !originalHash) return false;
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(originalHash, "hex"));
}

export function createSessionToken(user: SessionUser, expiresInDays = 7): string {
  const payload = {
    ...user,
    exp: Date.now() + expiresInDays * 24 * 60 * 60 * 1000,
  };
  const base64Payload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", SECRET_KEY)
    .update(base64Payload)
    .digest("base64url");
  return `${base64Payload}.${signature}`;
}

export function verifySessionToken(token?: string | null): SessionUser | null {
  if (!token || !token.includes(".")) return null;
  try {
    const [base64Payload, signature] = token.split(".");
    const expectedSig = crypto
      .createHmac("sha256", SECRET_KEY)
      .update(base64Payload)
      .digest("base64url");

    if (signature !== expectedSig) return null;

    const payload = JSON.parse(Buffer.from(base64Payload, "base64url").toString("utf8"));
    if (!payload.exp || Date.now() > payload.exp) return null;

    return {
      id: payload.id,
      username: payload.username,
      email: payload.email,
      name: payload.name,
      role: payload.role || "user",
    };
  } catch {
    return null;
  }
}

export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    return verifySessionToken(token);
  } catch {
    return null;
  }
}

class AuthStore {
  private filePath: string;

  constructor() {
    const dataDir = path.join(process.cwd(), "data");
    if (!fs.existsSync(dataDir)) {
      try {
        fs.mkdirSync(dataDir, { recursive: true });
      } catch (e) {}
    }
    this.filePath = path.join(dataDir, "users.json");
    this.ensureDefaultUsers();
  }

  private ensureDefaultUsers() {
    try {
      if (!fs.existsSync(this.filePath)) {
        fs.writeFileSync(this.filePath, JSON.stringify([], null, 2), "utf8");
      }
    } catch (err) {
      console.error("Gagal inisialisasi users.json:", err);
    }
  }

  public readAll(): AppUser[] {
    try {
      this.ensureDefaultUsers();
      const raw = fs.readFileSync(this.filePath, "utf8");
      return JSON.parse(raw || "[]");
    } catch {
      return [];
    }
  }

  public writeAll(users: AppUser[]) {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(users, null, 2), "utf8");
    } catch (err) {
      console.error("Gagal menyimpan users.json:", err);
    }
  }

  authenticate(identifier: string, password: string): SessionUser | null {
    const cleanId = identifier.trim().toLowerCase();
    const users = this.readAll();
    const user = users.find(
      (u) => u.username.toLowerCase() === cleanId || u.email.toLowerCase() === cleanId
    );
    if (!user) return null;
    if (!verifyPassword(password, user.passwordHash)) return null;

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  }

  register(data: { name: string; username: string; email: string; password: string }): SessionUser | { error: string } {
    const users = this.readAll();
    const cleanUser = data.username.trim().toLowerCase();
    const cleanEmail = data.email.trim().toLowerCase();

    if (!cleanUser || cleanUser.length < 3) {
      return { error: "Username minimal 3 karakter." };
    }
    if (!cleanEmail || !cleanEmail.includes("@")) {
      return { error: "Format email tidak valid." };
    }
    if (!data.password || data.password.length < 6) {
      return { error: "Password minimal 6 karakter." };
    }

    if (users.some((u) => u.username.toLowerCase() === cleanUser)) {
      return { error: "Username sudah terdaftar." };
    }
    if (users.some((u) => u.email.toLowerCase() === cleanEmail)) {
      return { error: "Email sudah terdaftar." };
    }

    const newUser: AppUser = {
      id: crypto.randomUUID(),
      username: data.username.trim(),
      email: cleanEmail,
      name: data.name.trim() || data.username.trim(),
      role: users.length === 0 ? "admin" : "user",
      passwordHash: hashPassword(data.password),
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    this.writeAll(users);

    return {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
    };
  }
}

export const authStore = new AuthStore();

