import React, { useState } from 'react';

console.log("🔁 ManualSync.tsx mounted");

const ManualSync = () => {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const triggerSync = async () => {
    setStatus('loading');
    try {
      const res = await fetch('/api/trigger-sync', {
        method: 'POST',
      });

      if (res.ok) {
        setStatus('success');
      } else {
        throw new Error('Failed to trigger sync');
      }
    } catch (err) {
      console.error('[ManualSync] API call failed:', err);
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
