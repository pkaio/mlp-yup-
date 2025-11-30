# Guia de Execução da Migration - Sistema de Sofisticação

## ⚠️ Importante
A migration precisa ser executada no banco de dados para ativar o sistema de interface adaptativa.

---

## Opção 1: Via Script Node.js (Recomendado)

Se você tem acesso ao ambiente onde o backend roda (e consegue conectar ao RDS):

```bash
cd backend
node scripts/runMigration.js ../database/migrations/20251030_add_sophistication_level.sql
```

**Pré-requisitos:**
- Node.js instalado
- Arquivo `.env` configurado corretamente
- Acesso de rede ao RDS

---

## Opção 2: Via psql Diretamente

Se você tem o cliente PostgreSQL instalado:

```bash
PGPASSWORD='kopWoh-nuxhos-6rygti' psql \
  -h yup-db.cfgucqocylbg.us-east-2.rds.amazonaws.com \
  -U postgres \
  -d postgres \
  -p 5432 \
  -f database/migrations/20251030_add_sophistication_level.sql
```

---

## Opção 3: Copiar e Colar no pgAdmin/DBeaver

Se você usa uma ferramenta GUI como pgAdmin ou DBeaver:

1. Conecte-se ao banco de dados `postgres` no RDS
2. Abra uma nova query window
3. Copie e cole o conteúdo do arquivo:
   `database/migrations/20251030_add_sophistication_level.sql`
4. Execute a query

### SQL da Migration:

```sql
-- Migration: Adicionar sistema de detecção de sofisticação do usuário
-- Data: 2025-10-30
-- Descrição: Adiciona coluna sophistication_level para controlar interface adaptativa

-- Adicionar coluna sophistication_level na tabela users
ALTER TABLE users
ADD COLUMN IF NOT EXISTS sophistication_level VARCHAR(20) DEFAULT 'BEGINNER' CHECK (sophistication_level IN ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'PRO'));

-- Criar índice para otimizar consultas por nível de sofisticação
CREATE INDEX IF NOT EXISTS idx_users_sophistication_level ON users(sophistication_level);

-- Comentários para documentação
COMMENT ON COLUMN users.sophistication_level IS 'Nível de sofisticação do usuário calculado baseado em atividade: BEGINNER, INTERMEDIATE, ADVANCED, PRO';

-- Atualizar usuários existentes (opcional - será calculado dinamicamente)
-- Por padrão, todos começam como BEGINNER
UPDATE users SET sophistication_level = 'BEGINNER' WHERE sophistication_level IS NULL;
```

---

## Opção 4: Via Tunnel SSH (Se RDS está em VPC privada)

Se o RDS está em uma VPC privada e você tem acesso via bastion/jump host:

```bash
# 1. Criar tunnel SSH
ssh -i sua-chave.pem -L 5433:yup-db.cfgucqocylbg.us-east-2.rds.amazonaws.com:5432 ec2-user@seu-bastion-ip

# 2. Em outro terminal, conectar via localhost
PGPASSWORD='kopWoh-nuxhos-6rygti' psql \
  -h localhost \
  -U postgres \
  -d postgres \
  -p 5433 \
  -f database/migrations/20251030_add_sophistication_level.sql
```

---

## Verificar se a Migration Funcionou

Após executar, verifique se a coluna foi criada:

```sql
-- Verificar estrutura da tabela
\d users

-- Ou via query
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'sophistication_level';

-- Verificar índice
SELECT indexname FROM pg_indexes WHERE tablename = 'users' AND indexname = 'idx_users_sophistication_level';

-- Ver usuários e seus níveis
SELECT id, username, sophistication_level FROM users LIMIT 10;
```

**Resultado esperado:**
- Coluna `sophistication_level` tipo VARCHAR(20)
- Default: 'BEGINNER'
- Índice `idx_users_sophistication_level` criado
- Todos os usuários existentes com `sophistication_level = 'BEGINNER'`

---

## O Que Acontece Após a Migration?

✅ **Automático:**
- Novos usuários: começam como BEGINNER
- Sistema calcula nível baseado em atividade
- Atualização automática após cada upload de vídeo
- API endpoints `/users/:id/sophistication` funcionando

✅ **Na Interface Mobile:**
- ProfileScreen adapta automaticamente
- BEGINNER: UI simplificada
- INTERMEDIATE+: UI completa com opção de detalhes

---

## Troubleshooting

### Erro: "column already exists"
✅ **Normal!** A migration usa `ADD COLUMN IF NOT EXISTS`, então é seguro rodar múltiplas vezes.

### Erro: "permission denied"
❌ Usuário não tem permissão ALTER TABLE. Use um usuário com privilégios adequados.

### Timeout de conexão
❌ RDS não está acessível da sua rede. Verifique:
- Security Groups do RDS permitem sua IP
- VPC/Subnet configuration
- Use Opção 4 (SSH Tunnel) se necessário

---

## Rollback (Se necessário)

Para reverter a migration:

```sql
-- Remover índice
DROP INDEX IF EXISTS idx_users_sophistication_level;

-- Remover coluna
ALTER TABLE users DROP COLUMN IF EXISTS sophistication_level;
```

⚠️ **Cuidado:** Isso remove a funcionalidade de interface adaptativa!

---

## Contato de Suporte

Se encontrar problemas, forneça:
- Mensagem de erro completa
- Método usado (Opção 1, 2, 3 ou 4)
- Output do comando `\d users` (se possível)

---

**Status Atual:** Migration criada e pronta para ser executada ✅
**Arquivo:** `database/migrations/20251030_add_sophistication_level.sql`
**Impacto:** Zero downtime, coluna tem default e permite NULL temporariamente
