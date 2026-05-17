import { SignJWT, jwtVerify } from "jose";
import { JWT_EXPIRES_IN, COOKIE_NAME } from "./constants";

// Flag to track if JWT is configured
let jwtConfigured = false;
let jwtSecret: Uint8Array | null = null;

function initJwtConfig() {
  if (jwtConfigured) return;

  const secret = process.env.JWT_SECRET;
  if (secret) {
    jwtSecret = new TextEncoder().encode(secret);
    jwtConfigured = true;
  } else {
    // Log warning but don't crash - auth will simply fail
    console.warn("JWT_SECRET not configured. Authentication will be unavailable.");
    jwtConfigured = true; // Mark as initialized to prevent repeated warnings
  }
}

initJwtConfig();

export async function signToken(): Promise<string> {
  if (!jwtSecret) {
    throw new Error("JWT authentication is not configured on the server");
  }
  const token = await new SignJWT({ sub: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRES_IN)
    .sign(jwtSecret);
  return token;
}

export async function verifyToken(token: string): Promise<boolean> {
  if (!jwtSecret) {
    return false;
  }
  try {
    await jwtVerify(token, jwtSecret);
    return true;
  } catch {
    return false;
  }
}

export function getTokenFromRequest(request: Request): string | null {
  // Try cookie first
  const cookieHeader = request.headers.get("cookie");
  if (cookieHeader) {
    const cookies = cookieHeader.split(";").map((c) => c.trim());
    for (const cookie of cookies) {
      const [name, value] = cookie.split("=");
      if (name === COOKIE_NAME && value) {
        return decodeURIComponent(value);
      }
    }
  }

  // Try Authorization header
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  return null;
}

export async function requireAuth(request: Request): Promise<boolean> {
  const token = getTokenFromRequest(request);
  if (!token) return false;
  return verifyToken(token);
}
