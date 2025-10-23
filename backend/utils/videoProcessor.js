const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');

// Configurações de compressão
const VIDEO_CONFIGS = {
  mobile: {
    resolution: '1080x1920',
    bitrate: '4000k',
    fps: 30,
    format: 'mp4'
  },
  thumbnail: {
    resolution: '540x960',
    bitrate: '800k',
    fps: 30,
    format: 'mp4'
  }
};

class VideoProcessor {
  constructor() {
    this.ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';
    this.ffprobePath = process.env.FFPROBE_PATH || 'ffprobe';
    this.ffmpegAvailable = true;
    
    // Configurar paths do FFmpeg
    ffmpeg.setFfmpegPath(this.ffmpegPath);
    ffmpeg.setFfprobePath(this.ffprobePath);
  }

  /**
   * Comprime vídeo para otimizar para mobile
   */
  async compressVideo(inputPath, outputPath, options = {}) {
    const config = options.quality === 'thumbnail' ? VIDEO_CONFIGS.thumbnail : VIDEO_CONFIGS.mobile;
    
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .videoCodec('libx264')
        .audioCodec('aac')
        .size(config.resolution)
        .videoBitrate(config.bitrate)
        .fps(config.fps)
        .format(config.format)
        .outputOptions([
          '-preset fast',           // Preset para equilibrar qualidade e velocidade
          '-movflags +faststart',   // Permitir streaming
          '-profile:v high',        // Perfil apropriado para 1080p
          '-level 4.0'
        ])
        .on('start', (commandLine) => {
          console.log('🎬 Iniciando compressão de vídeo:', commandLine);
        })
        .on('progress', (progress) => {
          if (progress.percent) {
            console.log(`📊 Compressão: ${Math.round(progress.percent)}% completo`);
          }
        })
        .on('end', () => {
          console.log('✅ Compressão concluída');
          resolve(outputPath);
        })
        .on('error', (err) => {
          console.error('❌ Erro na compressão:', err);
          reject(err);
        })
        .save(outputPath);
    });
  }

  /**
   * Extrai thumbnail do vídeo
   */
  async extractThumbnail(videoPath, thumbnailPath, time = '00:00:01') {
    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .screenshots({
          timestamps: [time],
          filename: path.basename(thumbnailPath),
          folder: path.dirname(thumbnailPath),
          size: '640x360'
        })
        .on('end', () => {
          console.log('✅ Thumbnail extraída');
          resolve(thumbnailPath);
        })
        .on('error', (err) => {
          console.error('❌ Erro ao extrair thumbnail:', err);
          reject(err);
        });
    });
  }

  /**
   * Obtém informações do vídeo
   */
  async getVideoInfo(videoPath) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) {
          console.error('❌ Erro ao obter informações do vídeo:', err);
          if (this.isFfmpegUnavailableError(err)) {
            return reject(new Error('FFmpeg/FFprobe indisponível'));
          }
          reject(err);
          return;
        }

        const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');
        const audioStream = metadata.streams.find(stream => stream.codec_type === 'audio');

        resolve({
          duration: metadata.format.duration,
          size: metadata.format.size,
          format: metadata.format.format_name,
          video: videoStream ? {
            codec: videoStream.codec_name,
            width: videoStream.width,
            height: videoStream.height,
            fps: eval(videoStream.r_frame_rate),
            bitrate: videoStream.bit_rate
          } : null,
          audio: audioStream ? {
            codec: audioStream.codec_name,
            bitrate: audioStream.bit_rate,
            sample_rate: audioStream.sample_rate
          } : null
        });
      });
    });
  }

  /**
   * Verifica se vídeo precisa de compressão
   */
  async needsCompression(videoPath, maxSizeMB = 10) {
    try {
      const info = await this.getVideoInfo(videoPath);
      const sizeMB = info.size / (1024 * 1024);
      const duration = info.duration;
      
      // Critérios para compressão
      const needsCompression = (
        sizeMB > maxSizeMB ||           // Arquivo muito grande
        info.video?.height > 1280 ||    // Resolução muito alta
        info.video?.fps > 30 ||         // FPS muito alto
        info.video?.bitrate > 2000000   // Bitrate muito alto
      );

      console.log(`📊 Análise do vídeo:`);
      console.log(`   Tamanho: ${sizeMB.toFixed(2)}MB`);
      console.log(`   Duração: ${duration.toFixed(2)}s`);
      console.log(`   Resolução: ${info.video?.width}x${info.video?.height}`);
      console.log(`   FPS: ${info.video?.fps}`);
      console.log(`   Precisa compressão: ${needsCompression ? 'Sim' : 'Não'}`);

      return {
        needsCompression,
        info,
        sizeMB,
        reason: needsCompression ? this.getCompressionReason(info, maxSizeMB) : null
      };
    } catch (error) {
      console.error('❌ Erro ao analisar vídeo:', error);
      const fallbackInfo = this.getFallbackFileInfo(videoPath);
      return { 
        needsCompression: false,
        info: fallbackInfo,
        error,
        ffmpegUnavailable: this.isFfmpegUnavailableError(error)
      };
    }
  }

  /**
   * Identifica motivo da compressão
   */
  getCompressionReason(info, maxSizeMB) {
    const reasons = [];
    const sizeMB = info.size / (1024 * 1024);

    if (sizeMB > maxSizeMB) reasons.push('arquivo muito grande');
    if (info.video?.height > 1280) reasons.push('resolução alta');
    if (info.video?.fps > 30) reasons.push('FPS alto');
    if (info.video?.bitrate > 2000000) reasons.push('bitrate alto');

    return reasons.join(', ');
  }

  /**
   * Processa vídeo completo (compressão + thumbnail)
   */
  async processVideo(inputPath, outputDir, filename, options = {}) {
    const results = {
      compressed: null,
      thumbnail: null,
      originalInfo: null,
      compressedInfo: null,
      ffmpegUnavailable: false
    };

    try {
      if (options && Object.keys(options).length > 0) {
        console.log('⚙️ Opções de edição recebidas:', options);
      }

      // Verificar se precisa de compressão
      const analysis = await this.needsCompression(inputPath);
      results.originalInfo = analysis.info || this.getFallbackFileInfo(inputPath);
      results.ffmpegUnavailable = Boolean(analysis.ffmpegUnavailable);

      // Definir paths de saída
      const compressedPath = path.join(outputDir, `compressed_${filename}`);
      const thumbnailPath = path.join(outputDir, `thumb_${filename.replace(/\.[^/.]+$/, ".jpg")}`);

      if (analysis.ffmpegUnavailable) {
        console.warn('⚠️ FFmpeg/FFprobe indisponível. Copiando arquivo original sem processamento.');
        this.copyFile(inputPath, compressedPath);
        results.compressed = compressedPath;
        results.compressedInfo = results.originalInfo;
        return results;
      }

      // Comprimir se necessário
      if (analysis.needsCompression) {
        console.log(`🔄 Iniciando compressão...`);
        try {
          await this.compressVideo(inputPath, compressedPath);
          results.compressed = compressedPath;
          results.compressedInfo = await this.getVideoInfo(compressedPath);
        } catch (compressionError) {
          if (this.isFfmpegUnavailableError(compressionError)) {
            console.warn('⚠️ FFmpeg não disponível durante compressão. Copiando arquivo original.');
            this.copyFile(inputPath, compressedPath);
            results.compressed = compressedPath;
            results.compressedInfo = results.originalInfo;
            results.ffmpegUnavailable = true;
          } else {
            throw compressionError;
          }
        }
      } else {
        console.log(`✅ Vídeo já está otimizado, copiando original...`);
        this.copyFile(inputPath, compressedPath);
        results.compressed = compressedPath;
        results.compressedInfo = results.originalInfo;
      }

      // Extrair thumbnail
      if (results.compressed) {
        try {
          console.log(`🖼️ Extraindo thumbnail...`);
          await this.extractThumbnail(results.compressed, thumbnailPath);
          results.thumbnail = thumbnailPath;
        } catch (thumbnailError) {
          if (this.isFfmpegUnavailableError(thumbnailError)) {
            console.warn('⚠️ FFmpeg não disponível para gerar thumbnail. Continuando sem thumbnail.');
            results.thumbnail = null;
            results.ffmpegUnavailable = true;
          } else {
            throw thumbnailError;
          }
        }
      }

      // Calcular economia
      if (results.originalInfo && results.compressedInfo) {
        const originalSize = results.originalInfo.size / (1024 * 1024);
        const compressedSize = results.compressedInfo.size / (1024 * 1024);
        const savings = ((originalSize - compressedSize) / originalSize * 100);
        
        console.log(`💰 Economia de espaço: ${savings.toFixed(1)}%`);
        console.log(`   Original: ${originalSize.toFixed(2)}MB`);
        console.log(`   Comprimido: ${compressedSize.toFixed(2)}MB`);
      }

      return results;

    } catch (error) {
      console.error('❌ Erro no processamento do vídeo:', error);
      throw error;
    }
  }

  /**
   * Limpa arquivos temporários
   */
  cleanup(files) {
    files.forEach(file => {
      if (file && fs.existsSync(file)) {
        try {
          fs.unlinkSync(file);
          console.log(`🗑️ Arquivo temporário removido: ${file}`);
        } catch (error) {
          console.error(`❌ Erro ao remover arquivo: ${file}`, error);
        }
      }
    });
  }

  copyFile(source, target) {
    fs.copyFileSync(source, target);
    console.log(`📁 Arquivo copiado para ${target}`);
  }

  getFallbackFileInfo(filePath) {
    try {
      const stats = fs.statSync(filePath);
      return {
        duration: null,
        size: stats.size,
        format: path.extname(filePath).replace('.', ''),
        video: null,
        audio: null
      };
    } catch (error) {
      console.error('❌ Erro ao obter informações de fallback do arquivo:', error);
      return null;
    }
  }

  isFfmpegUnavailableError(error) {
    if (!error) return false;
    if (error.code === 'ENOENT') return true;
    const message = (error.message || `${error}`).toLowerCase();
    return message.includes('ffmpeg') || message.includes('ffprobe') || message.includes('not found');
  }
}

module.exports = new VideoProcessor();
