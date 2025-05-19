import React, { useState, useEffect } from 'react';

const ManualSync = () => {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  useEffect(() => {
    console.log("🧩 ManualSync.tsx mounted");
  }, []);

  const triggerSync = async () => {
    console.log("🚀 Manual Sync button clicked");
    setStatus('loading');

    try {
      console.log("🟡 FETCH attempt to /api/trigger-sync");

      const res = await fetch('/api/trigger-sync', {
        method: 'POST',
      });

      console.log("📡 Response status:", res.status);
      const text = await res.text();
      console.log("📦 Raw response body:", text);

      if (res.ok) {
        setStatus('success');
      } else {
        throw new Error('Failed to trigger sync');
      }
    } catch (err) {
      console.error('❌ Manual Sync failed:', err);
      setStatus('error');
    }
  };

  return (
    <div style={{ marginTop: 16 }}>
      <button onClick={triggerSync} disabled={status === 'loading'}>
        {status === 'loading' ? 'Syncing...' : 'Manual Inventory Sync'}
      </button>
      {status === 'success' && <p>✅ Sync triggered successfully</p>}
      {status === 'error' && <p>❌ Failed to trigger sync</p>}
    </div>
  );
};

export default ManualSync;
