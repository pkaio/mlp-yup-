# Ŷ'UP - Guia de Instalação

## Requisitos do Sistema

### Backend
- Node.js 16+ 
- PostgreSQL 12+
- npm ou yarn

### Mobile
- Node.js 16+
- npm ou yarn
- Expo CLI
- Android Studio (para emulador Android) ou Xcode (para iOS)

## Instalação do Backend

### 1. Configurar Banco de Dados

```bash
# Criar banco de dados
createdb yup_db

# Executar script SQL
cd /mnt/okcomputer/output/database
psql -d yup_db -f schema.sql

# (Se já existir um banco rodando, aplique as migrações adicionais)
psql -d yup_db -f migrations/20251013_add_email_verification.sql
```

### 2. Configurar Variáveis de Ambiente

```bash
cd /mnt/okcomputer/output/backend

# Copiar arquivo de exemplo
cp .env.example .env

# Editar .env com suas configurações
nano .env
```

### 3. Instalar Dependências

```bash
npm install
```

### 4. Criar Diretórios Necessários

```bash
mkdir -p uploads/videos
mkdir -p uploads/images
```

### 5. Executar o Servidor

```bash
# Modo desenvolvimento
npm run dev

# Modo produção
npm start
```

O servidor estará rodando em `http://localhost:3000`

## Instalação do Mobile

### 1. Instalar Dependências

```bash
cd /mnt/okcomputer/output/mobile
npm install
```

### 2. Configurar API URL

Editar `src/services/api.js` e atualizar a URL do backend:

```javascript
const API_BASE_URL = 'http://SEU_IP:3000/api'; // Use seu IP local
```

### 3. Executar o Aplicativo

```bash
# Iniciar servidor de desenvolvimento
npm start

# Executar no Android
npm run android

# Executar no iOS
npm run ios
```

## Configuração do Banco de Dados

### Estrutura do Banco

O script `schema.sql` cria todas as tabelas necessárias:

- **users**: Usuários da plataforma
- **parks**: Parques de wakeboard
- **obstacles**: Obstáculos dos parques
- **videos**: Vídeos postados
- **likes**: Curtidas nos vídeos
- **comments**: Comentários nos vídeos
- **badges**: Conquistas disponíveis
- **user_badges**: Badges conquistadas pelos usuários
- **checkins**: Check-ins nos parques
- **notifications**: Sistema de notificações

### Dados Iniciais

O script já inclui dados iniciais para:
- 3 parques fundadores (Naga, Sunset, CBL)
- 8 obstáculos diferentes
- 10 badges iniciais

## Testes Rápidos

### Testar Backend

```bash
# Health check
curl http://localhost:3000/health

# Criar usuário de teste
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teste@yup.com",
    "password": "123456",
    "username": "teste123",
    "fullName": "Usuário Teste"
  }'

# Verificar e-mail (substitua 123456 pelo código recebido)
curl -X POST http://localhost:3000/api/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teste@yup.com",
    "code": "123456"
  }'
```

### Testar Mobile

1. Abrir o aplicativo
2. Criar uma conta ou fazer login
3. Testar funcionalidades:
   - Upload de vídeo
   - Curtir e comentar
   - Ver mapa dos parques
   - Ver perfil e passaporte

## Solução de Problemas

### Backend

**Erro de conexão com banco:**
- Verificar configurações no arquivo `.env`
- Garantir que PostgreSQL está rodando
- Verificar se o banco foi criado corretamente

**Erro de CORS:**
- Verificar `FRONTEND_URL` no `.env`
- Para desenvolvimento, usar `*`

### Mobile

**Erro de network:**
- Verificar IP no arquivo `api.js`
- Garantir que backend está rodando
- Verificar firewall/antivírus

**Erro de permissões:**
- No Android, adicionar permissões no `app.json`
- No iOS, configurar `Info.plist`

## Configuração de Produção

### Backend

1. **Banco de Dados**: Usar PostgreSQL em produção
2. **Armazenamento**: Configurar AWS S3 para vídeos
3. **Segurança**: 
   - Usar HTTPS
   - Configurar JWT_SECRET forte
   - Implementar rate limiting

### Mobile

1. **Build**: `expo build:android` ou `expo build:ios`
2. **Publicação**: Seguir guidelines da App Store/Google Play
3. **Analytics**: Implementar analytics para tracking

## Contribuindo

1. Faça fork do projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## Suporte

Para questões e suporte:
- Crie uma issue no repositório
- Verifique a documentação
- Teste com dados de exemplo

## Próximos Passos

Funcionalidades planejadas para futuras versões:
- [ ] Editor de vídeo básico
- [ ] Filtros e efeitos
- [ ] Modo offline
- [ ] Compartilhamento para outras redes
- [ ] Eventos e competições
- [ ] Loja virtual de produtos
- [ ] Integração com wearables
