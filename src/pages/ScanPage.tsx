import { useEffect, useState } from "react";
import supabase from "@/lib/supabaseClient";
import { format } from "date-fns";

const ScanPage = () => {
  const [sku, setSku] = useState("");
  const [mode, setMode] = useState("IN");
  const [scans, setScans] = useState<any[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [user, setUser] = useState("Andrew");

  // Load sessions and auto-select/create today's
  useEffect(() => {
    const loadSessions = async () => {
      const { data, error } = await supabase
        .from("daily_sessions")
        .select("*")
        .order("session_date", { ascending: false });

      if (error) {
        console.error("Error loading sessions:", error.message);
        return;
      }

      setSessions(data || []);
      const today = format(new Date(), "yyyy-MM-dd");
      const existing = data?.find((s: any) => s.session_date === today);

      if (existing) {
        setSessionId(existing.id);
      } else {
        const { data: newSession, error: insertError } = await supabase
          .from("daily_sessions")
          .insert({ session_date: today })
          .select()
          .single();

        if (insertError) {
          console.error("Error creating session:", insertError.message);
          return;
        }

        setSessionId(newSession.id);
        setSessions([newSession, ...data]);
      }
    };

    loadSessions();
  }, []);

  // Load recent scans for selected session
  useEffect(() => {
    const fetchScans = async () => {
      if (!sessionId) return;
      const { data, error } = await supabase
        .from("scans")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) {
        console.error("Error fetching scans:", error.message);
        return;
      }

      setScans(data || []);
    };

    fetchScans();
  }, [sessionId]);

  const handleScan = async () => {
    if (!sku || !sessionId) return;

    const { error } = await supabase.from("scans").insert([
      {
        sku,
        mode,
        scanned_by: user,
        session_id: sessionId,
      },
    ]);

    if (error) {
      console.error("Scan failed:", error.message);
      return;
    }

    setSku("");
    const { data: updatedScans } = await supabase
      .from("scans")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false })
      .limit(10);

    setScans(updatedScans || []);
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>📦 Barcode Scanner</h2>

      <div style={{ marginBottom: "10px" }}>
        <input
          type="text"
          placeholder="Enter SKU or scan"
          value={sku}
          onChange={(e) => setSku(e.target.value)}
        />
        <select value={user} onChange={(e) => setUser(e.target.value)}>
          <option value="Andrew">Andrew</option>
          {/* Add more users if needed */}
        </select>
        <select
          value={sessionId || ""}
          onChange={(e) => setSessionId(e.target.value)}
        >
          {sessions.map((s) => (
            <option key={s.id} value={s.id}>
              Session {s.session_date}
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: "10px" }}>
        <strong>Mode:</strong>{" "}
        <button
          onClick={() => setMode("IN")}
          style={{ backgroundColor: mode === "IN" ? "lightgreen" : "" }}
        >
          IN
        </button>{" "}
        <button
          onClick={() => setMode("OUT")}
          style={{ backgroundColor: mode === "OUT" ? "salmon" : "" }}
        >
          OUT
        </button>
      </div>

      <button onClick={handleScan}>Scan</button>

      <div style={{ marginTop: "20px" }}>
        <h4>Last 10 Scans</h4>
        <ul>
          {scans.map((s, i) => (
            <li key={i}>
              #{s.sku} — <strong>{s.mode}</strong> @{" "}
              {new Date(s.created_at).toLocaleString()}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default ScanPage;
