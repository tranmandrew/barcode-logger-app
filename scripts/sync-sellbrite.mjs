import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Supabase URL and Service Key are required in the environment variables.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const headers = {
  Authorization: `Bearer ${process.env.SELLBRITE_API_KEY}`,
  'Content-Type': 'application/json',
};

let totalPages = 1;
let allProducts = [];

for (let page = 1; page <= totalPages; page++) {
  const res = await fetch(`https://api.sellbrite.com/v1/products?page=${page}`, { headers });
  const products = await res.json();

  if (!Array.isArray(products) || products.length === 0) break;

  allProducts.push(...products);
  console.log(`Fetched page ${page}: ${products.length} items`);
}

console.log(`Fetched total ${allProducts.length} products`);

const mapped = allProducts.map((p) => ({
  sku: p.sku,
  title: p.name,
  price: p.price || 0,
  barcode: p.barcode,
  bin_location: p.bin_location,
  image_url: p.image_list ? p.image_list.split('|')[0] : null, // Ensure the first image is selected
}));

console.log('Uploading to Supabase...');

const { error } = await supabase
  .from('items_staging')
  .upsert(mapped, { 
    onConflict: ['sku'], 
  });

if (error) {
  console.error('Failed to upsert to Supabase:', error);
  process.exit(1);
}

console.log('Upload to Supabase complete.');