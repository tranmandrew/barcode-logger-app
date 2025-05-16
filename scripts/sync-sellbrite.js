// scripts/sync-sellbrite.js
require('dotenv').config();
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const SELLBRITE_API_KEY = process.env.SELLBRITE_API_KEY;
const SELLBRITE_API_SECRET = process.env.SELLBRITE_API_SECRET;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function fetchSellbriteInventory() {
  const res = await axios.get('https://api.sellbrite.com/v1/products', {
    auth: {
      username: SELLBRITE_API_KEY,
      password: SELLBRITE_API_SECRET,
    },
  });
  return res.data;
}

function formatForStaging(product) {
  return {
    sku: product.sku,
    barcode: product.upc || product.ean || product.sku,
    title: product.name,
    bin_location: product.bin_location || 'Unassigned',
    cost: parseFloat(product.cost || 0),
  };
}

async function uploadToSupabase(formattedItems) {
  const { error } = await supabase
    .from('items_staging')
    .upsert(formattedItems, { onConflict: ['barcode'] });
  if (error) throw error;
}

(async () => {
  try {
    console.log('📦 Fetching inventory from Sellbrite...');
    const inventory = await fetchSellbriteInventory();
    const formatted = inventory.map(formatForStaging);

    console.log(`🚚 Uploading ${formatted.length} items to Supabase staging...`);
    await uploadToSupabase(formatted);
    console.log('✅ Sync complete.');
  } catch (err) {
    console.error('❌ Sync failed:', err);
  }
})();
