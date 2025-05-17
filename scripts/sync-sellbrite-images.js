const axios = require("axios");
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const sellbrite = axios.create({
  baseURL: "https://app.sellbrite.com/api",
  auth: {
    username: process.env.SELLBRITE_API_KEY,
    password: process.env.SELLBRITE_API_SECRET,
  },
});

const BATCH_SIZE = 100;

async function syncImageURLs() {
  console.log("🔄 Starting Sellbrite → Supabase image sync...");
  let page = 1;
  let totalUpdated = 0;

  while (true) {
    console.log(`📦 Fetching page ${page} from Sellbrite...`);
    const { data: products } = await sellbrite.get("/products", {
      params: { page },
    });

    if (!products.length) break;

    const formattedItems = products
      .filter((p) => p.sku && p.main_image_url)
      .map((p) => ({
        sku: p.sku,
        image_url: p.main_image_url,
      }));

    console.log(`🛠 Updating ${formattedItems.length} items from page ${page}...`);

    const updatePromises = formattedItems.map(async ({ sku, image_url }) => {
      const { error } = await supabase
        .from("items")
        .update({ image_url })
        .eq("sku", sku)
        .is("image_url", null);
      if (!error) totalUpdated++;
    });

    for (let i = 0; i < updatePromises.length; i += BATCH_SIZE) {
      await Promise.allSettled(updatePromises.slice(i, i + BATCH_SIZE));
    }

    console.log(`✅ Page ${page} processed.`);
    page++;
  }

  console.log(`🎉 Sync complete — ${totalUpdated} items updated with image URLs.`);
}

syncImageURLs().catch((err) => {
  console.error("❌ Sync failed:", err.message);
  process.exit(1);
});
