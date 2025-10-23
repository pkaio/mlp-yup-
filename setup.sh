#!/bin/bash

echo "🚀 Configurando ambiente de desenvolvimento Ŷ'UP..."

# Verificar se Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "❌ Node.js não está instalado. Por favor, instale Node.js 16+ primeiro."
    exit 1
fi

# Verificar se PostgreSQL está instalado
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL não está instalado. Por favor, instale PostgreSQL 12+ primeiro."
    exit 1
fi

# Criar banco de dados
echo "📊 Criando banco de dados..."
createdb yup_db 2>/dev/null || echo "⚠️  Banco de dados já existe ou erro ao criar"

# Configurar backend
echo "🔧 Configurando backend..."
cd backend

# Copiar arquivo de ambiente se não existir
if [ ! -f .env ]; then
    cp .env.example .env
    echo "✅ Arquivo .env criado. Por favor, edite com suas configurações."
fi

# Instalar dependências
echo "📦 Instalando dependências do backend..."
npm install

# Criar diretórios de upload
mkdir -p uploads/videos uploads/images

# Executar script do banco de dados
echo "🗄️  Configurando banco de dados..."
cd ../database
psql -d yup_db -f schema.sql

echo "✅ Backend configurado!"

# Configurar mobile
echo "📱 Configurando mobile..."
cd ../mobile

# Instalar dependências
echo "📦 Instalando dependências do mobile..."
npm install

echo "✅ Mobile configurado!"

echo ""
echo "🎉 Configuração concluída!"
echo ""
echo "Próximos passos:"
echo "1. Edite o arquivo backend/.env com suas configurações"
echo "2. Execute 'npm run dev' na pasta backend para iniciar o servidor"
echo "3. Execute 'npm start' na pasta mobile para iniciar o app"
echo ""
echo "Documentação disponível em:"
echo "- README.md"
echo "- INSTALLATION.md"
echo "- API_DOCUMENTATION.md"