import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables.");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const PAGE_SIZE = 100;
let page = 1;
let totalUpdated = 0;

console.log("🚀 Starting image sync...");

while (true) {
  console.log(`📄 Fetching page ${page}`);

  const { data: items, error } = await supabase
    .from("items")
    .select("sku")
    .is("image_url", null)
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  if (error) {
    console.error("❌ Supabase fetch error:", error.message);
    process.exit(1);
  }

  if (!items.length) {
    console.log("✅ No more items needing image URLs.");
    break;
  }

  for (const item of items) {
    try {
      const res = await axios.get(`https://api.sellbrite.com/v1/products/${item.sku}`, {
        auth: {
          username: process.env.SELLBRITE_API_KEY,
          password: process.env.SELLBRITE_API_SECRET,
        },
      });

      const product = res.data;
      const imageUrl = product.image_url || null;

      if (imageUrl) {
        const { error: updateError } = await supabase
          .from("items")
          .update({ image_url: imageUrl })
          .eq("sku", item.sku);

        if (updateError) {
          console.error(`❌ Failed to update image for ${item.sku}:`, updateError.message);
        } else {
          console.log(`✅ Updated ${item.sku}`);
          totalUpdated++;
        }
      }
    } catch (err) {
      console.error(`❌ Error fetching Sellbrite product for ${item.sku}:`, err.response?.data || err.message);
    }
  }

  page++;
}

console.log(`🎉 Finished syncing images. Total updated: ${totalUpdated}`);
