// scripts/sync-sellbrite-images.mjs
import axios from "axios";
import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const SELLBRITE_KEY = process.env.SELLBRITE_API_KEY;
const SELLBRITE_SECRET = process.env.SELLBRITE_API_SECRET;
const PAGE_SIZE = 100;

let updatedTotal = 0;

console.log("🔄 Starting Sellbrite → Supabase image sync...");

for (let page = 1; page < 999; page++) {
  console.log(`📦 Fetching page ${page} from Sellbrite...`);

  let products = [];
  try {
    const response = await axios.get("https://api.sellbrite.com/v1/products", {
      params: { page, limit: PAGE_SIZE },
      auth: {
        username: SELLBRITE_KEY,
        password: SELLBRITE_SECRET,
      },
    });

    if (!Array.isArray(response.data)) {
      console.error("❌ Sellbrite returned unexpected format:", response.data);
      break;
    }

    products = response.data;
    if (products.length === 0) break;
  } catch (err) {
    console.error(`❌ Error fetching page ${page}:`, err.message);
    break;
  }

  const updates = [];

  for (const product of products) {
    const sku = product.sku?.trim();
    if (!sku) continue;

    let imageUrl = product.primary_image_url?.trim();

    // Fallback to image_list first image
    if (!imageUrl && product.image_list?.includes("http")) {
      imageUrl = product.image_list.split("|")[0]?.trim();
    }

    if (!imageUrl) {
      console.warn(`⚠️ No image for SKU ${sku}`);
      continue;
    }

    updates.push({ sku, image_url: imageUrl });
    console.log(`✅ Found image for SKU ${sku}`);
  }

  if (updates.length > 0) {
    try {
      const { error } = await supabase.from("items").upsert(updates, {
        onConflict: "sku",
      });

      if (error) {
        console.error(`❌ Failed to update Supabase on page ${page}:`, error.message);
        break;
      }

      console.log(`🛠 Updated ${updates.length} SKUs on page ${page}`);
      updatedTotal += updates.length;
    } catch (err) {
      console.error(`❌ Supabase error on page ${page}:`, err.message);
      break;
    }
  } else {
    console.log(`⚠️ No updates on page ${page}`);
  }
}

console.log(`🎉 Sync complete — ${updatedTotal} items updated with image URLs.`);
