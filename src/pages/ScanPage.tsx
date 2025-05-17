import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

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
        const { data: newSession } = await supabase
          .from("daily_sessions")
          .insert([{ date: today }])
          .select()
          .single();

        if (newSession) {
          setSelectedSession(newSession.id);
          setSessions([newSession, ...(sessionData || [])]);
        }
      }

      fetchScans();
    };
    fetchInitial();
  }, []);

  const fetchScans = async () => {
    const { data } = await supabase
      .from("scan_logs")
      .select("*, items(title, image_url)")
      .order("timestamp", { ascending: false })
      .limit(10);
    setScans(data || []);
  };

  const handleScan = async () => {
    if (!sku || !selectedUser || !selectedSession) return;

    const { data: itemData } = await supabase
      .from("items")
      .select("title")
      .eq("sku", sku)
      .single();
    setItemTitle(itemData?.title || null);

    const { error } = await supabase.from("scan_logs").insert([
      {
        sku,
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
  };

  const handleCheckOverdue = async () => {
    const { data, error } = await supabase.rpc("get_still_out_items");
    if (error) {
      console.error("Overdue error:", error.message);
    } else {
      setOverdueItems(data || []);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ fontSize: 20, fontWeight: "bold" }}>📦 Barcode Scanner</h2>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input
          type="text"
          placeholder="Enter SKU or scan"
          value={sku}
          onChange={(e) => setSku(e.target.value)}
        />
        <select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)}>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
        <select value={selectedSession} onChange={(e) => setSelectedSession(e.target.value)}>
          {sessions.map((s) => (
            <option key={s.id} value={s.id}>
              Session {s.date}
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: "flex", alignItems: "center", marginTop: 10, gap: "12px" }}>
        <span>
          <strong>Mode:</strong>
        </span>
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
        >
          IN
        </button>
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
        >
          OUT
        </button>
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
      >
        Scan
      </button>

      <div style={{ marginTop: 10 }}>
        <button onClick={handleCheckOverdue}>Check Overdue Now</button>
        <button
          onClick={() => {
            const csv = overdueItems
              .map(
                (item) =>
                  `${item.sku},"${item.title}",${item.user_name},${item.scanned_at},${item.location}`
              )
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
        >
          Download CSV
        </button>
        <button onClick={() => window.print()}>Print</button>
        <button onClick={() => (window.location.href = "/dashboard")}>Dashboard</button>
        <button onClick={() => (window.location.href = "/sync")}>Manual Sync</button>
      </div>

      {sku && itemTitle && (
        <div style={{ marginTop: 8, fontSize: 12, color: "#555" }}>
          <strong>Preview:</strong> {sku} — {itemTitle}
        </div>
      )}

      {overdueItems.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <h4>Overdue Items</h4>
          <ul>
            {overdueItems.map((o, i) => (
              <li key={i}>
                #{o.sku} — {o.title} — Last scanned by {o.user_name} at{" "}
                {new Date(o.scanned_at).toLocaleString()} in {o.location}
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
              {s.items?.title ? `— ${s.items.title}` : ""}
            </li>
          ))}
        </ul>

        <div style={{ flex: 1 }}>
          {scans[0]?.items?.image_url && (
            <div>
              <img
                src={scans[0].items.image_url}
                alt={scans[0].items.title || "Item image"}
                style={{ maxWidth: "100%", maxHeight: 300, borderRadius: 8, border: "1px solid #ccc" }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
