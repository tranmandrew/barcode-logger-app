import axios from "axios";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

const sellbrite = axios.create({
  baseURL: "https://app.sellbrite.com/api",
  auth: {
    username: process.env.SELLBRITE_API_KEY!,
    password: process.env.SELLBRITE_API_SECRET!,
  },
});

async function syncImageURLs() {
  let page = 1;
  let totalUpdated = 0;

  while (true) {
    const { data: products } = await sellbrite.get("/products", {
      params: { page },
    });

    if (!products.length) break;

    for (const product of products) {
      const { sku, main_image_url } = product;
      if (!sku || !main_image_url) continue;

      const { data, error } = await supabase
        .from("items")
        .update({ image_url: main_image_url })
        .eq("sku", sku)
        .is("image_url", null);

      if (error) {
        console.error(`Error updating ${sku}:`, error.message);
      } else if (data.length > 0) {
        totalUpdated++;
        console.log(`Updated ${sku}`);
      }
    }

    page++;
  }

  console.log(`✅ Sync complete. Total items updated: ${totalUpdated}`);
}

syncImageURLs().catch(console.error);
