const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

// Pull secrets from GitHub environment variables
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
  const { error } = await supabase.from('items_staging').delete();
  if (error) throw new Error('Failed to clear staging table: ' + error.message);

  const { error: insertError } = await supabase.from('items_staging').insert(formattedItems);
  if (insertError) throw new Error('Insert failed: ' + insertError.message);

  console.log('✔ Synced inventory to items_staging');
}

(async () => {
  try {
    const raw = await fetchSellbriteInventory();
    const formatted = raw.map(formatForStaging);
    await uploadToSupabase(formatted);
  } catch (err) {
    console.error('❌ Sync error:', err.message);
    process.exit(1);
  }
})();
