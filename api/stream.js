const { localize, ORIGIN } = require('./_proxy');

module.exports = async (req, res) => {
  const url = new URL(req.url, `https://${req.headers.host}`);
  const own = `https://${req.headers.host}`;

  try {
    const response = await fetch(`${ORIGIN()}/api/stream${url.search}`, {
      headers: { 'user-agent': 'Mozilla/5.0', origin: ORIGIN(), referer: ORIGIN() + '/' },
    });
    const data = await response.json();

    if (data && data.success && data.data) {
      const d = data.data;
      // Route playback through our own domain
      d.url = localize(d.url, own);
      if (d.drmDetails) {
        // license requests go through /api/drm/license on our side
        d.drmDetails.licenseUrl = d.drmDetails.licenseUrl;
      } else {
        d.drmDetails = null;
      }
      if (d.licenseDead === undefined) d.licenseDead = false;
    }

    res.status(response.status).json(data);
  } catch (err) {
    res.status(502).json({ success: false, error: err.message || 'Stream failed' });
  }
};
