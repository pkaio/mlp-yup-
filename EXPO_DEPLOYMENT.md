# Deployment com Expo (EAS)

## Visão Geral

O projeto Y'UP Mobile agora usa **Expo Application Services (EAS)** para build e deployment. O Vercel foi removido completamente do projeto.

## Pré-requisitos

1. **Conta Expo**
   - Criar conta em: https://expo.dev
   - Fazer login via CLI: `npx expo login`

2. **EAS CLI**
   - Instalar globalmente: `npm install -g eas-cli`
   - Ou usar via npx: `npx eas-cli`

## Configuração Inicial

### 1. Configurar EAS

```bash
cd mobile
npx eas build:configure
```

Este comando criará o arquivo `eas.json` com as configurações de build.

### 2. Estrutura do eas.json (exemplo)

```json
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {}
  },
  "submit": {
    "production": {}
  }
}
```

## Build do App

### Desenvolvimento (Testagem Interna)

```bash
cd mobile
npm run build:android  # Build para Android
npm run build:ios      # Build para iOS
npm run build:all      # Build para ambas plataformas
```

Ou use os comandos EAS diretamente:

```bash
npx eas build --platform android
npx eas build --platform ios
npx eas build --platform all
```

### Produção

```bash
npx eas build --platform android --profile production
npx eas build --platform ios --profile production
```

## Publicação de Updates (OTA)

Para publicar updates Over-The-Air (sem rebuild):

```bash
cd mobile
npx eas update --branch production --message "Descrição da atualização"
```

### Branches de Update

- `production` - Versão em produção
- `preview` - Versão de preview/staging
- `development` - Versão de desenvolvimento

## Submissão para Lojas

### Google Play Store

```bash
npx eas submit --platform android
```

### Apple App Store

```bash
npx eas submit --platform ios
```

## Scripts Disponíveis

No [mobile/package.json](mobile/package.json):

```bash
npm start           # Inicia development server
npm run android     # Roda no emulador Android
npm run ios         # Roda no simulador iOS
npm run web         # Roda no navegador
npm run build:android  # Build Android com EAS
npm run build:ios      # Build iOS com EAS
npm run build:all      # Build para todas plataformas
```

## Variáveis de Ambiente

### Development

Criar arquivo `.env` na pasta `mobile/`:

```env
API_URL=http://localhost:3000
```

### Production

Configurar no EAS via secrets:

```bash
npx eas secret:create --scope project --name API_URL --value https://api.y-up.app
```

## Monitoramento de Builds

- Acessar: https://expo.dev
- Ver builds em andamento
- Baixar arquivos .apk ou .ipa
- Ver logs de erro

## Troubleshooting

### Build falhou

1. Verificar logs no Expo Dashboard
2. Limpar cache: `npx expo start -c`
3. Reinstalar dependências: `rm -rf node_modules && npm install`

### App não atualiza (OTA)

1. Verificar se está usando o mesmo runtime version
2. Forçar update no app
3. Verificar branch correto do update

### Erro de certificados (iOS)

1. Gerar certificados: `npx eas credentials`
2. Seguir wizard de configuração
3. Fazer novo build

## Migração do Vercel

O projeto foi migrado de Vercel para Expo. Mudanças realizadas:

- ✅ Removido pasta `.vercel/`
- ✅ Removido `Procfile`
- ✅ Atualizado scripts em `package.json`
- ✅ Atualizado `.gitignore` para EAS
- ✅ Configurado builds via EAS

## Links Úteis

- [Expo Documentation](https://docs.expo.dev)
- [EAS Build](https://docs.expo.dev/build/introduction/)
- [EAS Submit](https://docs.expo.dev/submit/introduction/)
- [EAS Update](https://docs.expo.dev/eas-update/introduction/)
- [Expo Dashboard](https://expo.dev)

## Suporte

Para problemas com deployment:
1. Verificar [Expo Status](https://status.expo.dev)
2. Consultar [Expo Forums](https://forums.expo.dev)
3. Ver [Common Issues](https://docs.expo.dev/build/troubleshooting/)
