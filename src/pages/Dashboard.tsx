import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalToday: 0,
    scansPerUser: {} as Record<string, number>,
    mostScanned: [] as [string, number][],
    currentlyOut: 0,
    overdueCount: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Total Scans Today
      const { count: totalToday } = await supabase
        .from("scan_logs")
        .select("id", { count: "exact" })
        .gte("timestamp", today.toISOString());

      // Scans Per User
      const { data: userScansRaw } = await supabase
        .from("scan_logs")
        .select("user_id")
        .gte("timestamp", today.toISOString());

      const scansPerUser: Record<string, number> = {};
      userScansRaw?.forEach((log) => {
        scansPerUser[log.user_id] = (scansPerUser[log.user_id] || 0) + 1;
      });

      // Most Scanned Items
      const { data: allScans } = await supabase.from("scan_logs").select("sku");
      const countMap: Record<string, number> = {};
      allScans?.forEach((s) => {
        countMap[s.sku] = (countMap[s.sku] || 0) + 1;
      });
      const mostScanned = Object.entries(countMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

      // Currently Out
      const { data: latestScans } = await supabase
        .from("scan_logs")
        .select("sku, scan_type")
        .order("timestamp", { ascending: false });

      const outMap = new Map();
      latestScans?.forEach((scan) => {
        if (!outMap.has(scan.sku)) {
          outMap.set(scan.sku, scan.scan_type);
        }
      });
      const currentlyOut = Array.from(outMap.values()).filter((t) => t === "out").length;

      // Overdue Count
      const { data: overdue } = await supabase.rpc("get_still_out_items");
      const now = new Date();
      now.setHours(18, 30, 0, 0);
      const overdueCount = overdue.filter((item) => new Date(item.scanned_at) < now).length;

      setStats({
        totalToday: totalToday || 0,
        scansPerUser,
        mostScanned,
        currentlyOut,
        overdueCount,
      });
    };

    fetchStats();
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: "22px", fontWeight: "bold" }}>📊 Dashboard Metrics</h2>
        <button
          onClick={() => navigate("/scan")}
          style={{
            marginTop: 8,
            padding: "8px 16px",
            fontSize: "14px",
            backgroundColor: "#007bff",
            color: "white",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
            fontWeight: "bold"
          }}
        >
          ← Back to Scanner
        </button>
      </div>

      <div style={{ display: "grid", gap: "20px" }}>
        <div>
          <h3>Total Scans Today</h3>
          <p>{stats.totalToday}</p>
        </div>

        <div>
          <h3>Scans Per User</h3>
          <ul>
            {Object.entries(stats.scansPerUser).map(([user, count]) => (
              <li key={user}>
                {user}: {count}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3>Top 5 Most Scanned</h3>
          <ul>
            {stats.mostScanned.map(([sku, count]) => (
              <li key={sku}>
                {sku}: {count}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3>Currently Out</h3>
          <p>{stats.currentlyOut}</p>
        </div>

        <div>
          <h3>Overdue Count</h3>
          <p>{stats.overdueCount}</p>
        </div>
      </div>
    </div>
  );
}
