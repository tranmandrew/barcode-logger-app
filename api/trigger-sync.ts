export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    console.log('[Sync API] ❌ Invalid method:', req.method);
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    console.log('[Sync API] 🚀 Triggering GitHub workflow...');

    const response = await fetch(
      'https://api.github.com/repos/tranmandrew/barcode-logger-app/actions/workflows/sync-sellbrite.yml/dispatches',
      {
        method: 'POST',
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${process.env.GITHUB_PAT}`,
          'X-GitHub-Api-Version': '2022-11-28',
          'Content-Type': 'application/json'  // ✅ required for proper dispatch
        },
        body: JSON.stringify({ ref: 'main' })
      }
    );

    const result = await response.text();
    console.log('[Sync API] 📡 GitHub Status:', response.status);
    console.log('[Sync API] 📦 GitHub Response:', result);

    if (response.ok) {
      return res.status(200).json({ message: 'Sync triggered successfully' });
    } else {
      return res.status(500).json({
        message: 'GitHub sync failed',
        status: response.status,
        response: result
      });
    }
  } catch (err: any) {
    console.error('[Sync API] 💥 Error triggering sync:', err.message || err);
    return res.status(500).json({
      message: 'Server error',
      error: err.message || err
    });
  }
}
