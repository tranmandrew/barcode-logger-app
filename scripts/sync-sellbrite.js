// scripts/sync-sellbrite.js
require('dotenv').config();

const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');


const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const SELLBRITE_API_KEY = process.env.SELLBRITE_API_KEY;
const SELLBRITE_API_SECRET = process.env.SELLBRITE_API_SECRET;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const PAGE_SIZE = 100;

(async () => {
  try {
    let page = 1;
    let allProducts = [];
    let fetched = [];

    console.log('🔄 Starting Sellbrite product fetch...');

    do {
      const response = await axios.get('https://api.sellbrite.com/v1/products', {
        auth: {
          username: SELLBRITE_API_KEY,
          password: SELLBRITE_API_SECRET,
        },
        params: {
          page,
          limit: PAGE_SIZE,
        },
      });

      fetched = response.data;
      allProducts.push(...fetched);
      console.log(`✅ Page ${page} fetched: ${fetched.length} items`);
      page++;
    } while (fetched.length === PAGE_SIZE);

    console.log(`📦 Total products fetched: ${allProducts.length}`);

    const items = [];
    const seenSkus = new Set();

    for (const product of allProducts) {
      const sku = product.sku?.trim();
      if (!sku || seenSkus.has(sku)) continue;
      seenSkus.add(sku);

      items.push({
        sku,
        title: product.name || null,
        barcode: product.upc || product.ean || sku,
        cost: product.cost ? parseFloat(product.cost) : 0,
        bin_location: product.bin_location || 'unassigned',
        image_url:
          product.primary_image_url ||
          (product.image_list?.includes('|')
            ? product.image_list.split('|')[0].trim()
            : product.image_list?.trim() || null),
      });
    }

    console.log(`📤 Syncing ${items.length} items to Supabase...`);

    // You can use upsert or delete + insert depending on your preference
    await supabase.from('items_staging').delete().neq('sku', ''); // clear old

    const { error } = await supabase.from('items_staging').insert(items);

    if (error) {
      console.error('❌ Supabase insert error:', error.message);
      process.exit(1);
    }

    console.log(`✅ Successfully synced ${items.length} items to Supabase.`);
  } catch (err) {
    console.error('❌ Sync failed:', err.message);
    process.exit(1);
  }
})();
