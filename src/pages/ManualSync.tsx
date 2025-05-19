import React, { useState, useEffect } from 'react';

const ManualSync = () => {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  // 🔍 Confirm component is mounted
  useEffect(() => {
    console.log("🧩 ManualSync.tsx mounted");
  }, []);

  const triggerSync = async () => {
    console.log("🚀 Manual Sync button clicked");
    setStatus('loading');

    try {
      const res = await fetch('/api/trigger-sync', {
        method: 'POST',
      });

      console.log("📡 Response status:", res.status);

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
