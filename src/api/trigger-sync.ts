export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const response = await fetch(
    'https://api.github.com/repos/tranmandrew/barcode-logger-app/actions/workflows/sync-sellbrite.yml/dispatches',
    {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${process.env.GITHUB_PAT}`,
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({ ref: 'master' }),
    }
  );

  if (response.ok) {
    res.status(200).json({ message: 'Sync triggered successfully' });
  } else {
    const errorText = await response.text();
    res.status(500).json({ message: 'Failed to trigger sync', error: errorText });
  }
}
