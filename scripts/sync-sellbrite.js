const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const SELLBRITE_API_KEY = process.env.SELLBRITE_API_KEY;
const SELLBRITE_API_SECRET = process.env.SELLBRITE_API_SECRET;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

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
    .delete()
    .neq('sku', ''); // Clear staging before inserting

  if (error) throw new Error('Failed to clear staging table: ' + error.message);

  const { error: insertError } = await supabase
    .from('items_staging')
    .insert(formattedItems);

  if (insertError) throw new Error('Failed to upload items: ' + insertError.message);
}

(async () => {
  try {
    const products = await fetchSellbriteInventory();
    const formatted = products.map(formatForStaging);
    await uploadToSupabase(formatted);
    console.log('✅ Inventory synced to Supabase staging.');
  } catch (err) {
    console.error('❌ Sync failed:', err.message);
    process.exit(1);
  }
})();
