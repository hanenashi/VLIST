// api/wishlist.js
import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  try {
    const { rows } = await sql`
      SELECT *
      FROM wishlist
      ORDER BY created_at ASC;
    `;

    res.status(200).json(rows);
  } catch (err) {
    console.error("DB ERROR:", err);
    res.status(500).json({
      error: "db_error",
      message: err.message
    });
  }
}
