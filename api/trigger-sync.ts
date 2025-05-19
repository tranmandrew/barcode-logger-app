export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    console.log('[Sync API] ❌ Invalid method:', req.method);
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const githubUrl = 'https://api.github.com/repos/tranmandrew/barcode-logger-app/actions/workflows/sync-sellbrite.yml/dispatches';
  const token = process.env.GITHUB_PAT;

  if (!token) {
    console.error('[Sync API] ❌ Missing GitHub PAT');
    return res.status(500).json({ message: 'GitHub token not found in environment variables' });
  }

  const payload = { ref: 'main' };

  try {
    console.log('[Sync API] 🚀 Sending dispatch to GitHub...');
    const ghResponse = await fetch(githubUrl, {
      method: 'POST',
      headers: {
        'Authorization': `token ${token}`, // ✅ must be "token" not "Bearer"
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify(payload),
    });

    const responseText = await ghResponse.text();

    console.log('[Sync API] 📡 GitHub Status:', ghResponse.status);
    console.log('[Sync API] 📦 GitHub Response:', responseText);

    if (ghResponse.ok) {
      return res.status(200).json({ message: '✅ Sync triggered successfully' });
    } else {
      return res.status(500).json({
        message: '❌ GitHub dispatch failed',
        status: ghResponse.status,
        response: responseText,
      });
    }
  } catch (err: any) {
    console.error('[Sync API] 💥 Unexpected error:', err.message || err);
    return res.status(500).json({ message: 'Server error', error: err.message || err });
  }
}
console.log("🔐 GITHUB_PAT present:", !!process.env.GITHUB_PAT, "Length:", process.env.GITHUB_PAT?.length);
