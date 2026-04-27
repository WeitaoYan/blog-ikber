import { SignJWT, jwtVerify } from "jose";
import { JWT_EXPIRES_IN, COOKIE_NAME } from "./constants";

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is not set");
  }
  return new TextEncoder().encode(secret);
};

export async function signToken(): Promise<string> {
  const secret = getJwtSecret();
  const token = await new SignJWT({ sub: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRES_IN)
    .sign(secret);
  return token;
}

export async function verifyToken(token: string): Promise<boolean> {
  try {
    const secret = getJwtSecret();
    await jwtVerify(token, secret);
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
