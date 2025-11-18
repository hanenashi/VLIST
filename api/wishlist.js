// api/wishlist.js – with Neon, but loud errors
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

  if (!process.env.DATABASE_URL) {
    res.status(500).json({
      error: 'missing_database_url',
      message: 'Env var DATABASE_URL is not set on Vercel',
    });
    return;
  }

  try {
    const sql = neon(process.env.DATABASE_URL);

    const rows = await sql`
      SELECT *
      FROM wishlist
      ORDER BY created_at ASC;
    `;

    res.status(200).json(rows);
  } catch (err) {
    // For now, be noisy so we see the exact failure
    res.status(500).json({
      error: 'db_error',
      message: err.message,
      // comment stack out later when you go public
      stack: err.stack,
    });
  }
}
