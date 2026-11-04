module.exports = async (req, res) => {
  const origin = process.env.UPSTREAM_ORIGIN || 'https://pi-pro.space-z.ai';
  const url = new URL(req.url, `https://${req.headers.host}`);
  
  // Pass the exact query string (kind, id, q, cat, etc.)
  const upstreamUrl = `${origin}/api/content${url.search}`;

  try {
    const response = await fetch(upstreamUrl);
    const data = await response.json();
    // Return upstream as-is (already { success, data })
    res.status(response.status).json(data);
  } catch (err) {
    res.status(502).json({ success: false, error: err.message || 'Proxy failed' });
  }
};
