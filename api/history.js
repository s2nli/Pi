const { Redis } = require('@upstash/redis');

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const getUid = (req) => {
  const cookieStr = req.headers.cookie || '';
  const match = cookieStr.match(/pi_pro_user_id=([^;]+)/);
  return match ? match[1] : (Math.random().toString(36).substring(2) + Date.now().toString(36));
};

const setUidCookie = (res, uid) => {
  res.setHeader('Set-Cookie', `pi_pro_user_id=${uid}; Path=/; Max-Age=31536000; HttpOnly; SameSite=Lax`);
};

module.exports = async (req, res) => {
  let uid = getUid(req);
  setUidCookie(res, uid);
  const key = `history:${uid}`;

  try {
    if (req.method === 'GET') {
      const raw = await redis.hgetall(key);
      const list = Object.values(raw || {}).map(v => typeof v === 'string' ? JSON.parse(v) : v);
      list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      return res.status(200).json({ success: true, data: list });
    }

    if (req.method === 'POST') {
      const body = req.body;
      if (!body || !body.videoId) {
        return res.status(400).json({ success: false, error: 'Missing videoId' });
      }
      const item = { ...body, updatedAt: new Date().toISOString() };
      await redis.hset(key, { [body.videoId]: JSON.stringify(item) });
      return res.status(200).json({ success: true, data: { success: true } });
    }

    if (req.method === 'DELETE') {
      const url = new URL(req.url, `https://${req.headers.host}`);
      const videoId = url.searchParams.get('videoId');
      if (videoId) {
        await redis.hdel(key, videoId);
      } else {
        await redis.del(key);
      }
      return res.status(200).json({ success: true, data: { success: true } });
    }

    res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
    res.status(405).json({ success: false, error: 'Method Not Allowed' });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
