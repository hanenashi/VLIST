// api/wishlist.js – wishlists + items (no secrets)
import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  if (!process.env.DATABASE_URL) {
    res.status(500).json({
      error: 'missing_database_url',
      message: 'Env var DATABASE_URL is not set on Vercel',
    });
    return;
  }

  try {
    const sql = neon(process.env.DATABASE_URL);

    // Do NOT expose pin_hash or admin_token here.
    const wishlists = await sql`
      SELECT id, title, slug, is_public, created_at, description
      FROM wishlist
      ORDER BY created_at ASC;
    `;

    if (!wishlists || wishlists.length === 0) {
      res.status(200).json([]);
      return;
    }

    const items = await sql`
      SELECT id, wishlist_id, name, link, note, price, status, is_public, created_at
      FROM wishlist_items
      WHERE is_public = true
      ORDER BY created_at ASC;
    `;

    const withItems = wishlists.map(list => {
      const listItems = items.filter(it => it.wishlist_id === list.id);
      return { ...list, items: listItems };
    });

    res.status(200).json(withItems);
  } catch (err) {
    res.status(500).json({
      error: 'db_error',
      message: err.message,
      stack: err.stack,
    });
  }
}
