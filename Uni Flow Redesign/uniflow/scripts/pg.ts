/**
 * Local development Postgres.
 *
 * Runs a real PostgreSQL 17 server from the `embedded-postgres` binaries — no
 * Docker and no admin install required. Version 17 is pinned deliberately to
 * match the major version Supabase provisions for new projects, so that RLS,
 * triggers, deferred constraints and pg_trgm behave here exactly as they will
 * in production.
 *
 *   npm run db:start   — initialise (first run) and start, then stay resident
 *   npm run db:stop    — stop
 *   npm run db:reset   — destroy the cluster and re-create it empty
 */
import EmbeddedPostgres from 'embedded-postgres';
import { existsSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const DATA_DIR = resolve(process.cwd(), '.pgdata');
const PORT = Number(process.env.PG_PORT ?? 55432);
const USER = 'uniflow';
const PASSWORD = 'uniflow_local_dev';
const DATABASE = 'uniflow';

function server() {
  return new EmbeddedPostgres({
    databaseDir: DATA_DIR,
    user: USER,
    password: PASSWORD,
    port: PORT,
    persistent: true,
    // UTF8 is not optional. initdb otherwise inherits the Windows system
    // locale and creates a WIN1252 cluster, in which every Arabic name in
    // this system fails to insert with
    //   'character with byte sequence 0xd8 0xac ... has no equivalent'
    // C collation keeps sort order deterministic and platform-independent;
    // linguistic ordering of Arabic names is done with an explicit ICU
    // collation on the columns that need it, not by the cluster default.
    initdbFlags: ['--encoding=UTF8', '--locale=C'],
    // Deferred constraint triggers and the concurrency suite need headroom.
    postgresFlags: ['-c', 'max_connections=200'],
  });
}

async function start() {
  const pg = server();
  const fresh = !existsSync(DATA_DIR);
  if (fresh) {
    console.log('· initialising cluster at .pgdata (first run, downloads binaries)');
    await pg.initialise();
  }
  await pg.start();
  if (fresh) {
    await pg.createDatabase(DATABASE);
    console.log(`· created database "${DATABASE}"`);
  }
  console.log(`· postgres 17 listening on 127.0.0.1:${PORT}`);
  console.log(`· DATABASE_URL=postgresql://${USER}:${PASSWORD}@127.0.0.1:${PORT}/${DATABASE}`);

  const stop = async () => {
    console.log('\n· stopping postgres');
    await pg.stop();
    process.exit(0);
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
  await new Promise(() => {});
}

async function stop() {
  await server().stop();
  console.log('· stopped');
}

async function reset() {
  try {
    await server().stop();
  } catch {
    /* not running */
  }
  if (existsSync(DATA_DIR)) {
    rmSync(DATA_DIR, { recursive: true, force: true });
    console.log('· removed .pgdata');
  }
  await start();
}

const cmd = process.argv[2];
const run = cmd === 'stop' ? stop : cmd === 'reset' ? reset : start;
run().catch((e) => {
  console.error(e);
  process.exit(1);
});
