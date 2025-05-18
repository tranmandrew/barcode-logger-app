const axios = require('axios');
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const PAGE_SIZE = 100;

(async () => {
  try {
    console.log('🚀 Starting Sellbrite product fetch...');

    let allProducts = [];
    let page = 1;

    while (true) {
      const response = await axios.get('https://api.sellbrite.com/v1/products', {
        auth: {
          username: process.env.SELLBRITE_API_KEY,
          password: process.env.SELLBRITE_API_SECRET
        },
        params: {
          page,
          limit: PAGE_SIZE
        }
      });

      const products = response.data;
      if (!products.length) break;

      console.log(`✅ Page ${page} fetched: ${products.length} items`);
      allProducts = allProducts.concat(products);
      if (products.length < PAGE_SIZE) break;

      page++;
    }

    console.log(`📦 Total products fetched: ${allProducts.length}`);

    const transformed = allProducts.map(p => ({
      sku: p.sku,
      barcode: p.upc || null,
      title: p.title || '',
      bin_location: p.bin_location || 'unspecified',
      cost: 0,
      image_url: null
    }));

    // Upload to staging table
    const { error } = await supabase.from('items_staging').upsert(transformed, { onConflict: 'sku' });
    if (error) throw error;

    console.log(`📤 Uploaded ${transformed.length} items to items_staging`);
  } catch (err) {
    console.error('❌ Sync failed:', err.message);
    process.exit(1);
  }
})();
