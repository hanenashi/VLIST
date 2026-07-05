import crypto from 'crypto';

export function hashPin(pin) {
  return crypto.createHash('sha256').update(String(pin)).digest('hex');
}

export function parsePrice(value) {
  const raw = (value ?? '').toString().trim();
  if (!raw) return null;

  const num = Number(raw.replace(',', '.'));
  if (Number.isNaN(num)) return undefined;
  return num;
}

export async function verifyOwnerPin(sql, token, pin) {
  const lists = await sql`
    SELECT id, pin_hash
    FROM wishlist
    WHERE admin_token = ${token}
    LIMIT 1;
  `;

  if (!lists || lists.length === 0) {
    return { ok: false, status: 404, error: 'not_found' };
  }

  const list = lists[0];
  if (!list.pin_hash || hashPin(pin) !== list.pin_hash) {
    return { ok: false, status: 403, error: 'invalid_pin' };
  }

  return { ok: true, list };
}

export function readJsonBody(req) {
  return typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
}
