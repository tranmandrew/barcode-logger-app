import 'dotenv/config'
import fetch from 'node-fetch'
import { createClient } from '@supabase/supabase-js'

// Load .env
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY
const SELLBRITE_API_KEY = process.env.SELLBRITE_API_KEY
const SELLBRITE_API_SECRET = process.env.SELLBRITE_API_SECRET

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error('Missing Supabase env vars')
}
if (!SELLBRITE_API_KEY || !SELLBRITE_API_SECRET) {
  throw new Error('Missing Sellbrite env vars')
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

const headers = {
  Authorization: 'Basic ' + Buffer.from(`${SELLBRITE_API_KEY}:${SELLBRITE_API_SECRET}`).toString('base64'),
  'Content-Type': 'application/json'
}

async function fetchAll(endpoint) {
  let page = 1
  const all = []

  while (true) {
    const res = await fetch(`https://api.sellbrite.com/v1/${endpoint}?page=${page}`, { headers })
    const data = await res.json()
    if (!Array.isArray(data) || data.length === 0) break
    all.push(...data)
    console.log(`✅ ${endpoint} page ${page} fetched: ${data.length}`)
    page++
  }

  return all
}

async function main() {
  const products = await fetchAll('products')
  const inventoryList = await fetchAll('inventory')

  const inventoryMap = Object.fromEntries(inventoryList.map(item => [item.sku, item]))

  const mapped = []

  for (let i = 0; i < products.length; i++) {
    const p = products[i]
    const inv = inventoryMap[p.sku]
    if (!inv) continue

    // 🔧 Correct image_url: grab first from image_list if available
    const imageUrl =
      typeof p.image_list === 'string'
        ? p.image_list.split('|')?.[0]?.trim() || ''
        : ''

    mapped.push({
      sku: p.sku,
      title: p.name,
      price: parseFloat(p.price) || 0,
      bin_location: inv.bin_location || 'unspecified',
      barcode: inv.barcode || p.sku,
      image_url: imageUrl
    })

    if ((i + 1) % 50 === 0 || i === products.length - 1) {
      console.log(`🔄 Processed ${i + 1} / ${products.length}`)
    }
  }

  console.log(`⬆️ Uploading ${mapped.length} matched items to Supabase...`)

  const { error } = await supabase.from('items').upsert(mapped, {
    onConflict: ['sku']
  })

  if (error) {
    console.error('❌ Supabase upsert error:', error)
    process.exit(1)
  }

  console.log(`✅ Upload complete. Synced ${mapped.length} items.`)
}

main()
