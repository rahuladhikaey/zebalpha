export async function GET() {
  return new Response(
    JSON.stringify({ status: "ok", service: "customer", timestamp: new Date() }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
}
