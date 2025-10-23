# FFmpeg - Configuração para Processamento de Vídeos

O Ŷ'UP utiliza FFmpeg para compressão e processamento de vídeos, garantindo uploads rápidos e economia de espaço.

## 📋 Instalação do FFmpeg

### **Ubuntu/Debian**
```bash
# Atualizar repositórios
sudo apt update

# Instalar FFmpeg
sudo apt install ffmpeg

# Verificar instalação
ffmpeg -version
```

### **macOS**
```bash
# Usando Homebrew (recomendado)
brew install ffmpeg

# Verificar instalação
ffmpeg -version
```

### **Windows**
1. Baixar do site oficial: https://ffmpeg.org/download.html
2. Extrair o arquivo ZIP
3. Adicionar o diretório `bin` ao PATH do sistema
4. Verificar instalação no CMD: `ffmpeg -version`

### **Docker (Alternativa)**
```bash
# Usar imagem oficial do FFmpeg
docker pull jrottenberg/ffmpeg

# Para uso no backend, configurar path do Docker
```

## 🔧 Configuração no Backend

### **Opção 1: Instalação Global (Recomendado)**
Após instalar o FFmpeg globalmente, adicione ao `.env` do backend:

```env
FFMPEG_PATH=/usr/bin/ffmpeg
FFPROBE_PATH=/usr/bin/ffprobe
```

### **Opção 2: Instalação Local**
Se preferir instalar localmente no projeto:

```bash
# No diretório do backend
mkdir -p utils/ffmpeg

# Baixar e extrair FFmpeg para o diretório
# Configurar no .env:
FFMPEG_PATH=./utils/ffmpeg/ffmpeg
FFPROBE_PATH=./utils/ffmpeg/ffprobe
```

## 🎬 Funcionalidades Implementadas

### **Compressão de Vídeos**
- **Resolução**: Reduz para 720x1280 (vertical)
- **Bitrate**: 1000k para qualidade balanceada
- **FPS**: 30 frames por segundo
- **Formato**: MP4 com codec H.264
- **Feedback no app**: após o upload, o aplicativo informa a taxa de compressão obtida. Se a mensagem indicar que nenhuma compressão foi aplicada, verifique se o FFmpeg está instalado e configurado corretamente.
- **Slow motion & FPS**: o app envia metadados `targetFrameRate`, `slowMotionFactor`, `slowMotionStart`, `slowMotionEnd`. Ajuste o processamento (ex.: `setpts`/`fps`) para aplicar o efeito.

## 🗃️ Cache do Feed (ROI/latência)
- **Armazenamento**: AsyncStorage no cliente mobile (`videoService.getFeed`).
- **TTL**: 5 minutos. Após esse período, uma nova requisição é disparada e o cache é atualizado em background.
- **Limite**: até 3 páginas em memória local (ex.: 30 vídeos quando `limit=10`). Entradas mais antigas são descartadas automaticamente.
- **Fallback**: se a rede falhar, o app usa o cache mais recente marcado como “stale” para não quebrar a experiência.

### **Extração de Thumbnail**
- Captura frame no segundo 1 do vídeo
- Resolução: 640x360 para preview
- Formato: JPG para compatibilidade

### **Análise Inteligente**
- Verifica se vídeo precisa de compressão
- Compara tamanho original vs comprimido
- Mantém qualidade aceitável para mobile

## 📊 Benefícios da Compressão

### **Economia de Espaço**
- Vídeos de 50MB podem ser reduzidos para 10-15MB
- Economia média: 60-80% do tamanho original
- Manutenção da qualidade visual

### **Melhoria de Performance**
- Upload 3-5x mais rápido
- Menor consumo de dados do usuário
- Carregamento mais rápido no feed
- Menos uso de armazenamento no servidor

### **Compatibilidade**
- Formato MP4 universal
- Codec H.264 compatível com todos dispositivos
- Perfil baseline para máxima compatibilidade

## ⚙️ Configurações Ajustáveis

### **No Backend (utils/videoProcessor.js)**
```javascript
const VIDEO_CONFIGS = {
  mobile: {
    resolution: '720x1280',    // Ajustar resolução
    bitrate: '1000k',          // Ajustar qualidade
    fps: 30,                   // Ajustar frame rate
    format: 'mp4'
  },
  thumbnail: {
    resolution: '360x640',     // Tamanho do thumbnail
    bitrate: '500k',           // Qualidade do thumbnail
    fps: 30,
    format: 'mp4'
  }
};
```

### **Critérios de Compressão**
- Arquivos > 10MB são comprimidos
- Vídeos com resolução > 1280p são reduzidos
- Bitrate > 2000k são ajustados

## 🧪 Testes e Validação

### **Comandos de Teste**
```bash
# Verificar informações do vídeo
ffprobe -v error -select_streams v:0 -show_entries stream=width,height,bit_rate,duration -of default=noprint_wrappers=1 video.mp4

# Compressão manual para teste
ffmpeg -i input.mp4 -s 720x1280 -b:v 1000k -r 30 -preset fast output.mp4

# Extrair thumbnail
ffmpeg -i input.mp4 -ss 00:00:01 -vframes 1 -s 640x360 thumbnail.jpg
```

### **Métricas para Monitorar**
- Tempo de processamento por vídeo
- Taxa de compressão alcançada
- Qualidade perceptual mantida
- Uso de CPU/memória durante processamento

## 🔍 Troubleshooting

### **Erro: "ffmpeg not found"**
```bash
# Verificar se FFmpeg está no PATH
which ffmpeg

# Adicionar ao PATH temporariamente
export PATH=$PATH:/usr/local/bin

# Ou configurar caminho absoluto no .env
FFMPEG_PATH=/usr/local/bin/ffmpeg
```

### **Erro de codec não suportado**
```bash
# Verificar codecs disponíveis
ffmpeg -codecs

# Instalar codecs adicionais (Ubuntu/Debian)
sudo apt install ubuntu-restricted-extras
```

### **Problemas de permissão**
```bash
# Dar permissão de execução
chmod +x /usr/local/bin/ffmpeg
chmod +x /usr/local/bin/ffprobe
```

## 📈 Otimizações Futuras

### **Processamento em Lote**
- Usar filas (Bull/Redis) para processamento assíncrono
- Processar múltiplos vídeos simultaneamente
- Notificar usuário quando processamento terminar

### **Qualidade Adaptativa**
- Gerar múltiplas qualidades (720p, 480p, 360p)
- Entregar qualidade baseada na conexão do usuário
- Implementar HLS/DASH para streaming

### **Inteligência Artificial**
- Detectar e destacar manobras no vídeo
- Sugerir melhores momentos para thumbnail
- Analisar qualidade da filmagem

## 🚀 Próximos Passos

1. **Instalar FFmpeg** no ambiente de produção
2. **Configurar paths** no arquivo .env
3. **Testar compressão** com vídeos de exemplo
4. **Monitorar performance** em produção
5. **Ajustar configurações** baseado em feedback

## 📞 Suporte

Se encontrar problemas com FFmpeg:
1. Verificar logs de erro no backend
2. Testar comandos FFmpeg manualmente
3. Verificar permissões e paths
4. Consultar documentação oficial: https://ffmpeg.org/documentation.html

---

**Com FFmpeg configurado, o Ŷ'UP terá upload de vídeos otimizado e rápido!** 🎬⚡
