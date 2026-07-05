import crypto from 'crypto';

function safeEqual(a, b) {
  const left = Buffer.from(String(a || ''));
  const right = Buffer.from(String(b || ''));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export function requireAdmin(req, res) {
  const expected = process.env.VLIST_ADMIN_SECRET;
  if (!expected) {
    res.status(500).json({ error: 'missing_admin_secret' });
    return false;
  }

  const auth = req.headers.authorization || req.headers.Authorization || '';
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  const headerSecret = req.headers['x-admin-secret'] || req.headers['X-Admin-Secret'] || '';
  const provided = bearer || headerSecret;

  if (!safeEqual(provided, expected)) {
    res.status(401).json({ error: 'unauthorized' });
    return false;
  }

  return true;
}
