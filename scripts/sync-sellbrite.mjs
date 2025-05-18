import 'dotenv/config';
import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const SELLBRITE_API_KEY = process.env.SELLBRITE_API_KEY;
const SELLBRITE_API_SECRET = process.env.SELLBRITE_API_SECRET;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const auth = Buffer.from(`${SELLBRITE_API_KEY}:${SELLBRITE_API_SECRET}`).toString('base64');
const headers = {
  Authorization: `Basic ${auth}`,
  'Content-Type': 'application/json',
};

async function fetchInventory(sku) {
  try {
    const res = await fetch(`https://api.sellbrite.com/v1/inventory/${sku}`, { headers });
    if (!res.ok) return { barcode: null, bin_location: null };
    const data = await res.json();
    return {
      barcode: data.barcode || null,
      bin_location: data.bin_location || 'unspecified',
    };
  } catch {
    return { barcode: null, bin_location: null };
  }
}

let page = 1;
let fetched = 0;
let allProducts = [];

console.log('Fetching Sellbrite products...');

while (true) {
  const res = await fetch(`https://api.sellbrite.com/v1/products?page=${page}`, { headers });
  const products = await res.json();

  if (!Array.isArray(products) || products.length === 0) break;

  allProducts.push(...products);
  fetched += products.length;
  console.log(`Page ${page} fetched: ${products.length} items`);
  page++;
}

console.log(`Fetched total ${fetched} products`);

const mapped = [];

for (const p of allProducts) {
  const inv = await fetchInventory(p.sku);
  mapped.push({
    sku: p.sku,
    title: p.name,
    price: p.price || 0,
    barcode: inv.barcode,
    bin_location: inv.bin_location,
    image_url: p.image_list?.split('|')[0] || null,
  });
}

console.log('Uploading to Supabase...');

const { error } = await supabase.from('items_staging').upsert(mapped, {
  onConflict: ['sku'],
});

if (error) {
  console.error('Failed to upsert to Supabase:', error);
  process.exit(1);
}

console.log('Upload to Supabase complete.');
