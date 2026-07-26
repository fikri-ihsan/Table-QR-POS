import { prisma } from "@/lib/db";
import { core } from "@/lib/midtrans";
import { NextResponse } from "next/server";
import { orderEvents } from "@/lib/sse";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const isValid = core.verifyNotification(body);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    }

    const midtransOrderId = body.order_id;
    const transactionStatus = body.transaction_status;

    let order = await prisma.order.findFirst({
      where: { midtransId: midtransOrderId },
    });

    if (!order) {
      const match = midtransOrderId.match(/ORDER-(\d+)-/);
      if (match) {
        const orderNumber = parseInt(match[1]);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        order = await prisma.order.findFirst({
          where: { orderNumber, createdAt: { gte: today } },
        });
      }
    }

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const paymentStatus = transactionStatus === "settlement" || transactionStatus === "capture"
      ? "paid"
      : transactionStatus === "deny" || transactionStatus === "cancel" || transactionStatus === "expire"
        ? "failed"
        : "pending";

    await prisma.order.update({
      where: { id: order.id },
      data: { paymentStatus, midtransId: midtransOrderId },
    });

    if (paymentStatus === "paid") {
      orderEvents.emit("order:updated", { ...order, paymentStatus: "paid" });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Webhook failed" }, { status: 500 });
  }
}
