import React, { useEffect, useState, useRef } from "react";
import { supabase } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";

export default function ScanPage() {
  const [sku, setSku] = useState("");
  const [direction, setDirection] = useState<"IN" | "OUT">("IN");
  const [scans, setScans] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSession, setSelectedSession] = useState<string>("");
  const [overdueItems, setOverdueItems] = useState<any[]>([]);
  const [itemTitle, setItemTitle] = useState<string | null>(null);
  const [itemImage, setItemImage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchInitial = async () => {
      const { data: userData } = await supabase.from("scanner_users").select("*");
      setUsers(userData || []);
      if (userData?.[0]) setSelectedUser(userData[0].id);

      const today = new Date().toISOString().slice(0, 10);
      const { data: sessionData } = await supabase
        .from("daily_sessions")
        .select("*")
        .order("date", { ascending: false });

      setSessions(sessionData || []);
      const todaySession = sessionData?.find((s) => s.date === today);

      if (todaySession) {
        setSelectedSession(todaySession.id);
      } else {
        const { data: newSession, error } = await supabase
          .from("daily_sessions")
          .insert([{ date: today }])
          .select()
          .single();

        if (newSession && !error) {
          setSelectedSession(newSession.id);
          setSessions([newSession, ...(sessionData || [])]);
        } else {
          console.error("Failed to create session:", error?.message);
        }
      }

      fetchScans();
    };

    fetchInitial();
    inputRef.current?.focus();
  }, []);

  const fetchScans = async () => {
    const { data: rawScans, error } = await supabase
      .from("scan_logs")
      .select("*")
      .order("timestamp", { ascending: false })
      .limit(10);

    if (error) return console.error("Fetch scans error:", error.message);

    const enriched = await Promise.all(
      (rawScans || []).map(async (scan) => {
        const { data: item } = await supabase
          .from("items")
          .select("title, image_url")
          .eq("sku", scan.sku)
          .single();

        return {
          ...scan,
          item_title: item?.title || null,
          item_image: item?.image_url || null,
        };
      })
    );

    setScans(enriched);
    if (enriched[0]?.item_image) setItemImage(enriched[0].item_image);
  };

  const handleScan = async () => {
    if (!sku || !selectedUser || !selectedSession) return;

    const currentSku = sku.trim();

    const { data: itemData } = await supabase
      .from("items")
      .select("title, image_url")
      .eq("sku", currentSku)
      .single();

    setItemTitle(itemData?.title || null);
    setItemImage(itemData?.image_url || null);

    const { error } = await supabase.from("scan_logs").insert([
      {
        sku: currentSku,
        scan_type: direction.toLowerCase(),
        user_id: selectedUser,
        session_id: selectedSession,
      },
    ]);

    if (error) {
      console.error("Scan error:", error.message);
      return;
    }

    setSku("");
    fetchScans();

    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.value = "";
        inputRef.current.focus();
      }
    }, 10);
  };

  const handleCheckOverdue = async () => {
    const { data, error } = await supabase.rpc("get_still_out_items");
    if (error) console.error("Overdue error:", error.message);
    else setOverdueItems(data || []);
  };

  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ fontSize: 20, fontWeight: "bold" }}>📦 Barcode Scanner</h2>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input
          ref={inputRef}
          type="text"
          placeholder="Enter SKU or scan"
          value={sku}
          onChange={(e) => setSku(e.target.value)}
        />
        <select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)}>
          {users.map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
        <select value={selectedSession} onChange={(e) => setSelectedSession(e.target.value)}>
          {sessions.map((s) => (
            <option key={s.id} value={s.id}>Session {s.date}</option>
          ))}
        </select>
      </div>

      <div style={{ display: "flex", alignItems: "center", marginTop: 10, gap: "12px" }}>
        <span><strong>Mode:</strong></span>
        <button
          onClick={() => setDirection("IN")}
          style={{
            backgroundColor: direction === "IN" ? "#4CAF50" : "#e0e0e0",
            color: direction === "IN" ? "white" : "black",
            padding: "6px 12px",
            border: "1px solid #ccc",
            borderRadius: "6px",
            fontWeight: direction === "IN" ? "bold" : "normal",
          }}
        >IN</button>
        <button
          onClick={() => setDirection("OUT")}
          style={{
            backgroundColor: direction === "OUT" ? "#f44336" : "#e0e0e0",
            color: direction === "OUT" ? "white" : "black",
            padding: "6px 12px",
            border: "1px solid #ccc",
            borderRadius: "6px",
            fontWeight: direction === "OUT" ? "bold" : "normal",
          }}
        >OUT</button>
      </div>

      <button
        onClick={handleScan}
        style={{
          marginTop: 8,
          backgroundColor: "#2196F3",
          color: "white",
          padding: "10px 24px",
          border: "none",
          borderRadius: "4px",
          fontWeight: "bold",
        }}
      >Scan</button>

      <div style={{ marginTop: 10 }}>
        <button onClick={handleCheckOverdue}>Check Overdue Now</button>
        <button
          onClick={() => {
            const csv = overdueItems
              .map((item) => `${item.sku},"${item.title}",${item.user_name},${item.scanned_at},${item.location}`)
              .join("\n");
            const blob = new Blob(["Barcode,Item Name,User,Timestamp,Location\n" + csv], {
              type: "text/csv",
            });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "overdue_items.csv";
            a.click();
            window.URL.revokeObjectURL(url);
          }}
        >Download CSV</button>
        <button onClick={() => window.print()}>Print</button>
        <button onClick={() => navigate("/dashboard")}>Dashboard</button>
        <button onClick={() => navigate("/sync")}>Manual Sync</button>
      </div>

      {sku && itemTitle && (
        <div style={{ marginTop: 8, fontSize: 12, color: "#555" }}>
          <strong>Preview:</strong> {sku} — {itemTitle}
        </div>
      )}

      {overdueItems.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <h4>Overdue Items</h4>
          <ul>
            {overdueItems.map((item, i) => (
              <li key={i}>
                #{item.sku} — {item.title} — Last scanned by {item.user_name} at{" "}
                {new Date(item.scanned_at).toLocaleString()} in {item.location}
              </li>
            ))}
          </ul>
        </div>
      )}

      <h4 style={{ marginTop: 20 }}>Last 10 Scans</h4>
      <div style={{ display: "flex", gap: "40px" }}>
        <ul style={{ flex: 1 }}>
          {scans.map((s, i) => (
            <li key={i}>
              #{s.sku} —{" "}
              <span style={{ color: s.scan_type === "in" ? "#4CAF50" : "#f44336" }}>
                {s.scan_type.toUpperCase()}
              </span>{" "}
              @ {new Date(s.timestamp).toLocaleString()}{" "}
              {s.item_title ? `— ${s.item_title}` : ""}
            </li>
          ))}
        </ul>
        <div style={{ flex: 1 }}>
          {itemImage && (
            <img
              src={itemImage}
              alt="Last scanned item"
              style={{
                maxWidth: "100%",
                maxHeight: 300,
                borderRadius: 8,
                border: "1px solid #ccc",
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
