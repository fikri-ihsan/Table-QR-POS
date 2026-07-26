import { prisma } from "@/lib/db";
import { core } from "@/lib/midtrans";
import { NextResponse } from "next/server";
import { orderEvents } from "@/lib/sse";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // verify signature
    const isValid = core.verifyNotification(body);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    }

    const orderId = body.order_id;
    const transactionStatus = body.transaction_status;

    // find our order by midtransId or order_id
    const order = await prisma.order.findFirst({
      where: { midtransId: orderId },
    });

    if (!order) {
      // try to find by midtransToken
      const orderByToken = await prisma.order.findFirst({
        where: { midtransToken: orderId },
      });
      if (!orderByToken) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
      }

      const paymentStatus = transactionStatus === "settlement" || transactionStatus === "capture"
        ? "paid"
        : transactionStatus === "deny" || transactionStatus === "cancel" || transactionStatus === "expire"
          ? "failed"
          : "pending";

      await prisma.order.update({
        where: { id: orderByToken.id },
        data: { paymentStatus, midtransId: orderId },
      });

      if (paymentStatus === "paid") {
        orderEvents.emit("order:updated", { ...orderByToken, paymentStatus: "paid" });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Webhook failed" }, { status: 500 });
  }
}
