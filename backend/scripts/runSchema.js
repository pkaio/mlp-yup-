const path = require('path');
const fs = require('fs');
const { Client } = require('pg');
const dotenv = require('dotenv');

// Load environment variables if a .env file is present alongside the backend
const envPath = path.resolve(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

const schemaPath = path.resolve(__dirname, '..', '..', 'database', 'schema.sql');

if (!fs.existsSync(schemaPath)) {
  console.error(`❌ Arquivo schema.sql não encontrado em ${schemaPath}`);
  process.exit(1);
}

const {
  DATABASE_URL,
  DB_HOST,
  DB_PORT = 5432,
  DB_NAME,
  DB_USER,
  DB_PASSWORD,
  DB_SSL = 'true'
} = process.env;

const config = DATABASE_URL
  ? { connectionString: DATABASE_URL }
  : {
      host: DB_HOST,
      port: Number(DB_PORT),
      database: DB_NAME,
      user: DB_USER,
      password: DB_PASSWORD
    };

if (!config.connectionString && (!config.host || !config.user || !config.database)) {
  console.error('❌ Variáveis de banco incompletas. Defina DATABASE_URL ou DB_HOST/DB_USER/DB_NAME/DB_PASSWORD.');
  process.exit(1);
}

if (config.connectionString) {
  const shouldUseSsl = DB_SSL !== 'false';
  if (shouldUseSsl) {
    config.ssl = { rejectUnauthorized: false };
  }
} else if (DB_SSL !== 'false') {
  config.ssl = { rejectUnauthorized: false };
}

const main = async () => {
  const sql = fs.readFileSync(schemaPath, 'utf-8');
  const client = new Client(config);

  console.log('🚀 Executando schema.sql no banco configurado...');

  try {
    await client.connect();
    await client.query(sql);
    console.log('✅ Schema aplicado com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao aplicar schema:', error.message);
    process.exitCode = 1;
  } finally {
    await client.end().catch(() => undefined);
  }
};

main();
