export default async function handler(req: any, res: any) {
  console.log('[Sync API] 🔧 Handler invoked');

  if (req.method !== 'POST') {
    console.log('[Sync API] ❌ Invalid method:', req.method);
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const githubUrl = 'https://api.github.com/repos/tranmandrew/barcode-logger-app/actions/workflows/sync-sellbrite.yml/dispatches';
  const payload = { ref: 'main' };
  const token = process.env.GITHUB_PAT;

  console.log('[Sync API] 📦 Payload:', payload);
  console.log('[Sync API] 🔐 Token present:', !!token);

  try {
    const response = await fetch(githubUrl, {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        Authorization: `token ${token}`, // ← critical
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify(payload),
    });

    const result = await response.text();

    console.log('[Sync API] 📬 GitHub status:', response.status);
    console.log('[Sync API] 📬 GitHub body:', result);

    if (response.ok) {
      return res.status(200).json({ message: '✅ Sync triggered successfully' });
    } else {
      return res.status(500).json({ message: '❌ GitHub sync failed', details: result });
    }
  } catch (err: any) {
    console.error('[Sync API] 💥 Uncaught error:', err.message || err);
    return res.status(500).json({ message: 'Server error', error: err.message || err });
  }
}
