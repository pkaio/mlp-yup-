import { videoService } from './videoService';
import * as FileSystem from 'expo-file-system';

export const uploadService = {
  /**
   * Verifica e prepara vídeo para upload
   */
  prepareVideo: async (videoFile) => {
    try {
      // Verificar tamanho do arquivo
      let fileSizeBytes =
        typeof videoFile.fileSize === 'number' ? videoFile.fileSize : null;

      if ((!fileSizeBytes || Number.isNaN(fileSizeBytes)) && videoFile.uri) {
        try {
          const fileInfo = await FileSystem.getInfoAsync(videoFile.uri);
          if (fileInfo?.exists && typeof fileInfo.size === 'number') {
            fileSizeBytes = fileInfo.size;
          }
        } catch (fileError) {
          console.warn('Não foi possível obter o tamanho do arquivo:', fileError);
        }
      }

      const fileSizeMB =
        fileSizeBytes != null ? fileSizeBytes / (1024 * 1024) : null;

      if (fileSizeMB != null && fileSizeMB > 100) {
        return {
          valid: false,
          error: 'Vídeo muito grande. Máximo permitido: 100MB',
        };
      }

      // Verificar duração (se disponível)
      let durationSeconds = null;
      if (typeof videoFile.duration === 'number') {
        const durationRaw = videoFile.duration;
        durationSeconds = durationRaw > 600 ? durationRaw / 1000 : durationRaw;

        if (durationSeconds > 60) {
          return {
            valid: false,
            error: 'Vídeo muito longo. Máximo permitido: 60 segundos'
          };
        }
      }

      // Verificar formato
      const allowedFormats = ['mp4', 'mov', 'avi', '3gp'];
      const fileExtension = videoFile.uri.split('.').pop().toLowerCase();
      
      if (!allowedFormats.includes(fileExtension)) {
        return {
          valid: false,
          error: 'Formato de vídeo não suportado. Use MP4, MOV, AVI ou 3GP'
        };
      }

      let resolutionLabel = null;
      if (videoFile?.height && videoFile?.width) {
        const maxSide = Math.max(videoFile.height, videoFile.width);
        resolutionLabel = `${maxSide}p`;
      }

      return {
        valid: true,
        videoFile: {
          ...videoFile,
          fileSize: fileSizeBytes ?? videoFile.fileSize ?? null,
        },
        sizeMB: fileSizeMB,
        duration: durationSeconds != null ? durationSeconds * 1000 : null,
        resolution: resolutionLabel,
        estimatedUploadTime:
          fileSizeMB != null
            ? uploadService.estimateUploadTime(fileSizeMB)
            : null,
      };

    } catch (error) {
      console.error('Erro ao preparar vídeo:', error);
      return {
        valid: false,
        error: 'Erro ao verificar vídeo'
      };
    }
  },

  /**
   * Estima tempo de upload baseado no tamanho
   */
  estimateUploadTime: (fileSizeMB) => {
    if (typeof fileSizeMB !== 'number' || Number.isNaN(fileSizeMB)) {
      return null;
    }

    // Estimativas conservadoras (em segundos)
    const speeds = {
      slow: 0.5,    // 0.5 MB/s
      medium: 2,    // 2 MB/s  
      fast: 5       // 5 MB/s
    };

    const times = {
      slow: Math.ceil(fileSizeMB / speeds.slow),
      medium: Math.ceil(fileSizeMB / speeds.medium),
      fast: Math.ceil(fileSizeMB / speeds.fast)
    };

    return times;
  },

  /**
   * Upload com progress tracking
   */
  uploadWithProgress: async (videoData, onProgress) => {
    try {
      const formData = new FormData();
      
      // Adicionar vídeo
      formData.append('video', {
        uri: videoData.videoFile.uri,
        type: videoData.videoFile.type || 'video/mp4',
        name: videoData.videoFile.fileName || 'video.mp4',
      });

      // Adicionar outros campos
      if (videoData.description) {
        formData.append('description', videoData.description);
      }
      if (videoData.parkId) {
        formData.append('parkId', videoData.parkId);
      }
      if (videoData.obstacleId) {
        formData.append('obstacleId', videoData.obstacleId);
      }
      if (videoData.challengeId) {
        formData.append('challengeId', videoData.challengeId);
      }
      if (videoData.trickId) {
        formData.append('trickId', videoData.trickId);
      }
      if (typeof videoData.trimStart === 'number') {
        formData.append('trimStart', String(videoData.trimStart));
      }
      if (typeof videoData.trimEnd === 'number') {
        formData.append('trimEnd', String(videoData.trimEnd));
      }
      if (typeof videoData.thumbnailTime === 'number') {
        formData.append('thumbnailTime', String(videoData.thumbnailTime));
      }
      if (typeof videoData.targetFrameRate === 'number') {
        formData.append('targetFrameRate', String(videoData.targetFrameRate));
      }
      if (typeof videoData.slowMotionFactor === 'number') {
        formData.append('slowMotionFactor', String(videoData.slowMotionFactor));
      }
      // Campos adicionais (como visibility ou difficulty) ainda não são suportados pela API

      // Configurar tracking de progresso
      const xhr = new XMLHttpRequest();
      const token = await videoService.getToken();
      
      return new Promise((resolve, reject) => {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable && onProgress) {
            const progress = (event.loaded / event.total) * 100;
            onProgress(Math.round(progress));
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status === 201) {
            try {
              const response = JSON.parse(xhr.responseText);
              resolve(response);
            } catch (error) {
              reject(new Error('Erro ao processar resposta do servidor'));
            }
          } else {
            reject(new Error(`Upload falhou: ${xhr.status}`));
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Erro de rede durante upload'));
        });

        xhr.addEventListener('abort', () => {
          reject(new Error('Upload cancelado'));
        });

        xhr.open('POST', `${videoService.API_BASE_URL}/videos`);
        if (token) {
          xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        }
        xhr.send(formData);
      });

    } catch (error) {
      console.error('Erro no upload com progresso:', error);
      throw error;
    }
  },

  /**
   * Upload simples com callback normalizado (0-1)
   */
  uploadVideo: async (videoData, options = {}) => {
    const normalized = typeof options === 'function' ? { onProgress: options } : options;
    const {
      onProgress = null,
      onRetry = null,
      maxRetries = 3,
      timeout = 120000,
    } = normalized;

    const response = await uploadService.uploadOptimized(videoData, {
      maxRetries,
      timeout,
      onRetry,
      onProgress: (progressPercent, attempt) => {
        if (onProgress) {
          onProgress({
            progress: progressPercent / 100,
            attempt,
            progressPercent,
          });
        }
      },
    });

    return response;
  },

  /**
   * Upload otimizado com retry e resiliência
   */
  uploadOptimized: async (videoData, options = {}) => {
    const {
      maxRetries = 3,
      onProgress = null,
      onRetry = null,
      timeout = 120000 // 2 minutos
    } = options;

    let attempt = 0;
    let lastError = null;

    while (attempt < maxRetries) {
      try {
        attempt++;
        
        console.log(`🚀 Iniciando upload (tentativa ${attempt}/${maxRetries})`);

        // Criar controller para timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const result = await uploadService.uploadWithProgress(videoData, (progress) => {
          if (onProgress) {
            onProgress(progress, attempt);
          }
        });

        clearTimeout(timeoutId);
        
        console.log('✅ Upload concluído com sucesso');
        return {
          success: true,
          data: result,
          attempts: attempt
        };

      } catch (error) {
        lastError = error;
        console.error(`❌ Upload falhou (tentativa ${attempt}):`, error.message);

        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // Exponential backoff
          
          console.log(`⏳ Aguardando ${delay}ms antes de retry...`);
          
          if (onRetry) {
            onRetry(attempt, delay);
          }
          
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // Todas as tentativas falharam
    console.error('❌ Todas as tentativas de upload falharam');
    return {
      success: false,
      error: lastError.message || 'Upload falhou após várias tentativas',
      attempts: attempt
    };
  },

  /**
   * Valida qualidade do vídeo antes do upload
   */
  validateVideoQuality: async (videoFile) => {
    try {
      // Verificar resolução mínima
      if (videoFile.width && videoFile.height) {
        if (videoFile.width < 480 || videoFile.height < 640) {
          return {
            valid: false,
            warning: 'Resolução muito baixa. Recomendado: mínimo 720x1280'
          };
        }
      }

      // Verificar proporção (aspect ratio)
      if (videoFile.width && videoFile.height) {
        const aspectRatio = videoFile.width / videoFile.height;
        const expectedRatio = 9/16; // Vertical para stories/reels
        const tolerance = 0.1;

        if (Math.abs(aspectRatio - expectedRatio) > tolerance) {
          return {
            valid: true,
            warning: 'Proporção não ideal. Recomendado: 9:16 (vertical)'
          };
        }
      }

      return {
        valid: true,
        quality: uploadService.assessQuality(videoFile)
      };

    } catch (error) {
      console.error('Erro ao validar qualidade:', error);
      return {
        valid: true,
        warning: 'Não foi possível validar qualidade do vídeo'
      };
    }
  },

  /**
   * Avalia qualidade do vídeo
   */
  assessQuality: (videoFile) => {
    const score = {
      resolution: 0,
      framerate: 0,
      size: 0,
      total: 0
    };

    // Resolução (0-3 pontos)
    if (videoFile.height >= 1280) score.resolution = 3; // HD+
    else if (videoFile.height >= 720) score.resolution = 2; // HD
    else if (videoFile.height >= 480) score.resolution = 1; // SD

    // Frame rate (0-2 pontos)
    if (videoFile.fps >= 30) score.framerate = 2;
    else if (videoFile.fps >= 24) score.framerate = 1;

    // Tamanho (0-2 pontos)
    const sizeMB = videoFile.fileSize / (1024 * 1024);
    if (sizeMB <= 10) score.size = 2;
    else if (sizeMB <= 25) score.size = 1;

    score.total = score.resolution + score.framerate + score.size;

    let quality = 'low';
    if (score.total >= 6) quality = 'excellent';
    else if (score.total >= 4) quality = 'good';
    else if (score.total >= 2) quality = 'fair';

    return {
      score,
      quality,
      maxScore: 7
    };
  }
};

export default uploadService;
