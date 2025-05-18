require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function fetchAllRows(table) {
  const batchSize = 1000;
  let allRows = [];
  let from = 0;
  let to = batchSize - 1;

  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .range(from, to);

    if (error) throw new Error(`Failed to fetch ${table}: ${error.message}`);
    if (!data || data.length === 0) break;

    allRows = allRows.concat(data);
    if (data.length < batchSize) break; // Last page

    from += batchSize;
    to += batchSize;
  }

  return allRows;
}

(async () => {
  try {
    console.log('🔄 Fetching ALL data from items_staging...');
    const staging = await fetchAllRows('items_staging');

    console.log('📦 Fetching ALL data from items...');
    const items = await fetchAllRows('items');

    const itemsMap = new Map(items.map(item => [item.sku, item]));

    const barcodeToSku = new Map(
      items
        .filter(i => {
          const b = i.barcode?.trim().toLowerCase();
          return b && !['does not apply', 'n/a', 'na', ''].includes(b);
        })
        .map(i => [i.barcode.trim().toLowerCase(), i.sku])
    );

    const toUpsert = [];
    let conflictCount = 0;

    for (const row of staging) {
      const current = itemsMap.get(row.sku);

      const raw = row.barcode || '';
      const normalized = raw.trim().toLowerCase();
      const currentNormalized = current?.barcode?.trim().toLowerCase() || '';

      const isValidBarcode = normalized && !['does not apply', 'n/a', 'na', ''].includes(normalized);
      const existingOwner = isValidBarcode ? barcodeToSku.get(normalized) : null;
      const isBarcodeConflict = existingOwner && existingOwner !== row.sku;

      if (isBarcodeConflict) {
        console.warn(`❌ CONFLICT: SKU ${row.sku} — barcode ${row.barcode} already used by SKU ${existingOwner}`);
        conflictCount++;
        continue;
      }

      const isNew = !current;

      const hasChanged =
        isNew ||
        row.title !== current.title ||
        normalized !== currentNormalized ||
        row.cost !== current.cost ||
        row.bin_location !== current.bin_location ||
        row.image_url !== current.image_url;

      if (hasChanged) {
        toUpsert.push({
          ...row,
          barcode: isValidBarcode ? normalized : null,
        });
      }
    }

    console.log(`⚠️ Skipped ${conflictCount} items due to barcode collisions`);
    console.log(`📝 ${toUpsert.length} items changed or newly added — syncing to production...`);

    const { error: upsertError } = await supabase
      .from('items')
      .upsert(toUpsert, { onConflict: 'sku' });

    if (upsertError) throw new Error(`Failed to upsert items: ${upsertError.message}`);

    console.log(`✅ Successfully synced ${toUpsert.length} items to production.`);
  } catch (err) {
    console.error('❌ Merge failed:', err.message);
    process.exit(1);
  }
})();
