import { SignJWT, jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.JWT_SECRET || "dev-secret-min-32-chars-long!!");

export type StaffPayload = {
  id: string;
  outletId: string;
  name: string;
  role: "admin" | "cashier" | "kitchen";
};

export async function signToken(payload: StaffPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("12h")
    .setIssuedAt()
    .sign(secret);
}

export async function verifyToken(token: string): Promise<StaffPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as StaffPayload;
  } catch {
    return null;
  }
}

export function requireRole(...roles: string[]) {
  return (staff: { role: string }) => {
    if (!roles.includes(staff.role)) throw new Error("Forbidden");
  };
}
