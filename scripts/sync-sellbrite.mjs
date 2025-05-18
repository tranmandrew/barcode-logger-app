import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const SELLBRITE_API_KEY = process.env.SELLBRITE_API_KEY;
const SELLBRITE_API_SECRET = process.env.SELLBRITE_API_SECRET;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const SELLBRITE_API = 'https://api.sellbrite.com/v1/products';

async function fetchAllProducts() {
  let page = 1;
  const allProducts = [];

  while (true) {
    const response = await fetch(`${SELLBRITE_API}?page=${page}`, {
      headers: {
        Authorization:
          'Basic ' +
          Buffer.from(`${SELLBRITE_API_KEY}:${SELLBRITE_API_SECRET}`).toString('base64'),
      },
    });

    if (!response.ok) {
      console.error(`Error fetching page ${page}:`, await response.text());
      break;
    }

    const products = await response.json();
    if (products.length === 0) break;

    allProducts.push(...products);
    console.log(`Fetched page ${page} (${products.length} items)`);
    page++;
  }

  return allProducts;
}

(async () => {
  console.log('Fetching products from Sellbrite...');
  const allProducts = await fetchAllProducts();
  console.log(`Fetched total ${allProducts.length} products`);

  const transformed = allProducts.map(p => ({
    sku: p.sku,
    barcode: p.upc || null,
    title: p.name || '',
    bin_location: p.bin_location || 'unspecified',
    price: p.price || 0,
    cost: p.cost || 0,
    image_url: p.image_list?.split('|')[0] || null,
  }));

  console.log('Uploading to Supabase...');
  const { error } = await supabase.from('items_staging').upsert(transformed, {
    onConflict: ['sku'],
  });

  if (error) {
    console.error('Failed to upsert to Supabase:', error);
    process.exit(1);
  }

  console.log(`Successfully upserted ${transformed.length} items.`);
})();
