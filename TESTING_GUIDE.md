# Ŷ'UP - Guia de Testes e Validação

## 🧪 Preparação do Ambiente

### Verificação de Requisitos
```bash
# Verificar Node.js
node --version  # deve ser 16+

# Verificar PostgreSQL
psql --version  # deve ser 12+

# Verificar npm
npm --version
```

### Instalação e Configuração
```bash
# 1. Entrar no diretório do projeto
cd /mnt/okcomputer/output

# 2. Executar script de configuração
chmod +x setup.sh
./setup.sh

# 3. Editar configurações do backend
cd backend
nano .env  # Ajustar DB_PASSWORD e JWT_SECRET

# 4. Configurar mobile para seu IP
cd ../mobile
# Editar src/services/api.js e colocar seu IP local
```

## 🚀 Execução do Sistema

### Terminal 1 - Backend
```bash
cd backend
npm run dev
# Servidor rodando em http://localhost:3000
```

### Terminal 2 - Mobile
```bash
cd mobile
npm start
# Abrir no emulador ou dispositivo físico
```

## 📋 Roteiro de Testes

### Fase 1: Autenticação e Perfil
```
1. Abrir o aplicativo
2. Criar nova conta:
   - Email: teste@yup.com
   - Senha: 123456
   - Username: teste123
   - Nome: Usuário Teste
3. Verificar redirecionamento para o feed
4. Acessar perfil e editar informações
5. Adicionar uma biografia
```

### Fase 2: Upload de Vídeo
```
1. Acessar aba "Upload" (ícone da câmera)
2. Testar duas opções:
   - Gravar vídeo novo (máximo 60s)
   - Selecionar da galeria
3. Preencher formulário:
   - Descrição: "Minha primeira manobra!"
   - Selecionar parque (Naga, Sunset ou CBL)
   - Selecionar obstáculo (opcional)
4. Publicar e verificar no feed
```

### Fase 3: Interações Sociais
```
1. No feed, curtir vídeos de outros usuários
2. Adicionar comentários
3. Verificar notificações recebidas
4. Testar sistema de likes (curtir e descurtir)
```

### Fase 4: Gamificação
```
1. Após upload do primeiro vídeo, verificar badges conquistadas
2. Acessar "Perfil" → "Meu Passaporte"
3. Verificar badges conquistadas:
   - Primeiro Post
   - Visitante [Parque]
4. Upload mais vídeos para testar badges progressivas
```

### Fase 5: Mapa e Check-in
```
1. Acessar aba "Mapa"
2. Verificar os 3 parques fundadores
3. Clicar em um parque e ver informações
4. Fazer check-in
5. Postar vídeo do parque para testar badge automática
```

### Fase 6: Sistema de Notificações
```
1. Verificar ícone de notificações no perfil
2. Curtir um vídeo de outro usuário
3. Verificar se notificação foi recebida
4. Marcar notificações como lidas
```

## 🔍 Pontos de Validação

### Funcionalidade
- ✅ Cadastro/login funcionando
- ✅ Upload de vídeo completo
- ✅ Feed carregando vídeos
- ✅ Likes e comentários funcionando
- ✅ Badges sendo conquistadas automaticamente
- ✅ Mapa mostrando parques
- ✅ Check-in funcionando
- ✅ Notificações aparecendo

### Performance
- Tempo de carregamento do feed < 3s
- Upload de vídeo < 30s (depende do tamanho)
- Transições entre telas fluidas
- Mapa carregando sem travamentos

### Usabilidade
- Interface intuitiva e fácil navegação
- Feedback visual para todas as ações
- Erros tratados com mensagens claras
- Design responsivo e acessível

## 📊 Métricas de Teste

### Registre Durante os Testes:
1. **Tempo para criar conta**: ___ segundos
2. **Tempo para fazer primeiro upload**: ___ segundos
3. **Número de badges conquistadas**: ___
4. **Bugs encontrados**: ___
5. **Funcionalidades que não funcionaram**: ___

### Feedback Qualitativo:
- O que você mais gostou no app?
- O que pode ser melhorado?
- Alguma funcionalidade confusa?
- Design está agradável?

## 🐛 Debugging Comum

### Problemas de Conexão
```bash
# Backend não conecta ao banco
- Verificar .env
- Confirmar PostgreSQL rodando
- Testar conexão manual: psql -d yup_db

# Mobile não conecta ao backend
- Verificar IP em api.js
- Confirmar backend rodando
- Testar com Postman/Insomnia
```

### Problemas de Upload
```bash
# Vídeo não faz upload
- Verificar tamanho (máx 50MB)
- Verificar formato (MP4 recomendado)
- Verificar permissões da câmera
```

### Problemas de Mapa
```bash
# Mapa não carrega
- Verificar permissões de localização
- Testar com diferentes parques
- Verificar conexão com internet
```

## 📈 Checklist de Validação

### Funcionalidades Básicas
- [ ] Cadastro funciona
- [ ] Login funciona
- [ ] Upload de vídeo funciona
- [ ] Feed carrega vídeos
- [ ] Like/comment funciona
- [ ] Perfil pode ser editado
- [ ] Mapa mostra parques
- [ ] Badges são conquistadas
- [ ] Notificações aparecem
- [ ] App não crasha

### Experiência do Usuário
- [ ] Interface é intuitiva
- [ ] Ações têm feedback visual
- [ ] Erros são tratados
- [ ] Design é agradável
- [ ] Performance é boa

## 🎯 Cenários de Teste Específicos

### Teste 1: Primeira Vez
1. Abrir app pela primeira vez
2. Criar conta rapidamente
3. Explorar interface sem tutorial
4. Tentar upload imediatamente

### Teste 2: Engajamento
1. Ficar 10 minutos no app
2. Interagir com 5 vídeos diferentes
3. Explorar todas as abas
4. Verificar gamificação

### Teste 3: Power User
1. Upload 3+ vídeos
2. Conquistar várias badges
3. Explorar todas funcionalidades
4. Testar limites do sistema

## 📋 Relatório de Testes

### Template para Feedback:
```
Data do Teste: ___/___/______
Dispositivo: _________________
Sistema Operacional: ________

FUNCIONALIDADES TESTADAS:
✅ Funcionou  ❌ Não funcionou  ⚠️ Parcial

Autenticação: _____
Upload de Vídeo: _____
Feed/Likes: _____
Gamificação: _____
Mapa: _____
Notificações: _____

BUGS ENCONTRADOS:
1. 
2. 
3. 

SUGESTÕES DE MELHORIA:
1. 
2. 
3. 

NOTA GERAL (0-10): ____
COMENTÁRIOS:
```

## 🔄 Iteração e Melhorias

Após coletar feedback:
1. Priorizar bugs críticos
2. Identificar melhorias de UX
3. Validar gamificação
4. Preparar próximas features
5. Ajustar baseado em métricas

### Próximos Passos Sugeridos:
- Analisar dados de uso
- Identificar padrões de engajamento
- Validar hipóteses de gamificação
- Preparar roadmap de features

---

**Dica**: Grave a tela durante os testes para capturar comportamentos interessantes e bugs!