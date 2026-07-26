import { prisma } from "@/lib/db";
import { signToken, verifyPassword } from "@/lib/auth";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    const { name, password } = await req.json();

    const staff = await prisma.staff.findFirst({
      where: { name, active: true },
    });

    if (!staff) {
      return NextResponse.json({ error: "Nama atau password salah" }, { status: 401 });
    }

    const valid = await verifyPassword(password, staff.password);
    if (!valid) {
      return NextResponse.json({ error: "Nama atau password salah" }, { status: 401 });
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
      maxAge: 60 * 60 * 12,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}
