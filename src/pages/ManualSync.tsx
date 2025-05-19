import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const ManualSync = () => {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const navigate = useNavigate();

  useEffect(() => {
    console.log("🧩 ManualSync.tsx mounted");
  }, []);

  const triggerSync = async (e?: React.MouseEvent<HTMLButtonElement>) => {
    e?.preventDefault();
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
        setTimeout(() => navigate('/scan'), 3000); // Auto-redirect after 3 seconds
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
      <button
        type="button"
        onClick={triggerSync}
        disabled={status === 'loading'}
      >
        {status === 'loading' ? 'Syncing...' : 'Manual Inventory Sync'}
      </button>

      {status === 'success' && <p>✅ Sync triggered successfully. Redirecting to scanner...</p>}
      {status === 'error' && <p>❌ Failed to trigger sync</p>}
    </div>
  );
};

export default ManualSync;
