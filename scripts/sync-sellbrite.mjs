import 'dotenv/config';
import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const SELLBRITE_API_KEY = process.env.SELLBRITE_API_KEY;
const SELLBRITE_API_SECRET = process.env.SELLBRITE_API_SECRET;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const fetchSellbriteInventory = async () => {
  let allItems = [];
  let page = 1;
  const pageSize = 100;

  while (true) {
    const res = await fetch(`https://api.sellbrite.com/v1/inventory?page=${page}&limit=${pageSize}`, {
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${SELLBRITE_API_KEY}:${SELLBRITE_API_SECRET}`).toString('base64')
      }
    });

    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) break;

    allItems.push(...data);
    console.log(`✅ Page ${page} fetched: ${data.length}`);
    if (data.length < pageSize) break;
    page++;
  }

  console.log(`🌍 Total products fetched: ${allItems.length}`);
  return allItems;
};

const syncToSupabase = async () => {
  const inventory = await fetchSellbriteInventory();

  const updates = inventory.map(item => ({
    sku: item.sku,
    title: item.product_name || 'EMPTY',
    price: parseFloat(item.price || 0),
    bin_location: item.bin_location || 'unspecified',
    image_url: item.image_url || `https://images.sellbrite.com/production/${item.sku}`,
    barcode: item.sku
  }));

  const { data, error } = await supabase.from('items').upsert(updates, {
    onConflict: ['sku'],
    ignoreDuplicates: false
  });

  if (error) {
    console.error('❌ Error syncing items to Supabase:', error);
  } else {
    console.log(`✅ Successfully synced ${updates.length} items to Supabase.`);
  }
};

syncToSupabase();
