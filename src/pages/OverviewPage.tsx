import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function OverviewPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [scans, setScans] = useState<any[]>([]);

  useEffect(() => {
    const fetchSessions = async () => {
      const { data, error } = await supabase
        .from("daily_sessions")
        .select("*")
        .order("date", { ascending: false });
      if (error) console.error("Error fetching sessions:", error.message);
      else setSessions(data || []);
    };
    fetchSessions();
  }, []);

  const loadSessionLogs = async (sessionId: string) => {
    setSelectedSession(sessionId);
    const { data, error } = await supabase
      .from("scan_logs")
      .select("*, items(title)")
      .eq("session_id", sessionId)
      .order("timestamp", { ascending: true });

    if (error) console.error("Error loading scan logs:", error.message);
    else setScans(data || []);
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">📅 Daily Scan Overview</h2>

      <div className="mb-6">
        <h3 className="font-semibold mb-2">Sessions:</h3>
        <div className="flex flex-wrap gap-2">
          {sessions.map((s) => (
            <button
              key={s.id}
              className={`px-4 py-2 rounded-full border ${
                selectedSession === s.id
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-black"
              }`}
              onClick={() => loadSessionLogs(s.id)}
            >
              {s.date}
            </button>
          ))}
        </div>
      </div>

      {selectedSession && (
        <div>
          <h3 className="font-semibold mb-2">Scans for {sessions.find(s => s.id === selectedSession)?.date}:</h3>
          <ul className="space-y-1">
            {scans.length > 0 ? (
              scans.map((scan) => (
                <li
                  key={scan.id}
                  className="border p-2 rounded shadow-sm flex justify-between items-center"
                >
                  <div>
                    <strong>{scan.sku}</strong> – {scan.scan_type.toUpperCase()} by {scan.user_id}<br />
                    <span className="text-sm text-gray-600">
                      {new Date(scan.timestamp).toLocaleString()} – {scan.items?.title || "No title"}
                    </span>
                  </div>
                </li>
              ))
            ) : (
              <p className="text-sm text-gray-500">No scans found for this session.</p>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
