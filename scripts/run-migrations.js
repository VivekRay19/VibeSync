const fs = require('fs');
const path = require('path');
const { neon } = require('@neondatabase/serverless');

async function runMigrations() {
  const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL or DATABASE_URL_UNPOOLED is required');
  }

  console.log('Connecting to Neon database for schema migration...');
  const sql = neon(connectionString);

  const migrationFile = path.join(__dirname, '../neon/migrations/001_vibesync_schema.sql');
  const migrationSql = fs.readFileSync(migrationFile, 'utf8');

  // Strip single-line comments (-- ...) and split by semicolon
  const strippedSql = migrationSql.replace(/--.*$/gm, '');
  const statements = strippedSql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  console.log(`Executing ${statements.length} migration statements...`);
  for (const statement of statements) {
    await sql.query(statement);
  }

  console.log('Verifying created tables in public schema...');
  const tables = await sql`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
    ORDER BY table_name
  `;

  console.log('Public tables created:', tables.map(t => t.table_name));
  console.log('Migration applied successfully!');
}

runMigrations().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
