import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
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
