import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { format } from "date-fns";

const ScanPage = () => {
  const [barcode, setBarcode] = useState("");
  const [scanLogs, setScanLogs] = useState<any[]>([]);
  const [mode, setMode] = useState<"IN" | "OUT">("IN");
  const [sessionId, setSessionId] = useState<string>("");
  const [user, setUser] = useState<string>("Andrew");
  const [itemPreview, setItemPreview] = useState<{ title: string; image_url: string | null } | null>(null);

  useEffect(() => {
    const today = format(new Date(), "yyyy-MM-dd");
    setSessionId(today);
  }, []);

  const handleScan = async () => {
    if (!barcode) return;

    // Fetch item info
    const { data: itemData } = await supabase
      .from("items")
      .select("title, image_url")
      .eq("barcode", barcode)
      .single();

    setItemPreview(itemData ? { title: itemData.title, image_url: itemData.image_url } : null);

    // Insert into logs
    const { error } = await supabase.from("scan_logs").insert([
      {
        barcode,
        mode,
        user,
        session_id: sessionId,
        timestamp: new Date().toISOString(),
      },
    ]);

    if (!error) {
      setScanLogs((prev) => [
        {
          barcode,
          mode,
          timestamp: new Date().toISOString(),
        },
        ...prev.slice(0, 9),
      ]);
      setBarcode("");
    }
  };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Barcode Scanner</h1>

      <div className="flex items-center gap-2">
        <input
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
          placeholder="Enter SKU or scan"
          className="border px-2 py-1"
        />
        <button onClick={() => setMode("IN")} className={`px-3 py-1 ${mode === "IN" ? "bg-green-500 text-white" : "bg-gray-200"}`}>IN</button>
        <button onClick={() => setMode("OUT")} className={`px-3 py-1 ${mode === "OUT" ? "bg-red-500 text-white" : "bg-gray-200"}`}>OUT</button>
        <button onClick={handleScan} className="bg-blue-600 text-white px-4 py-1">Scan</button>
      </div>

      {itemPreview && (
        <div className="flex items-center gap-4 border p-2 rounded">
          <img
            src={itemPreview.image_url || ""}
            alt="Preview"
            className="w-24 h-24 object-contain border"
            onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
          />
          <div>
            <p className="font-semibold">{itemPreview.title}</p>
            <p className="text-sm text-gray-600">Barcode: {barcode}</p>
          </div>
        </div>
      )}

      <div>
        <h2 className="text-lg font-medium">Last 10 Scans</h2>
        <ul className="text-sm">
          {scanLogs.map((log, index) => (
            <li key={index}>
              #{log.barcode} — <span className={log.mode === "IN" ? "text-green-600" : "text-red-600"}>{log.mode}</span> @{" "}
              {format(new Date(log.timestamp), "Pp")}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default ScanPage;