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
    bin_location: product.bin_location || 'unsassigned',
    cost: parseFloat(product.cost || 0),
  };
}

async function uploadToSupabase(formattedItems) {
  // Clear previous records
  await supabase.from('items_staging').delete().neq('sku', '');

  // Insert new records
  const { error } = await supabase.from('items_staging').insert(formattedItems);
  if (error) {
    console.error('Upload failed:', error.message);
    process.exit(1);
  } else {
    console.log(`✅ Uploaded ${formattedItems.length} items to items_staging`);
  }
}

(async () => {
  try {
    const inventory = await fetchSellbriteInventory();
    const formatted = inventory.map(formatForStaging);
    await uploadToSupabase(formatted);
  } catch (err) {
    console.error('❌ Sync error:', err.message);
    process.exit(1);
  }
  console.log("🚀 Sync script triggered at", new Date().toISOString());
})();
