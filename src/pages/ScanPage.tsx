import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_KEY!
);

export default function ScanPage() {
  const [scans, setScans] = useState<any[]>([]);
  const [mode, setMode] = useState("IN");
  const [sku, setSku] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchScans = async () => {
      const { data } = await supabase
        .from("scan_logs")
        .select("*, items:image_id(image_url)")
        .order("scanned_at", { ascending: false })
        .limit(10);

      setScans(data || []);

      if (data?.[0]?.items?.image_url) {
        setImageUrl(data[0].items.image_url);
      }
    };

    fetchScans();
  }, []);

  const handleScan = async () => {
    const { data: item } = await supabase
      .from("items")
      .select("*")
      .eq("barcode", sku)
      .single();

    if (item?.image_url) setImageUrl(item.image_url);

    await supabase.from("scan_logs").insert({
      item_id: item?.id,
      mode,
      scanned_at: new Date().toISOString(),
    });
  };

  return (
    <div style={{ display: "flex", gap: "2rem" }}>
      <div>
        <h3>Barcode Scanner</h3>
        <input
          type="text"
          placeholder="Enter SKU or scan"
          value={sku}
          onChange={(e) => setSku(e.target.value)}
        />
        <div>
          Mode: 
          <button onClick={() => setMode("IN")}>IN</button>
          <button onClick={() => setMode("OUT")}>OUT</button>
        </div>
        <button onClick={handleScan}>Scan</button>

        <h4>Last 10 Scans</h4>
        <ul>
          {scans.map((scan) => (
            <li key={scan.id}>
              #{scan.items?.barcode} — <strong>{scan.mode}</strong> @ {new Date(scan.scanned_at).toLocaleString()}
            </li>
          ))}
        </ul>
      </div>

      <div>
        {imageUrl && (
          <img
            src={imageUrl}
            alt="Item Preview"
            style={{ width: "300px", borderRadius: "8px", border: "1px solid #ccc" }}
          />
        )}
      </div>
    </div>
  );
}
