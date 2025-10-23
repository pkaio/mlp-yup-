# Ŷ'UP - Minimum Lovable Product (MLP)

## 🎯 Visão Geral

O Ŷ'UP é uma plataforma social gamificada para wakeboard que conecta atletas, parques e manobras através de vídeos curtos e sistema de conquistas. O MLP foca em validar engajamento com funcionalidades essenciais que criam amor pelo produto.

## 🚀 Funcionalidades

### ✅ Sistema de Autenticação e Perfil
- Cadastro com verificação de e-mail (envio de código seguro)
- Login protegido com JWT
- Perfil do atleta com foto, bio e "Passaporte" visual
- Contador de conquistas e estatísticas
- Edição de perfil completa

### ✅ Sistema de Vídeos
- Upload de vídeos curtos (até 60s)
- Formulário com descrição, parque e obstáculo
- Feed cronológico com likes e comentários
- Reprodutor de vídeo integrado

### ✅ Sistema de Badges e Conquistas
- Badges automáticas por:
  - Primeiro post no parque
  - Número de posts (5, 10, 25)
  - Tipos de obstáculos diferentes
- Visualização das badges no "Passaporte"
- Sistema de progresso e gamificação

### ✅ Mapa Interativo
- Mapa mostrando os 3 parques fundadores
- Informações básicas de cada parque
- Sistema de check-in ao postar vídeo
- Integração com localização do usuário

### ✅ Sistema de Notificações
- Notificações de novas badges
- Notificações de likes/comentários
- Sistema de marcação como lida
- Contador de notificações não lidas

## 🛠️ Tecnologias

### Backend
- **Node.js + Express**: API REST robusta
- **PostgreSQL**: Banco de dados relacional
- **JWT**: Autenticação segura
- **Multer**: Upload de arquivos

### Mobile
- **React Native**: Framework cross-platform
- **Expo**: Ferramentas de desenvolvimento
- **React Navigation**: Navegação entre telas
- **React Native Maps**: Mapa interativo

## 📁 Estrutura do Projeto

```
/mnt/okcomputer/output/
├── backend/              # API REST
│   ├── routes/          # Rotas da API
│   ├── middleware/      # Middleware de autenticação
│   ├── utils/          # Utilitários
│   └── config/         # Configurações
├── mobile/              # Aplicativo React Native
│   ├── src/
│   │   ├── screens/    # Telas do app
│   │   ├── components/ # Componentes reutilizáveis
│   │   ├── services/   # Serviços da API
│   │   └── context/    # Contexto de autenticação
│   └── app.json        # Configuração do Expo
├── database/            # Scripts SQL
│   └── schema.sql      # Estrutura do banco
├── docs/               # Documentação
├── assets/             # Imagens e recursos
├── README.md           # Este arquivo
├── INSTALLATION.md     # Guia de instalação
├── API_DOCUMENTATION.md # Documentação da API
├── PROJECT_SUMMARY.md  # Resumo do projeto
└── setup.sh           # Script de configuração
```

## 🚀 Instalação Rápida

### Opção 1: Script Automático
```bash
chmod +x setup.sh
./setup.sh
```

### Opção 2: Manual

#### Backend
```bash
cd backend
npm install
cp .env.example .env
# Editar .env com suas configurações
npm run dev
```

#### Mobile
```bash
cd mobile
npm install
npm start
```

## 📋 Requisitos

- **Node.js 16+**
- **PostgreSQL 12+**
- **npm ou yarn**
- **Expo CLI** (para mobile)

## 🎨 Design Visual

