const path = require('path');
const fs = require('fs');
const { Client } = require('pg');
const dotenv = require('dotenv');

// Load environment variables
const envPath = path.resolve(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

// Get migration file from command line
const migrationFile = process.argv[2];

if (!migrationFile) {
  console.error('❌ Uso: node scripts/runMigration.js <caminho-do-arquivo-sql>');
  console.error('Exemplo: node scripts/runMigration.js ../database/migrations/20251030_add_sophistication_level.sql');
  process.exit(1);
}

const absolutePath = path.resolve(migrationFile);

if (!fs.existsSync(absolutePath)) {
  console.error('❌ Arquivo não encontrado: ' + absolutePath);
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

// Configure SSL for RDS
if (config.connectionString) {
  const shouldUseSsl = DB_SSL !== 'false';
  if (shouldUseSsl) {
    config.ssl = { rejectUnauthorized: false };
  }
} else if (DB_SSL !== 'false') {
  config.ssl = { rejectUnauthorized: false };
}

const main = async () => {
  const sql = fs.readFileSync(absolutePath, 'utf-8');
  const client = new Client(config);

  console.log('📁 Lendo migration: ' + path.basename(absolutePath));
  console.log('🔗 Conectando ao banco: ' + (config.user || 'user') + '@' + (config.host || 'DATABASE_URL'));
  if (config.ssl) {
    console.log('🔒 SSL habilitado');
  }
  console.log('');

  try {
    await client.connect();
    console.log('✅ Conexão estabelecida');
    console.log('🚀 Executando migration...\n');

    await client.query(sql);

    console.log('✅ Migration executada com sucesso!');
    console.log('');
    console.log('💡 Dica: Verifique com:');
    console.log("   SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'sophistication_level';");
  } catch (error) {
    console.error('❌ Erro ao executar migration:', error.message);
    if (error.code) {
      console.error('   Código do erro: ' + error.code);
    }
    process.exitCode = 1;
  } finally {
    await client.end().catch(() => undefined);
  }
};

main();
