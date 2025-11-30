# TODO: Reconstrução da Pasta Web

## Status: PENDENTE

## Contexto
A pasta `web/` foi acidentalmente removida durante a limpeza e otimização do projeto em 04/11/2024.

## O que a pasta web continha
Segundo informações do usuário, a pasta web era importante e continha:
- Sistema de edição de passes
- Sistema de criação de manobras
- Sistema de criação/edição de parques
- Dados relacionados a estas funcionalidades

## Tentativas de Recuperação Realizadas
- ✗ Git restore (pasta não estava versionada)
- ✗ Git stash (sem stashes disponíveis)
- ✗ Repositório remoto GitHub (pasta não estava commitada)
- ✗ Lixeira do sistema (sem permissões de acesso)

## Opções de Recuperação Ainda Disponíveis
1. **Time Machine (macOS)**
   - Acessar Time Machine e navegar até o backup anterior
   - Localização: `/Users/caiocarlini/Library/Mobile Documents/com~apple~CloudDocs/Desktop/MLP YUP/MLP - Ŷ'UP/web`

2. **Backup iCloud Drive**
   - Acessar iCloud.com
   - Ir para iCloud Drive
   - Usar "Recuperar arquivos"

3. **Ferramentas de Recuperação de Dados**
   - PhotoRec (gratuito)
   - Disk Drill
   - TestDisk

4. **Outros Clones do Repositório**
   - Verificar se há cópia em outro computador
   - Verificar backups em nuvem (Dropbox, Google Drive, etc.)

## Reconstrução do Zero
Se nenhuma recuperação funcionar, será necessário reconstruir a pasta web.

### Informações Necessárias para Reconstrução:
- [ ] Qual tecnologia era usada? (React, Next.js, Vue, etc.)
- [ ] Qual era a estrutura de pastas?
- [ ] Quais eram as rotas/páginas principais?
- [ ] Havia integração com o backend?
- [ ] Quais bibliotecas eram usadas?
- [ ] Como era o sistema de autenticação?

### Estrutura Provável (a confirmar):
```
web/
├── src/
│   ├── app/
│   ├── components/
│   ├── contexts/
│   ├── features/
│   │   ├── passes/
│   │   ├── tricks/
│   │   └── parks/
│   ├── services/
│   └── utils/
├── public/
├── package.json
└── [arquivos de configuração]
```

## Próximos Passos
1. Decidir método de recuperação
2. Se recuperar, versionar imediatamente no Git
3. Se não recuperar, planejar reconstrução
4. Quando reconstruir, descomentar linha no .gitignore: `!web/`

## Data de Criação deste Documento
04/11/2024
