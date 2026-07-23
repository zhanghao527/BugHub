import "server-only";
import { scryptSync, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  ADMIN_SESSION_COOKIE,
  adminSessionCookieOptions,
  createAdminSessionToken,
  type AdminSession,
  verifyAdminSessionToken,
} from "@/lib/admin-session";
import { adminHref, currentAdminCleanPath } from "@/lib/admin-routing";

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_FAILURES = 5;
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

type AdminConfig = {
  username: string;
  passwordHash: string;
  sessionSecret: string;
};

export type AdminConfigurationStatus = {
  configured: boolean;
  missing: string[];
};

export type AdminLoginResult =
  | { ok: true }
  | { ok: false; reason: "invalid" | "rate-limited" | "not-configured" };

declare global {
  // eslint-disable-next-line no-var
  var __bughubAdminLoginFailures: Map<string, number[]> | undefined;
  // eslint-disable-next-line no-var
  var __bughubAdminLoginCleanupAt: number | undefined;
}

function loginFailures(): Map<string, number[]> {
  if (!globalThis.__bughubAdminLoginFailures) globalThis.__bughubAdminLoginFailures = new Map();
  return globalThis.__bughubAdminLoginFailures;
}

function decodePasswordHash(value: string): { salt: Buffer; key: Buffer } | null {
  const parts = value.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return null;
  if (!/^[A-Za-z0-9_-]+$/.test(parts[1]) || !/^[A-Za-z0-9_-]+$/.test(parts[2])) return null;
  try {
    const salt = Buffer.from(parts[1], "base64url");
    const key = Buffer.from(parts[2], "base64url");
    return salt.length >= 16 && key.length === 64 ? { salt, key } : null;
  } catch {
    return null;
  }
}

function loadAdminConfig(): AdminConfig | null {
  const username = process.env.ADMIN_USERNAME?.trim() || "";
  const passwordHash = process.env.ADMIN_PASSWORD_HASH?.trim() || "";
  const sessionSecret = process.env.ADMIN_SESSION_SECRET || "";
  if (!username || !decodePasswordHash(passwordHash) || sessionSecret.length < 32) return null;
  return { username, passwordHash, sessionSecret };
}

export function getAdminConfigurationStatus(): AdminConfigurationStatus {
  const missing: string[] = [];
  if (!process.env.ADMIN_USERNAME?.trim()) missing.push("ADMIN_USERNAME");
  if (!decodePasswordHash(process.env.ADMIN_PASSWORD_HASH?.trim() || "")) missing.push("ADMIN_PASSWORD_HASH");
  if ((process.env.ADMIN_SESSION_SECRET || "").length < 32) missing.push("ADMIN_SESSION_SECRET");
  return { configured: missing.length === 0, missing };
}

function clearExpiredFailures(now: number): void {
  if ((globalThis.__bughubAdminLoginCleanupAt || 0) > now) return;
  loginFailures().forEach((attempts, ip) => {
    const recent = attempts.filter((timestamp) => now - timestamp < LOGIN_WINDOW_MS);
    if (recent.length > 0) loginFailures().set(ip, recent);
    else loginFailures().delete(ip);
  });
  globalThis.__bughubAdminLoginCleanupAt = now + CLEANUP_INTERVAL_MS;
}

function recentFailures(ip: string, now: number): number[] {
  clearExpiredFailures(now);
  const recent = (loginFailures().get(ip) || []).filter((timestamp) => now - timestamp < LOGIN_WINDOW_MS);
  if (recent.length > 0) loginFailures().set(ip, recent);
  else loginFailures().delete(ip);
  return recent;
}

function passwordMatches(password: string, encodedHash: string): boolean {
  const parsed = decodePasswordHash(encodedHash);
  if (!parsed || password.length > 1024) return false;
  try {
    const candidate = scryptSync(password, parsed.salt, 64);
    return timingSafeEqual(candidate, parsed.key);
  } catch {
    return false;
  }
}

export function getClientIp(): string {
  const requestHeaders = headers();
  const forwarded = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || requestHeaders.get("x-real-ip")?.trim() || "unknown";
}

export async function loginAdmin(username: string, password: string, ip: string): Promise<AdminLoginResult> {
  const config = loadAdminConfig();
  if (!config) return { ok: false, reason: "not-configured" };
  const now = Date.now();
  if (recentFailures(ip, now).length >= LOGIN_MAX_FAILURES) return { ok: false, reason: "rate-limited" };

  const validPassword = passwordMatches(password, config.passwordHash);
  const validUsername = username === config.username;
  if (!validUsername || !validPassword) {
    loginFailures().set(ip, [...recentFailures(ip, now), now]);
    return { ok: false, reason: "invalid" };
  }

  loginFailures().delete(ip);
  const token = await createAdminSessionToken(config.username, config.sessionSecret);
  cookies().set(ADMIN_SESSION_COOKIE, token, adminSessionCookieOptions());
  return { ok: true };
}

export function logoutAdmin(): void {
  cookies().set(ADMIN_SESSION_COOKIE, "", { ...adminSessionCookieOptions(), maxAge: 0 });
}

export async function optionalAdminSession(): Promise<AdminSession | null> {
  const config = loadAdminConfig();
  if (!config) return null;
  const token = cookies().get(ADMIN_SESSION_COOKIE)?.value;
  const session = await verifyAdminSessionToken(token, config.sessionSecret);
  return session?.username === config.username ? session : null;
}

export async function requireAdmin(): Promise<AdminSession> {
  const session = await optionalAdminSession();
  if (session) return session;
  const next = encodeURIComponent(currentAdminCleanPath());
  redirect(adminHref(`/login?next=${next}`));
}
