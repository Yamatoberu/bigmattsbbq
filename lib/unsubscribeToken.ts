import { SignJWT, jwtVerify } from "jose";

const TOKEN_EXPIRY = "30d";
const ALG = "HS256";

function getSecret(): Uint8Array {
  const secret = process.env.UNSUBSCRIBE_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "Missing or too-short UNSUBSCRIBE_SECRET. Set it in .env.local (min 32 chars). Do NOT reuse BROADCAST_SECRET."
    );
  }
  return new TextEncoder().encode(secret);
}

export async function signUnsubscribeToken(email: string): Promise<string> {
  if (!email) {
    throw new Error("Cannot sign unsubscribe token without an email.");
  }
  return new SignJWT({ email })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(getSecret());
}

export async function verifyUnsubscribeToken(token: string): Promise<string> {
  const { payload } = await jwtVerify(token, getSecret(), { algorithms: [ALG] });
  const email = payload.email;
  if (typeof email !== "string" || email.length === 0) {
    throw new Error("Invalid token payload: missing email.");
  }
  return email;
}
