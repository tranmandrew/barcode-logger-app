import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const SELLBRITE_API_KEY = process.env.SELLBRITE_API_KEY;

async function fetchAllProducts() {
  const allProducts = [];
  let page = 1;

  while (true) {
    const res = await fetch(`https://api.sellbrite.com/v1/products?page=${page}`, {
      headers: { Authorization: `Bearer ${SELLBRITE_API_KEY}` },
    });

    const products = await res.json();
    if (!Array.isArray(products) || products.length === 0) break;

    allProducts.push(...products);
    console.log(`✅ Page ${page} fetched: ${products.length}`);
    page++;
  }

  console.log(`🌍 Total products fetched: ${allProducts.length}`);
  return allProducts;
}

function extractInventoryData(products) {
  return products
    .flatMap(product => {
      const base = {
        sku: product.sku,
        title: product.name,
        price: parseFloat(product.price) || 0,
        barcode: product.sku,
        bin_location: product.bin_location || 'unspecified',
        image_url: product.image_url || `https://images.sellbrite.com/production/${product.sku}.jpg`,
      };

      if (product.variants?.length > 0) {
        return product.variants.map(variant => ({
          ...base,
          sku: variant.sku,
          barcode: variant.sku,
          price: parseFloat(variant.price) || base.price,
          image_url: variant.image_url || base.image_url,
        }));
      }

      return [base];
    })
    .filter(p => p.sku); // remove undefined/empty SKU entries
}

async function syncToSupabase(items) {
  const { error } = await supabase.from('items').upsert(items, { onConflict: ['sku'] });

  if (error) {
    console.error('❌ Supabase error:', error);
  } else {
    console.log(`✅ Successfully synced ${items.length} items to Supabase.`);
  }
}

async function main() {
  const products = await fetchAllProducts();
  const extracted = extractInventoryData(products);
  await syncToSupabase(extracted);
}

main();
