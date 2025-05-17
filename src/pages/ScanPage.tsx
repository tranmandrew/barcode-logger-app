<<<<<<< HEAD
import React, { useEffect, useState } from 'react';
import { supabase } from "@/lib/supabase";
import { format } from 'date-fns';

const ScanPage = () => {
  const [sku, setSku] = useState('');
  const [mode, setMode] = useState<'IN' | 'OUT'>('IN');
  const [scans, setScans] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSession, setSelectedSession] = useState<string>('');
  const [itemImageUrl, setItemImageUrl] = useState<string | null>(null);

  useEffect(() => {
    // Fetch users
    supabase.from('scanner_users').select('*').then(({ data }) => {
      if (data) {
        setUsers(data);
        if (data.length > 0) setSelectedUser(data[0].id);
      }
    });

    // Fetch sessions
    const today = new Date().toISOString().split('T')[0];
    supabase
      .from('daily_sessions')
      .select('*')
      .gte('date', today)
      .order('date', { ascending: false })
      .then(({ data }) => {
        if (data && data.length > 0) setSelectedSession(data[0].id);
      });
  }, []);

  useEffect(() => {
    if (selectedSession) {
      supabase
        .from('scan_logs')
        .select('*')
        .eq('session_id', selectedSession)
        .order('timestamp', { ascending: false })
        .limit(10)
        .then(({ data }) => {
          if (data) setScans(data);
        });
    }
  }, [selectedSession]);

  const handleScan = async () => {
    if (!sku || !selectedUser || !selectedSession) return;

    const { data: items } = await supabase
      .from('items')
      .select('id,image_url')
      .ilike('barcode', `%${sku}%`)
      .limit(1);

    const item = items?.[0];

    if (item?.image_url) setItemImageUrl(item.image_url);
    else setItemImageUrl(null);

    await supabase.from('scan_logs').insert([
      {
        item_id: item?.id ?? null,
        raw_sku: sku,
        direction: mode,
        session_id: selectedSession,
        scanned_by: selectedUser,
      },
    ]);

    setSku('');
    setTimeout(() => {
      supabase
        .from('scan_logs')
        .select('*')
        .eq('session_id', selectedSession)
        .order('timestamp', { ascending: false })
        .limit(10)
        .then(({ data }) => {
          if (data) setScans(data);
        });
    }, 300);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', padding: '2rem' }}>
      <div style={{ flex: 1 }}>
        <h3>📦 Barcode Scanner</h3>
        <div>
          <input
            placeholder="Enter SKU or scan"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
          />
          <select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)}>
            {users.map((user: any) => (
              <option key={user.id} value={user.id}>{user.name}</option>
            ))}
          </select>
          <select value={selectedSession} onChange={(e) => setSelectedSession(e.target.value)}>
            {sessions.map((s: any) => (
              <option key={s.id} value={s.id}>
                Session {s.date}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginTop: '1rem' }}>
          <strong>Mode:</strong>{' '}
          <button onClick={() => setMode('IN')} style={{ background: mode === 'IN' ? 'green' : '' }}>IN</button>
          <button onClick={() => setMode('OUT')} style={{ background: mode === 'OUT' ? 'red' : '' }}>OUT</button>
        </div>

        <button style={{ marginTop: '1rem' }} onClick={handleScan}>Scan</button>

        <div style={{ marginTop: '1rem' }}>
          <button>Check Overdue Now</button>
          <button>Download CSV</button>
          <button>Print</button>
          <button>Dashboard</button>
          <button>Manual Sync</button>
        </div>

        <div style={{ marginTop: '2rem' }}>
          <strong>Last 10 Scans</strong>
          <ul>
            {scans.map((s, idx) => (
              <li key={idx}>
                #{s.raw_sku} — <span style={{ color: s.direction === 'IN' ? 'green' : 'red' }}>{s.direction}</span> @{' '}
                {format(new Date(s.timestamp), 'Pp')}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Image preview on the right */}
      {itemImageUrl && (
        <div style={{ marginLeft: '2rem' }}>
          <img src={itemImageUrl} alt="Item Preview" style={{ maxWidth: '300px', borderRadius: '8px' }} />
        </div>
      )}
    </div>
  );
};

export default ScanPage;
=======
import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'

type ScanLog = {
  timestamp: string
  direction: 'IN' | 'OUT'
  raw_sku: string
  items?: {
    name: string | null
    image_url: string | null
  }
}

export default function ScanPage() {
  const [scans, setScans] = useState<ScanLog[]>([])
  const [itemImageUrl, setItemImageUrl] = useState<string | null>(null)
  const [latestItemName, setLatestItemName] = useState<string | null>(null)

  const fetchRecentScans = async () => {
    const { data, error } = await supabase
      .from('scan_logs')
      .select('timestamp, direction, raw_sku, items(name, image_url)')
      .order('timestamp', { ascending: false })
      .limit(10)

    if (error) {
      console.error('Error fetching scans:', error)
      return
    }

    setScans(data || [])

    // Set preview to most recent scan's item (if available)
    if (data && data.length > 0 && data[0].items?.image_url) {
      setItemImageUrl(data[0].items.image_url)
      setLatestItemName(data[0].items.name || null)
    } else {
      setItemImageUrl(null)
      setLatestItemName(null)
    }
  }

  useEffect(() => {
    fetchRecentScans()
  }, [])

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      {/* Scan List */}
      <div style={{ flex: 1 }}>
        <h2>Last 10 Scans</h2>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {scans.map((s, idx) => (
            <li
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '0.5rem',
              }}
            >
              {s.items?.image_url && (
                <img
                  src={s.items.image_url}
                  alt={s.items.name || 'Item image'}
                  style={{
                    width: '40px',
                    height: '40px',
                    objectFit: 'cover',
                    marginRight: '10px',
                    borderRadius: '4px',
                  }}
                />
              )}
              <span>
                {s.items?.name || s.raw_sku} —{' '}
                <span
                  style={{
                    color: s.direction === 'IN' ? 'green' : 'red',
                    fontWeight: 500,
                  }}
                >
                  {s.direction}
                </span>{' '}
                @ {format(new Date(s.timestamp), 'Pp')}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Preview Panel */}
      {itemImageUrl && (
        <div
          style={{
            marginLeft: '2rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            maxWidth: '300px',
          }}
        >
          <img
            src={itemImageUrl}
            alt="Item Preview"
            style={{ maxWidth: '100%', borderRadius: '8px', marginBottom: '1rem' }}
          />
          {latestItemName && <h4>{latestItemName}</h4>}
        </div>
      )}
    </div>
  )
}
>>>>>>> 7c2ce60 (Fix: Render item image next to name on ScanPage and add supabase client)
