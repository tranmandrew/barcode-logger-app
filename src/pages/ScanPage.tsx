import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { format } from "date-fns";

interface ScanLog {
  id: number;
  timestamp: string;
  direction: string;
  raw_sku: string;
  items: {
    title: string;
    image_url: string;
  } | null;
}

const users = ["Andrew", "Alice", "Bob"];

export default function ScanPage() {
  const [scans, setScans] = useState<ScanLog[]>([]);
  const [mode, setMode] = useState<"in" | "out">("in");
  const [sku, setSku] = useState("");
  const [user, setUser] = useState<string>(users[0]);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchScans = async () => {
      const { data, error } = await supabase
        .from("scan_logs")
        .select("id, timestamp, direction, raw_sku, items(title, image_url)")
        .order("timestamp", { ascending: false })
        .limit(10);
      if (error) {
        console.error("Error fetching scans:", error);
      } else if (data) {
        setScans(data);
        // Show image of the most recent scan (if available)
        if (data.length > 0) {
          const latest = data[0];
          setImageUrl(latest.items?.image_url ?? null);
        }
      }
    };
    fetchScans();
  }, []);

  const handleScan = async () => {
    if (!sku) return;
    // Find matching item by barcode (case-insensitive, partial match)
    const { data: itemsData, error: itemError } = await supabase
      .from("items")
      .select("*")
      .ilike("barcode", `%${sku}%`);
    if (itemError) {
      console.error("Error fetching item:", itemError);
      return;
    }
    const item = itemsData?.[0] ?? null;
    // Insert new scan log entry
    const { data: newEntries, error: insertError } = await supabase
      .from("scan_logs")
      .insert({
        item_id: item ? item.id : null,
        user_id: user,
        direction: mode,
        timestamp: new Date().toISOString(),
        raw_sku: sku,
      })
      .select("id, timestamp, direction, raw_sku, items(title, image_url)");
    if (insertError) {
      console.error("Error inserting scan:", insertError);
    } else if (newEntries) {
      const newEntry = newEntries[0];
      // Update scan list (prepend new entry and limit to 10)
      setScans((prev) => [newEntry, ...prev].slice(0, 10));
      // Update image preview
      setImageUrl(newEntry.items?.image_url ?? null);
    }
    // Clear the input for the next scan
    setSku("");
  };

  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: "2rem", padding: "1rem" }}>
      {/* Left Panel: Scan form and recent scans list */}
      <div style={{ flex: 1 }}>
        <h3>Barcode Scanner</h3>
        {/* User Selector */}
        <div style={{ marginBottom: "0.5rem" }}>
          <label htmlFor="userSelect" style={{ marginRight: "0.5rem" }}>User:</label>
          <select
            id="userSelect"
            value={user}
            onChange={(e) => setUser(e.target.value)}
            style={{ padding: "0.25rem" }}
          >
            {users.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>
        {/* Barcode Input */}
        <div style={{ marginBottom: "0.5rem" }}>
          <input
            type="text"
            placeholder="Enter SKU or scan"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleScan();
              }
            }}
            style={{ padding: "0.5rem", width: "100%", maxWidth: "250px" }}
          />
        </div>
        {/* IN/OUT Toggle */}
        <div style={{ marginBottom: "0.5rem" }}>
          <span style={{ marginRight: "0.5rem" }}>Mode:</span>
          <button
            onClick={() => setMode("in")}
            style={{
              padding: "0.25rem 0.5rem",
              marginRight: "0.5rem",
              backgroundColor: mode === "in" ? "#007bff" : "#e0e0e0",
              color: mode === "in" ? "#fff" : "#000",
              border: "none",
              borderRadius: "4px",
            }}
          >
            IN
          </button>
          <button
            onClick={() => setMode("out")}
            style={{
              padding: "0.25rem 0.5rem",
              backgroundColor: mode === "out" ? "#007bff" : "#e0e0e0",
              color: mode === "out" ? "#fff" : "#000",
              border: "none",
              borderRadius: "4px",
            }}
          >
            OUT
          </button>
        </div>
        {/* Scan Button */}
        <div style={{ marginBottom: "1rem" }}>
          <button
            onClick={handleScan}
            style={{
              padding: "8px 16px",
              backgroundColor: "#007bff",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
            }}
          >
            Scan
          </button>
        </div>
        {/* Recent Scans List */}
        <h4>Last 10 Scans</h4>
        <ul style={{ listStyleType: "none", paddingLeft: 0 }}>
          {scans.map((scan) => {
            const displayName = scan.items ? scan.items.title : scan.raw_sku;
            return (
              <li key={scan.id} style={{ marginBottom: "0.5rem", display: "flex", alignItems: "center" }}>
                {/* Thumbnail Image if available */}
                {scan.items?.image_url ? (
                  <img
                    src={scan.items.image_url}
                    alt={scan.items.title || "Item image"}
                    style={{ width: "40px", height: "40px", objectFit: "cover", borderRadius: "4px", marginRight: "0.5rem" }}
                  />
                ) : (
                  // Placeholder to align text if no image
                  <div style={{ width: "40px", height: "40px", marginRight: "0.5rem" }} />
                )}
                {/* Scan info text */}
                <span>
                  <strong>{displayName}</strong> — <em>{scan.direction.toUpperCase()}</em> @{" "}
                  {format(new Date(scan.timestamp), "MMM d, yyyy h:mm aa")}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
      {/* Right Panel: Large image preview for the latest scanned item */}
      <div>
        {imageUrl ? (
          <img
            src={imageUrl}
            alt="Item Preview"
            style={{ maxWidth: "300px", borderRadius: "8px", border: "1px solid #ccc" }}
          />
        ) : (
          <div style={{ width: "300px", height: "300px", border: "1px solid #ccc", borderRadius: "8px" }} />
        )}
      </div>
    </div>
  );
}
