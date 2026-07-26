import { orderEvents } from "@/lib/sse";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const outletId = searchParams.get("outletId");

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(`data: {"type":"connected"}\n\n`);

      const onOrder = (order: Record<string, unknown>) => {
        if (!outletId || order.outletId === outletId) {
          controller.enqueue(`data: ${JSON.stringify(order)}\n\n`);
        }
      };

      orderEvents.on("order:created", onOrder);
      orderEvents.on("order:updated", onOrder);

      req.signal.addEventListener("abort", () => {
        orderEvents.off("order:created", onOrder);
        orderEvents.off("order:updated", onOrder);
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
