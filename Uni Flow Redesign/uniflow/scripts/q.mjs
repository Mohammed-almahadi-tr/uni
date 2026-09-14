// Ad-hoc SQL runner against the local dev database.
//   node scripts/q.mjs "select 1"
import 'dotenv/config';
import pg from 'pg';
const c = new pg.Client({ connectionString: process.env.DIRECT_URL });
await c.connect();
try {
  const r = await c.query(process.argv[2]);
  if (Array.isArray(r)) r.forEach((x) => console.table(x.rows));
  else console.table(r.rows);
} catch (e) {
  console.error('ERR:', e.message);
  process.exitCode = 1;
} finally {
  await c.end();
}
