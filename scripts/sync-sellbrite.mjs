import 'dotenv/config';
import fetch from 'node-fetch';
import supabase from './supabaseClient'; // Assuming you have a supabaseClient for DB connection

const headers = {
  'Authorization': `Bearer ${process.env.SELLBRITE_API_KEY}`,
  'Accept': 'application/json',
};

let allProducts = [];
let page = 1;
let fetched = 0;

console.log('Starting Sync...');
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

// Start processing all products fetched and prepare for insert/upsert into the DB
const mapped = [];

for (const p of allProducts) {
  try {
    const inv = await fetchInventory(p.sku); // Assuming fetchInventory is a function fetching additional details

    mapped.push({
      sku: p.sku,
      title: p.name,
      price: p.price || 0,
      barcode: inv?.barcode || null,
      bin_location: inv?.bin_location || null,
      image_url: p.image_list?.split('|')[0] || null,
    });
  } catch (err) {
    console.error(`Error fetching inventory for SKU ${p.sku}:`, err);
    // Still push partial product to preserve the rest of the data
    mapped.push({
      sku: p.sku,
      title: p.name,
      price: p.price || 0,
      barcode: null,
      bin_location: null,
      image_url: p.image_list?.split('|')[0] || null,
    });
  }
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
