const TERM_START = '2024-07-16';
const PAGE_SIZE = 200;
const MAX_PAGES = 20;

async function fetchVotePage(id, q, page) {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(PAGE_SIZE),
    sort_by: 'date',
    sort_order: 'desc',
    'date[gte]': TERM_START
  });

  if (q) params.set('q', q);

  const url = `https://howtheyvote.eu/api/members/${encodeURIComponent(id)}/votes?${params.toString()}`;

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'MEP-Vote-Tracker/1.0'
    }
  });

  if (!response.ok) {
    const text = await response.text();
    const error = new Error(`HowTheyVote request failed: ${response.status}`);
    error.status = response.status;
    error.body = text;
    throw error;
  }

  return response.json();
}

export default async function handler(req, res) {
  try {
    const id = String(req.query.id || '').trim();
    const q = String(req.query.q || '').trim();

    if (!/^\d+$/.test(id)) {
      return res.status(400).json({ error: 'A valid numeric MEP ID is required.' });
    }

    const firstPage = await fetchVotePage(id, q, 1);
    const allResults = Array.isArray(firstPage.results) ? [...firstPage.results] : [];

    const reportedTotal = Number(firstPage.total);
    const estimatedPages = Number.isFinite(reportedTotal) && reportedTotal > 0
      ? Math.ceil(reportedTotal / PAGE_SIZE)
      : (firstPage.has_next ? 2 : 1);

    const finalPage = Math.min(Math.max(estimatedPages, 1), MAX_PAGES);

    // Fetch the remaining pages in small batches so the full current-term history
    // is available without making the browser perform dozens of separate requests.
    for (let startPage = 2; startPage <= finalPage; startPage += 4) {
      const pages = [];
      for (let page = startPage; page < startPage + 4 && page <= finalPage; page += 1) {
        pages.push(fetchVotePage(id, q, page));
      }

      const responses = await Promise.all(pages);
      for (const pageData of responses) {
        if (Array.isArray(pageData.results)) allResults.push(...pageData.results);
      }
    }

    // Remove any duplicates that may occur around page boundaries as the source updates.
    const unique = new Map();
    for (const vote of allResults) {
      const key = vote && vote.id != null ? String(vote.id) : JSON.stringify(vote);
      if (!unique.has(key)) unique.set(key, vote);
    }

    const results = [...unique.values()].sort((a, b) => {
      const aDate = new Date(a?.timestamp || 0).getTime();
      const bDate = new Date(b?.timestamp || 0).getTime();
      return bDate - aDate;
    });

    res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=3600');
    return res.status(200).json({
      ...firstPage,
      results,
      total: Number.isFinite(reportedTotal) ? reportedTotal : results.length,
      page: 1,
      page_size: results.length,
      has_prev: false,
      has_next: Number.isFinite(reportedTotal) ? results.length < reportedTotal : false,
      term_start: TERM_START,
      pages_fetched: finalPage
    });
  } catch (error) {
    console.error(error);
    return res.status(error?.status || 500).json({
      error: 'Unable to retrieve MEP voting history.'
    });
  }
}
