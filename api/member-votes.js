export default async function handler(req, res) {
  try {
    const id = String(req.query.id || '').trim();
    const q = String(req.query.q || '').trim();

    if (!/^\d+$/.test(id)) {
      return res.status(400).json({ error: 'A valid numeric MEP ID is required.' });
    }

    const params = new URLSearchParams({
      page_size: '50',
      sort_by: 'date',
      sort_order: 'desc'
    });

    if (q) params.set('q', q);

    const url = `https://howtheyvote.eu/api/members/${encodeURIComponent(id)}/votes?${params.toString()}`;

    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'MEP-Vote-Tracker/1.0'
      }
    });

    const text = await response.text();

    res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=3600');
    res.status(response.status);

    const contentType = response.headers.get('content-type');
    if (contentType) res.setHeader('Content-Type', contentType);

    return res.send(text);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Unable to retrieve MEP voting history.' });
  }
}
