import { prisma } from "@/lib/db";
import { snap } from "@/lib/midtrans";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { orderId, callbackUrl } = await req.json();

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const transaction = await snap.createTransaction({
      transaction_details: {
        order_id: `ORDER-${order.orderNumber}-${Date.now()}`,
        gross_amount: order.total,
      },
      customer_details: {
        first_name: order.customerName || "Customer",
      },
      callbacks: {
        finish: callbackUrl || `${appUrl}/order/${order.outletId}/${order.tableId || ""}`,
      },
    });

    await prisma.order.update({
      where: { id: order.id },
      data: { midtransToken: transaction.token, midtransId: transaction.transaction_id },
    });

    return NextResponse.json({
      snapToken: transaction.token,
      redirectUrl: transaction.redirect_url,
    });
  } catch (error) {
    console.error("Midtrans error:", error);
    return NextResponse.json({ error: "Payment creation failed. Using sandbox?" }, { status: 500 });
  }
}
