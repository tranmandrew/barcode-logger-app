import React, { useState } from 'react';

const ManualSync = () => {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const triggerSync = async () => {
    setStatus('loading');
    try {
      const res = await fetch('https://api.github.com/repos/tranmandrew/barcode-logger-app/actions/workflows/sync-sellbrite.yml/dispatches', {
        method: 'POST',
        headers: {
          'Accept': 'application/vnd.github+json',
          'Authorization': `Bearer ${process.env.REACT_APP_GITHUB_PAT}`,
          'X-GitHub-Api-Version': '2022-11-28',
        },
        body: JSON.stringify({
          ref: 'master'
        })
      });

      if (res.ok) {
        setStatus('success');
      } else {
        throw new Error('Failed to trigger workflow');
      }
    } catch (err) {
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