- **Cores**: Azul marinho (#1e3a8a) e laranja vibrante (#f97316)
- **Tipografia**: Inter (moderna e legível)
- **Estilo**: Minimalista, mobile-first, gamificado

## 📊 Banco de Dados

O script `database/schema.sql` cria todas as tabelas necessárias e popula com dados iniciais:
- 3 parques fundadores (Naga, Sunset, CBL)
- 8 obstáculos diferentes
- 10 badges iniciais

Para bancos já existentes, aplique também o script `database/migrations/20251013_add_email_verification.sql` para habilitar o fluxo de verificação de e-mail.

## 🔧 Configuração

### Backend (.env)
```env
# Configuração básica
PORT=3000
FRONTEND_URL=http://localhost:3000
JWT_SECRET=sua-chave-secreta-super-segura

# PostgreSQL (ou use DATABASE_URL)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=yup_db
DB_USER=postgres
DB_PASSWORD=password

# SMTP para envio do código de verificação
SMTP_HOST=smtp.seuprovedor.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=usuario-smtp
SMTP_PASS=senha-smtp
SMTP_FROM="Y'UP <no-reply@yup.app>"
SUPPORT_EMAIL=support@yup.app
VERIFICATION_CODE_TTL_MINUTES=15
VERIFICATION_RESEND_COOLDOWN_SECONDS=90
```

### Web (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api
NEXT_PUBLIC_VERIFICATION_RESEND_SECONDS=90
```

### Mobile (api.js)
```javascript
const API_BASE_URL = 'http://SEU_IP:3000/api';
```

## 📱 Telas do Aplicativo

1. **Login/Cadastro**: Autenticação do usuário
2. **Feed**: Timeline de vídeos com interações
3. **Upload**: Envio de vídeos com metadata
4. **Mapa**: Localização dos parques e check-in
5. **Perfil**: Informações pessoais e configurações
6. **Passaporte**: Visualização de conquistas
7. **Reprodutor**: Player de vídeo com comentários

## 🏆 Sistema de Gamificação

### Badges Disponíveis
- **Primeiro Post**: Primeiro vídeo na plataforma
- **Wakeboarder Ativo**: 5 vídeos postados
- **Produtor de Conteúdo**: 10 vídeos postados
- **Visitante [Parque]**: Primeiro vídeo em cada parque
- **Kicker Iniciante**: Dominação de obstáculos específicos

### Categorias
- Parques (cores diferentes por local)
- Obstáculos (ícones específicos)
- Número de posts (medalhas)
- Tricks especiais (estrelas)

### Dados de XP
- Executar `node backend/scripts/seedXpData.js` para popular a tabela de tricks e as métricas de XP

## 🧪 Testando o Sistema

### Backend
```bash
# Health check
curl http://localhost:3000/health

# Criar usuário de teste
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"teste@yup.com","password":"123456","username":"teste123"}'

# Verificar e-mail (substitua 123456 pelo código recebido)
curl -X POST http://localhost:3000/api/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{"email":"teste@yup.com","code":"123456"}'
```

### Mobile
1. Abrir o aplicativo
2. Criar uma conta ou fazer login
3. Testar funcionalidades:
   - Upload de vídeo
   - Curtir e comentar
   - Ver mapa dos parques
   - Ver perfil e passaporte

## 📈 Métricas de Sucesso

### KPIs do MLP
- **Engajamento**: Tempo no app e taxa de retorno
- **Conteúdo**: Vídeos postados por usuário
- **Gamificação**: Badges conquistadas e progressão
- **Comunidade**: Interações (likes, comentários)

### Objetivos
- 100 usuários ativos nas primeiras semanas
- 5+ vídeos por usuário ativo
- 80% de satisfação com gamificação
- Taxa de retenção de 60% após 30 dias

## 🎯 Próximos Passos

### Funcionalidades Planejadas
- [ ] Editor de vídeo básico
- [ ] Filtros e efeitos visuais
- [ ] Modo offline
- [ ] Compartilhamento para redes sociais
- [ ] Eventos e competições
- [ ] Loja virtual de produtos
- [ ] Integração com wearables

### Otimizações
- Performance em conexões móveis
- Cache de imagens e vídeos
- Lazy loading no feed
- Compressão de mídia

## 📚 Documentação

- **[Guia de Instalação](INSTALLATION.md)**: Passo a passo detalhado
- **[Documentação da API](API_DOCUMENTATION.md)**: Endpoints e exemplos
- **[Resumo do Projeto](PROJECT_SUMMARY.md)**: Visão geral completa
- **[Design Visual](docs/DESIGN.md)**: Diretrizes de design

## 🤝 Contribuindo

1. Faça fork do projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📄 Licença

Este projeto está licenciado sob a MIT License.

## 👥 Equipe

Desenvolvido para validar engajamento e criar a "casa digital" do wakeboard brasileiro.

---

**Ŷ'UP - Conectando a comunidade do wakeboard brasileiro** 🏄‍♂️🇧🇷

<div align="center">
  <img src="assets/logo.png" alt="Ŷ'UP Logo" width="200">
</div>
