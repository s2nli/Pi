// Generic catch-all: /api/proxy/<anything> and any other upstream media path
const { forward } = require('./_proxy');
module.exports = (req, res) => {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    return res.status(204).end();
  }
  // vercel rewrite passes original path in x-original-path via ?__p=
  const url = new URL(req.url, `https://${req.headers.host}`);
  const p = url.searchParams.get('__p') || url.pathname;
  url.searchParams.delete('__p');
  req.url = url.pathname + (url.searchParams.toString() ? '?' + url.searchParams.toString() : '');
  return forward(req, res, p);
};
