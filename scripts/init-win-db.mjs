import pg from 'pg';

async function main() {
  const client = new pg.Client({
    host: '127.0.0.1',
    port: 5432,
    user: 'postgres',
    database: 'postgres'
  });

  await client.connect();
  console.log('Connected to PostgreSQL successfully.');

  // Ensure role postgres has password postgres
  await client.query("ALTER ROLE postgres WITH PASSWORD 'postgres';");

  // Ensure role preone exists
  const roleRes = await client.query("SELECT 1 FROM pg_roles WHERE rolname = 'preone'");
  if (roleRes.rowCount === 0) {
    await client.query("CREATE ROLE preone LOGIN PASSWORD 'preone' SUPERUSER CREATEDB;");
    console.log("Role 'preone' created.");
  } else {
    await client.query("ALTER ROLE preone WITH LOGIN PASSWORD 'preone' SUPERUSER CREATEDB;");
    console.log("Role 'preone' updated.");
  }

  // Ensure database preone exists
  const dbRes = await client.query("SELECT 1 FROM pg_database WHERE datname = 'preone'");
  if (dbRes.rowCount === 0) {
    await client.query("CREATE DATABASE preone OWNER preone;");
    console.log("Database 'preone' created.");
  }

  await client.query("GRANT ALL PRIVILEGES ON DATABASE preone TO preone;");
  await client.end();
  console.log('Database initialization complete.');
}

main().catch(err => {
  console.error('Init failed:', err);
  process.exit(1);
});

