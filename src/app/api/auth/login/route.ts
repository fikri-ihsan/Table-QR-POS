import { prisma } from "@/lib/db";
import { signToken } from "@/lib/auth";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

// ponytail: PINs stored as plain text in dev. Hash with bcrypt before production.
export async function POST(req: Request) {
  try {
    const { name, pin } = await req.json();

    const staff = await prisma.staff.findFirst({
      where: { name, pin, active: true },
    });

    if (!staff) {
      return NextResponse.json({ error: "Nama atau PIN salah" }, { status: 401 });
    }

    const token = await signToken({
      id: staff.id,
      outletId: staff.outletId,
      name: staff.name,
      role: staff.role as "admin" | "cashier" | "kitchen",
    });

    const cookieStore = await cookies();
    cookieStore.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 12, // 12h
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}
