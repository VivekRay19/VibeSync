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

  const migrationsDir = path.join(__dirname, '../neon/migrations');
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  console.log(`Found ${files.length} migration file(s): ${files.join(', ')}`);

  for (const file of files) {
    console.log(`\nExecuting migration: ${file}...`);
    const migrationSql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');

    // Strip single-line comments (-- ...) and split by semicolon
    const strippedSql = migrationSql.replace(/--.*$/gm, '');
    const statements = strippedSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const statement of statements) {
      await sql.query(statement);
    }
    console.log(`✓ Migration ${file} applied successfully.`);
  }

  console.log('\nVerifying tables in public schema...');
  const tables = await sql`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
    ORDER BY table_name
  `;

  console.log('Public tables:', tables.map(t => t.table_name));
  console.log('\nAll migrations applied successfully!');
}

runMigrations().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
