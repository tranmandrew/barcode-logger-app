import axios from "axios";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const apiKey = process.env.SELLBRITE_API_KEY;
const apiSecret = process.env.SELLBRITE_API_SECRET;

const BASE_URL = "https://api.sellbrite.com/v1/";
const PAGE_LIMIT = 100;

const fetchSellbriteProducts = async (page) => {
  const res = await axios.get(`${BASE_URL}products`, {
    headers: {
      Authorization: `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    params: {
      limit: PAGE_LIMIT,
      page,
    },
  });
  return res.data;
};

const runSync = async () => {
  console.log("\u{1F504} Starting Sellbrite \u2192 Supabase image sync...");

  let page = 1;
  let totalUpdated = 0;

  while (true) {
    console.log(`\u{1F4E6} Fetching page ${page} from Sellbrite...`);

    try {
      const products = await fetchSellbriteProducts(page);

      if (!Array.isArray(products) || products.length === 0) break;

      const updates = products
        .filter((p) => p.sku && p.main_image_url)
        .map((p) => ({ sku: p.sku, image_url: p.main_image_url }));

      if (updates.length > 0) {
        const { error } = await supabase.from("items").upsert(updates, {
          onConflict: ["sku"],
        });
        if (error) {
          console.error("❌ Supabase upsert error:", error.message);
          break;
        }
      }

      console.log(`🛠 Updating ${updates.length} items from page ${page}...`);
      console.log(`✅ Page ${page} processed.`);
      totalUpdated += updates.length;
      page++;
    } catch (err) {
      console.error("❌ Sync failed:", err.response?.data || err.message);
      break;
    }
  }

  console.log(`\u{1F389} Sync complete — ${totalUpdated} items updated with image URLs.`);
};

runSync();
