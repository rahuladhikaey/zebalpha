import { createClient } from "@supabase/supabase-js";

const VERIFIED_URL = "https://qjpahzstldiatfbutvfc.supabase.co";
const VERIFIED_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqcGFoenN0bGRpYXRmYnV0dmZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODU1MzQwNiwiZXhwIjoyMTA0MTI5NDA2fQ.cxVZ_pEUu3pKXAyO5RRjLhp4Zusjd8RctWpZkL3rVWs";

const supabase = createClient(VERIFIED_URL, VERIFIED_SERVICE_KEY);

async function wipeProductsAndOrders() {
  console.log("🚀 Starting clean purge of all products, shipments, and orders...");

  const tables = [
    "shipping_events",
    "shipments",
    "order_items",
    "seller_orders",
    "payments",
    "orders",
    "cart",
    "wishlist",
    "stock_history",
    "reviews",
    "products"
  ];

  for (const table of tables) {
    try {
      const { error } = await supabase.from(table).delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (error) {
        console.warn(`Notice deleting from ${table}:`, error.message);
      } else {
        console.log(`✓ Cleaned ${table}`);
      }
    } catch (e) {
      console.warn(`Skipped ${table}:`, e.message);
    }
  }

  console.log("🎉 All products, shipments, and orders successfully deleted!");
}

wipeProductsAndOrders();
