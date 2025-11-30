import { videoService } from './videoService';
import * as FileSystem from 'expo-file-system/legacy';

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
  uploadWithProgress: async (videoData, onProgress, options = {}) => {
    try {
      const { signal } = options;
      if (!videoData?.videoFile?.uri) {
        throw new Error('Vídeo inválido. Selecione novamente.');
      }

      const fields = {};
      if (videoData.maneuverType) {
        fields.maneuverType = videoData.maneuverType;
      }
      if (videoData.maneuverName) {
        fields.maneuverName = videoData.maneuverName;
      }
      if (videoData.maneuverDisplayName) {
        fields.maneuverDisplayName = videoData.maneuverDisplayName;
      }
      if (videoData.maneuverPayload) {
        fields.maneuverPayload = JSON.stringify(videoData.maneuverPayload);
      }
      if (videoData.maneuverDisplayName) {
        fields.maneuverDisplayName = videoData.maneuverDisplayName;
      }
      if (videoData.trickShortName) {
        fields.trickShortName = videoData.trickShortName;
      }
      if (videoData.expPayload) {
        fields.expPayload = JSON.stringify(videoData.expPayload);
      }
      if (videoData.parkId) {
        fields.parkId = videoData.parkId;
      }
      if (videoData.obstacleId) {
        fields.obstacleId = videoData.obstacleId;
      }
      if (videoData.challengeId) {
        fields.challengeId = videoData.challengeId;
      }
      if (videoData.visibility) {
        fields.visibility = videoData.visibility;
      }
      if (videoData.trickId) {
        fields.trickId = videoData.trickId;
      }
      if (videoData.questNodeId) {
        fields.questNodeId = videoData.questNodeId;
      }
      if (videoData.clientUploadId) {
        fields.clientUploadId = videoData.clientUploadId;
      }
      if (typeof videoData.trimStart === 'number') {
        fields.trimStart = String(videoData.trimStart);
      }
      if (typeof videoData.trimEnd === 'number') {
        fields.trimEnd = String(videoData.trimEnd);
      }
      if (typeof videoData.thumbnailTime === 'number') {
        fields.thumbnailTime = String(videoData.thumbnailTime);
      }
      if (typeof videoData.targetFrameRate === 'number') {
        fields.targetFrameRate = String(videoData.targetFrameRate);
      }
      if (typeof videoData.slowMotionFactor === 'number') {
        fields.slowMotionFactor = String(videoData.slowMotionFactor);
      }
      if (typeof videoData.slowMotionStart === 'number') {
        fields.slowMotionStart = String(videoData.slowMotionStart);
      }
      if (typeof videoData.slowMotionEnd === 'number') {
        fields.slowMotionEnd = String(videoData.slowMotionEnd);
      }

      const token = await videoService.getToken();
      const uploadUrl = `${videoService.API_BASE_URL}/videos`;
      const mimeType = videoData.videoFile.type || 'video/mp4';

      const formData = new FormData();
      formData.append('video', {
        uri: videoData.videoFile.uri,
        type: mimeType,
        name: videoData.videoFile.fileName || 'video.mp4',
      });

      Object.entries(fields).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, value);
        }
      });

      return await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        let aborted = false;

        if (signal) {
          if (signal.aborted) {
            return reject(new Error('Upload cancelado'));
          }
          const abortHandler = () => {
            aborted = true;
            xhr.abort();
            reject(new Error('Upload cancelado'));
          };
          signal.addEventListener('abort', abortHandler, { once: true });
        }

        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable && onProgress) {
            const percent = (event.loaded / event.total) * 100;
            onProgress(Math.round(percent));
          }
        });

        xhr.addEventListener('load', () => {
          if (aborted) return;
          const status = xhr.status;
          const rawResponse = xhr.responseText;

          if (status === 201) {
            try {
              const response = rawResponse ? JSON.parse(rawResponse) : {};
              resolve({ statusCode: status, body: response });
              return;
            } catch (parseError) {
              reject(new Error('Erro ao processar resposta do servidor'));
              return;
            }
          }

          if (status === 202) {
            try {
              const response = rawResponse ? JSON.parse(rawResponse) : {};
              resolve({ statusCode: status, body: response });
              return;
            } catch (parseError) {
              resolve({ statusCode: status, body: null });
              return;
            }
          }

          if (status === 504) {
            resolve({ statusCode: status, body: null, warning: 'Gateway timeout' });
            return;
          }

          let errorMessage = `Upload falhou: ${status}`;
          if (rawResponse) {
            try {
              const parsed = JSON.parse(rawResponse);
              const serverMessage =
                parsed?.error ||
                parsed?.message ||
                parsed?.details ||
                parsed?.data?.error;
              if (serverMessage) {
                errorMessage = serverMessage;
              }
            } catch (_parseErr) {
              const trimmed = rawResponse.trim();
              if (trimmed) {
                errorMessage = `${errorMessage} • ${trimmed.slice(0, 200)}`;
              }
            }
          }

          reject(new Error(errorMessage));
        });

        xhr.addEventListener('error', () => {
          if (!aborted) {
            reject(new Error('Erro de rede durante upload'));
          }
        });

        xhr.addEventListener('abort', () => {
          if (!aborted) {
            reject(new Error('Upload cancelado'));
          }
        });

        xhr.open('POST', uploadUrl);
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

    if (!videoData.clientUploadId) {
      videoData.clientUploadId = `mobile-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    }

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

        try {
          const result = await uploadService.uploadWithProgress(
            videoData,
            (progress) => {
              if (onProgress) {
                onProgress(progress, attempt);
              }
            },
            { signal: controller.signal }
          );

          const statusCode = result?.statusCode || 0;
          if (statusCode === 201) {
            console.log('✅ Upload concluído com sucesso');
            return {
              success: true,
              data: result.body,
              attempts: attempt,
              serverProcessing: false
            };
          }

          if (statusCode === 202 || statusCode === 504) {
            console.log('✅ Upload recebido. Processamento continuará no servidor.');
            return {
              success: true,
              data: result.body,
              attempts: attempt,
              serverProcessing: true,
              warning: result?.warning
            };
          }

          throw new Error('Upload respondeu com status inesperado');
        } finally {
          clearTimeout(timeoutId);
        }

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

    if (lastError && /(504|timeout)/i.test(lastError.message || '')) {
      console.warn('⚠️ Timeout/504 detectado após enviar vídeo. Assumindo que o servidor continuará o processamento.');
      return {
        success: true,
        data: null,
        attempts: attempt,
        serverProcessing: true,
        warning: lastError.message,
      };
    }

    console.error('❌ Todas as tentativas de upload falharam');
    return {
      success: false,
      error: lastError?.message || 'Upload falhou após várias tentativas',
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
