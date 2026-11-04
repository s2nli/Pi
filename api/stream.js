module.exports = async (req, res) => {
  const origin = process.env.UPSTREAM_ORIGIN || 'https://pi-pro.space-z.ai';
  const url = new URL(req.url, `https://${req.headers.host}`);
  
  const upstreamUrl = `${origin}/api/stream${url.search}`;

  try {
    const response = await fetch(upstreamUrl);
    const data = await response.json();

    // Ensure fields exist for frontend
    if (data && data.success && data.data) {
      if (!data.data.drmDetails) data.data.drmDetails = null;
      if (data.data.licenseDead === undefined) data.data.licenseDead = false;
    }
    
    res.status(response.status).json(data);
  } catch (err) {
    res.status(502).json({ success: false, error: err.message || 'Stream failed' });
  }
};
