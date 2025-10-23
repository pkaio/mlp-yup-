const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Joi = require('joi');
const pool = require('../config/database');
const { authMiddleware, optionalAuth, requireModerator } = require('../middleware/auth');
const { checkAndAwardBadges } = require('../utils/badgeSystem');
const videoProcessor = require('../utils/videoProcessor');
const s3Client = require('../utils/s3Client');
const { notifyVideoOwner } = require('../utils/notificationService');
const expSystem = require('../utils/expSystem');

const router = express.Router();

const MEDIA_ROOT = path.join(__dirname, '..');

const getContentType = (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.mp4':
      return 'video/mp4';
    case '.mov':
      return 'video/quicktime';
    case '.m4v':
      return 'video/x-m4v';
    default:
      return 'application/octet-stream';
  }
};

// Configuração do multer para upload de vídeos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/videos/temp';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { 
    fileSize: 100 * 1024 * 1024, // 100MB para arquivos temporários
    files: 1 
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos de vídeo são permitidos'), false);
    }
  }
});

const buildAbsoluteUrl = (req, relativePath) => {
  if (!relativePath) {
    return null;
  }

  const baseUrl = (process.env.APP_BASE_URL && process.env.APP_BASE_URL.trim())
    || `${req.protocol || 'http'}://${req.get('host')}`;

  const normalizedBase = baseUrl.replace(/\/+$/, '');
  const normalizedPath = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;

  return `${normalizedBase}${normalizedPath}`;
};

// Validation schemas
const videoSchema = Joi.object({
  description: Joi.string().max(500).optional(),
  parkId: Joi.string().uuid().optional(),
  obstacleId: Joi.string().uuid().optional(),
  challengeId: Joi.string().uuid().optional(),
  visibility: Joi.string().valid('public', 'friends', 'private').optional(),
  trimStart: Joi.number().min(0).optional(),
  trimEnd: Joi.number().min(0).optional(),
  thumbnailTime: Joi.number().min(0).optional(),
  targetFrameRate: Joi.number().min(1).max(120).optional(),
  slowMotionFactor: Joi.number().min(0.1).max(4).optional(),
  slowMotionStart: Joi.number().min(0).optional(),
  slowMotionEnd: Joi.number().min(0).optional(),
  trickId: Joi.string().uuid().optional(),
}).unknown(true);

const removeMediaFile = async (fileUrl) => {
  if (!fileUrl) {
    return;
  }

  const s3Key = s3Client.getKeyFromUrl(fileUrl);
  if (s3Key) {
    try {
      await s3Client.deleteFile(s3Key);
    } catch (error) {
      console.error(`Erro ao remover arquivo no S3 (${s3Key}):`, error);
    }
    return;
  }

  if (fileUrl.startsWith('/uploads/')) {
    const normalized = fileUrl.startsWith('/') ? fileUrl.slice(1) : fileUrl;
    const filePath = path.join(MEDIA_ROOT, normalized);
    try {
      await fs.promises.unlink(filePath);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error(`Erro ao remover arquivo local (${filePath}):`, error);
      }
    }
  }
};

const mapVideosWithLikes = async (videos, userId) => {
  if (!userId || videos.length === 0) {
    return videos.map((video) => ({ ...video, user_liked: false }));
  }

  const videoIds = videos.map((video) => video.id);
  const likesResult = await pool.query(
    'SELECT video_id FROM likes WHERE user_id = $1 AND video_id = ANY($2)',
    [userId, videoIds]
  );
  const userLikes = likesResult.rows.map((row) => row.video_id);

  return videos.map((video) => ({
    ...video,
    user_liked: userLikes.includes(video.id),
  }));
};

// Get videos for moderation
router.get('/admin', authMiddleware, requireModerator, async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '' } = req.query;
    const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
    const limitNumber = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const offset = (pageNumber - 1) * limitNumber;
    const searchTerm = String(search || '').trim().toLowerCase();

    const listParams = [limitNumber, offset];
    let listWhereClause = '';
    let countWhereClause = '';
    const countParams = [];

    if (searchTerm) {
      const value = `%${searchTerm}%`;
      listParams.push(value);
      countParams.push(value);
      listWhereClause = `
        WHERE LOWER(u.username) LIKE $3
           OR LOWER(u.full_name) LIKE $3
           OR LOWER(COALESCE(v.description, '')) LIKE $3
           OR LOWER(COALESCE(p.name, '')) LIKE $3
           OR LOWER(COALESCE(o.name, '')) LIKE $3
      `;
      countWhereClause = `
        WHERE LOWER(u.username) LIKE $1
           OR LOWER(u.full_name) LIKE $1
           OR LOWER(COALESCE(v.description, '')) LIKE $1
           OR LOWER(COALESCE(p.name, '')) LIKE $1
           OR LOWER(COALESCE(o.name, '')) LIKE $1
      `;
    }

    const listQuery = `
      SELECT
        v.id, v.video_url, v.thumbnail_url, v.description, v.duration,
        v.views_count, v.likes_count, v.comments_count, NULL::text AS visibility,
        v.exp_awarded, v.score_breakdown,
        v.created_at,
        u.id as user_id, u.username, u.full_name, u.profile_image_url,
        p.name as park_name, o.name as obstacle_name
      FROM videos v
      JOIN users u ON v.user_id = u.id
      LEFT JOIN parks p ON v.park_id = p.id
      LEFT JOIN obstacles o ON v.obstacle_id = o.id
      ${listWhereClause}
      ORDER BY v.created_at DESC
      LIMIT $1 OFFSET $2
    `;

    const videosResult = await pool.query(listQuery, listParams);

    const countQuery = `
      SELECT COUNT(*) as total
      FROM videos v
      JOIN users u ON v.user_id = u.id
      LEFT JOIN parks p ON v.park_id = p.id
      LEFT JOIN obstacles o ON v.obstacle_id = o.id
      ${countWhereClause}
    `;

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0]?.total || 0, 10);
    const totalPages = Math.max(Math.ceil(total / limitNumber), 1);
    const hasMore = pageNumber < totalPages;

    res.json({
      videos: await mapVideosWithLikes(videosResult.rows, req.user?.id),
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        totalPages,
        hasMore,
      },
    });
  } catch (error) {
    console.error('Erro ao buscar vídeos para moderação:', error);
    res.status(500).json({ error: 'Erro ao buscar vídeos para moderação' });
  }
});

// Get videos feed
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
    const limitNumber = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 50);
    const offset = (pageNumber - 1) * limitNumber;

    const result = await pool.query(`
      SELECT 
        v.id, v.video_url, v.thumbnail_url, v.description, v.duration,
        v.views_count, v.likes_count, v.comments_count,
        v.exp_awarded, v.score_breakdown,
        v.created_at,
        u.id as user_id, u.username, u.full_name, u.profile_image_url,
        p.name as park_name, o.name as obstacle_name
      FROM videos v
      JOIN users u ON v.user_id = u.id
      LEFT JOIN parks p ON v.park_id = p.id
      LEFT JOIN obstacles o ON v.obstacle_id = o.id
      WHERE v.created_at > NOW() - INTERVAL '30 days'
      ORDER BY v.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limitNumber, offset]);

    const videos = await mapVideosWithLikes(result.rows, req.user?.id);

    res.json({
      videos,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        hasMore: result.rows.length === limitNumber
      }
    });

  } catch (error) {
    console.error('Erro ao buscar vídeos:', error);
    res.status(500).json({ error: 'Erro ao buscar vídeos' });
  }
});

// Get videos for a specific obstacle
router.get('/obstacle/:obstacleId', optionalAuth, async (req, res) => {
  try {
    const { obstacleId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
    const limitNumber = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 50);
    const offset = (pageNumber - 1) * limitNumber;

    const result = await pool.query(
      `
        SELECT 
          v.id, v.video_url, v.thumbnail_url, v.description, v.duration,
          v.views_count, v.likes_count, v.comments_count,
          v.exp_awarded, v.score_breakdown,
          v.created_at,
          u.id as user_id, u.username, u.full_name, u.profile_image_url,
          p.name as park_name, o.name as obstacle_name
        FROM videos v
        JOIN users u ON v.user_id = u.id
        LEFT JOIN parks p ON v.park_id = p.id
        LEFT JOIN obstacles o ON v.obstacle_id = o.id
        WHERE v.obstacle_id = $1
        ORDER BY v.created_at DESC
        LIMIT $2 OFFSET $3
      `,
      [obstacleId, limitNumber, offset]
    );

    const videos = await mapVideosWithLikes(result.rows, req.user?.id);

    res.json({
      videos,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        hasMore: result.rows.length === limitNumber,
      },
    });
  } catch (error) {
    console.error('Erro ao buscar vídeos do obstáculo:', error);
    res.status(500).json({ error: 'Erro ao buscar vídeos do obstáculo' });
  }
});

const handleVideoUpload = (req, res, next) => {
  upload.single('video')(req, res, (err) => {
    if (!err) {
      return next();
    }

    console.error('Erro no middleware de upload:', err);

    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        error: 'Arquivo muito grande. Limite máximo: 100MB.',
        details: err.message
      });
    }

    return res.status(400).json({
      error: 'Falha ao receber o vídeo',
      details: err.message || String(err)
    });
  });
};

// Upload video com compressão
router.post('/', authMiddleware, handleVideoUpload, async (req, res) => {
  let processed = null;
  let tempPath = null;

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum vídeo enviado' });
    }

    const { error, value } = videoSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const {
      description,
      parkId,
      obstacleId,
      challengeId,
      trimStart,
      trimEnd,
      thumbnailTime,
      targetFrameRate,
      slowMotionFactor,
      slowMotionStart,
      slowMotionEnd,
      trickId,
    } = value;

    let validatedChallengeId = null;
    if (challengeId) {
      try {
        const challengeCheck = await pool.query(
          'SELECT id FROM challenges WHERE id = $1',
          [challengeId]
        );

        if (challengeCheck.rows.length > 0) {
          validatedChallengeId = challengeId;
        } else {
          console.warn(`⚠️ Challenge ${challengeId} informado no upload não encontrado. Prosseguindo sem vincular.`);
        }
      } catch (challengeError) {
        console.warn(`⚠️ Erro ao validar challenge ${challengeId}:`, challengeError.message);
      }
    }
    let validatedTrickId = null;
    if (trickId) {
      try {
        const trickCheck = await pool.query(
          'SELECT id FROM tricks WHERE id = $1',
          [trickId]
        );

        if (trickCheck.rows.length > 0) {
          validatedTrickId = trickId;
        } else {
          console.warn(`⚠️ Trick ${trickId} informado no upload não encontrado. Prosseguindo sem vincular.`);
        }
      } catch (trickError) {
        console.warn(`⚠️ Erro ao validar trick ${trickId}:`, trickError.message);
      }
    }
    tempPath = req.file.path;
    const filename = req.file.filename;

    console.log(`🎬 Processando vídeo: ${filename}`);

    // Criar diretório de saída (mantém suporte local e ambiente ephemeral)
    const outputDir = path.join('uploads', 'videos', 'processed');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Processar vídeo (compressão + thumbnail)
    const processingOptions = {
      trimStart,
      trimEnd,
      thumbnailTime,
      targetFrameRate,
      slowMotionFactor,
      slowMotionStart,
      slowMotionEnd,
    };

    processed = await videoProcessor.processVideo(tempPath, outputDir, filename, processingOptions);

    // Obter informações do vídeo processado
    let videoInfo = processed.originalInfo || null;
    try {
      if (processed.compressed) {
        videoInfo = await videoProcessor.getVideoInfo(processed.compressed);
      }
    } catch (infoError) {
      console.warn('⚠️ Não foi possível obter metadados do vídeo processado:', infoError.message);
    }

    const canUseS3 = s3Client.isConfigured;
    let videoUrl = null;
    let thumbnailUrl = null;
    let uploadedToS3 = false;

    if (canUseS3) {
      try {
        const timestamp = Date.now();
        const userPrefix = req.user?.id || 'anonymous';

        const videoKey = path.posix.join(
          'videos',
          userPrefix,
          `${timestamp}-${path.basename(processed.compressed)}`
        );
        let thumbKey = null;
        if (processed.thumbnail) {
          thumbKey = path.posix.join(
            'thumbnails',
            userPrefix,
            `${timestamp}-${path.basename(processed.thumbnail)}`
          );
        }

        videoUrl = await s3Client.uploadFile(
          processed.compressed,
          videoKey,
          getContentType(processed.compressed)
        );
        if (processed.thumbnail && thumbKey) {
          thumbnailUrl = await s3Client.uploadFile(
            processed.thumbnail,
            thumbKey,
            'image/jpeg'
          );
        }
        uploadedToS3 = true;
      } catch (s3Error) {
        console.error('⚠️ Erro ao enviar arquivos para S3, utilizando armazenamento local:', s3Error);
      }
    }

    if (!videoUrl) {
      videoUrl = `/uploads/videos/processed/${path.basename(processed.compressed)}`;
    }
    if (videoUrl && !/^https?:\/\//i.test(videoUrl)) {
      videoUrl = buildAbsoluteUrl(req, videoUrl);
    }

    if (!thumbnailUrl && processed.thumbnail) {
      thumbnailUrl = `/uploads/videos/processed/${path.basename(processed.thumbnail)}`;
    }
    if (thumbnailUrl && !/^https?:\/\//i.test(thumbnailUrl)) {
      thumbnailUrl = buildAbsoluteUrl(req, thumbnailUrl);
    }

    let compressedStats = null;
    if (processed.compressed) {
      try {
        compressedStats = await fs.promises.stat(processed.compressed);
      } catch (statError) {
        console.warn('⚠️ Não foi possível obter tamanho do arquivo processado:', statError.message);
      }
    }

    const originalSizeBytes = processed.originalInfo?.size
      ?? videoInfo?.size
      ?? compressedStats?.size
      ?? 0;

    const compressedSizeBytes = processed.compressedInfo?.size
      ?? videoInfo?.size
      ?? compressedStats?.size
      ?? originalSizeBytes;

    // Inserir no banco de dados
    const result = await pool.query(`
      INSERT INTO videos (
        user_id, park_id, obstacle_id, trick_id, video_url, 
        thumbnail_url, description, duration, original_size, 
        compressed_size
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id, video_url, thumbnail_url, description, 
                duration, created_at, trick_id
    `, [
      req.user.id,
      parkId || null,
      obstacleId || null,
      validatedTrickId,
      videoUrl,
      thumbnailUrl,
      description || null,
      Math.ceil((videoInfo?.duration || 0) * 1000),
      Math.ceil(originalSizeBytes),
      Math.ceil(compressedSizeBytes)
    ]);

    const video = result.rows[0];

    if (validatedChallengeId) {
      await pool.query(
        `INSERT INTO user_challenge_completions (user_id, challenge_id, video_id, completed_at)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
         ON CONFLICT (user_id, challenge_id)
         DO UPDATE SET video_id = EXCLUDED.video_id,
                       completed_at = EXCLUDED.completed_at`,
        [req.user.id, validatedChallengeId, video.id]
      );
    }

    // Limpar arquivos temporários
    const cleanupTargets = [tempPath];
    if (uploadedToS3) {
      cleanupTargets.push(processed.compressed, processed.thumbnail);
    }
    videoProcessor.cleanup(cleanupTargets);

    // Verificar e conceder badges
    await checkAndAwardBadges(req.user.id, {
      type: 'video_upload',
      videoId: video.id,
      parkId: parkId,
      obstacleId: obstacleId
    });

    let xpResult = null;
    try {
      xpResult = await expSystem.handleVideoUpload({
        userId: req.user.id,
        videoId: video.id,
        parkId: parkId || null,
        obstacleId: obstacleId || null,
        challengeId: validatedChallengeId,
        trickId: validatedTrickId,
        trickName: description || null,
        description: description || '',
      });
    } catch (xpError) {
      console.error('Erro ao processar XP do vídeo:', xpError);
    }

    res.status(201).json({
      message: 'Vídeo enviado e processado com sucesso',
      video: {
        ...video,
        compression_savings: processed.originalInfo && processed.compressedInfo 
          ? Math.round((1 - processed.compressedInfo.size / processed.originalInfo.size) * 100)
          : 0,
        exp_awarded: xpResult?.video?.total ?? null,
        score_breakdown: xpResult?.video ? { xp: xpResult.video } : null,
      },
      xp: xpResult?.user ?? null
    });

  } catch (error) {
    console.error('❌ Erro ao enviar vídeo:', error);

    const cleanupTargets = [];
    if (tempPath) cleanupTargets.push(tempPath);
    if (processed?.compressed) cleanupTargets.push(processed.compressed);
    if (processed?.thumbnail) cleanupTargets.push(processed.thumbnail);
    if (cleanupTargets.length) {
      videoProcessor.cleanup(cleanupTargets);
    }

    res.status(500).json({ 
      error: 'Erro ao enviar vídeo',
      details: error?.stack || error?.message || String(error)
    });
  }
});

// Like video
router.post('/:id/like', authMiddleware, async (req, res) => {
  try {
    const videoId = req.params.id;
    const userId = req.user.id;

    // Check if video exists
    const videoResult = await pool.query(
      'SELECT id, user_id, description FROM videos WHERE id = $1',
      [videoId]
    );
    if (videoResult.rows.length === 0) {
      return res.status(404).json({ error: 'Vídeo não encontrado' });
    }
    const video = videoResult.rows[0];

    // Check if already liked
    const existingLike = await pool.query(
      'SELECT id FROM likes WHERE user_id = $1 AND video_id = $2',
      [userId, videoId]
    );

    if (existingLike.rows.length > 0) {
      // Unlike
      await pool.query('DELETE FROM likes WHERE user_id = $1 AND video_id = $2', [userId, videoId]);
      const updateResult = await pool.query(
        'UPDATE videos SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = $1 RETURNING likes_count',
        [videoId]
      );
      
      res.json({ 
        message: 'Like removido', 
        liked: false,
        likes_count: updateResult.rows[0].likes_count
      });
    } else {
      // Like
      await pool.query('INSERT INTO likes (user_id, video_id) VALUES ($1, $2)', [userId, videoId]);
      const updateResult = await pool.query(
        'UPDATE videos SET likes_count = likes_count + 1 WHERE id = $1 RETURNING likes_count',
        [videoId]
      );

      try {
        await notifyVideoOwner({
          video,
          actor: req.user,
          event: 'like'
        });
      } catch (notificationError) {
        console.error('Erro ao notificar curtida:', notificationError);
      }

      await checkAndAwardBadges(video.user_id, { type: 'like_received', videoId });
      
      res.json({ 
        message: 'Vídeo curtido', 
        liked: true,
        likes_count: updateResult.rows[0].likes_count
      });
    }

  } catch (error) {
    console.error('Erro ao curtir vídeo:', error);
    res.status(500).json({ error: 'Erro ao curtir vídeo' });
  }
});

// Comment on video
router.post('/:id/comments', authMiddleware, async (req, res) => {
  try {
    const videoId = req.params.id;
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Conteúdo do comentário é obrigatório' });
    }

    // Check if video exists
    const videoResult = await pool.query(
      'SELECT id, user_id, description FROM videos WHERE id = $1',
      [videoId]
    );
    if (videoResult.rows.length === 0) {
      return res.status(404).json({ error: 'Vídeo não encontrado' });
    }
    const video = videoResult.rows[0];
    const trimmedContent = content.trim();

    // Create comment
    const result = await pool.query(`
      INSERT INTO comments (user_id, video_id, content)
      VALUES ($1, $2, $3)
      RETURNING id, content, created_at
    `, [req.user.id, videoId, trimmedContent]);

    // Update comment count
    const updateResult = await pool.query(
      'UPDATE videos SET comments_count = comments_count + 1 WHERE id = $1 RETURNING comments_count',
      [videoId]
    );

    const comment = result.rows[0];
    comment.user = {
      id: req.user.id,
      username: req.user.username,
      full_name: req.user.full_name,
      profile_image_url: req.user.profile_image_url
    };

    try {
      await notifyVideoOwner({
        video,
        actor: req.user,
        event: 'comment',
        commentContent: trimmedContent
      });
    } catch (notificationError) {
      console.error('Erro ao notificar comentario:', notificationError);
    }

    res.status(201).json({
      message: 'Comentário adicionado',
      comment,
      comments_count: updateResult.rows[0].comments_count
    });

  } catch (error) {
    console.error('Erro ao comentar:', error);
    res.status(500).json({ error: 'Erro ao adicionar comentário' });
  }
});

// Get video comments
router.get('/:id/comments', async (req, res) => {
  try {
    const videoId = req.params.id;
    const { page = 1, limit = 10 } = req.query;
    const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
    const limitNumber = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
    const offset = (pageNumber - 1) * limitNumber;

    const result = await pool.query(`
      SELECT 
        c.id, c.content, c.created_at,
        u.id as user_id, u.username, u.full_name, u.profile_image_url
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.video_id = $1
      ORDER BY c.created_at DESC
      LIMIT $2 OFFSET $3
    `, [videoId, limitNumber, offset]);

    const comments = result.rows.map(row => ({
      id: row.id,
      content: row.content,
      created_at: row.created_at,
      user: {
        id: row.user_id,
        username: row.username,
        full_name: row.full_name,
        profile_image_url: row.profile_image_url
      }
    }));

    res.json({
      comments,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        hasMore: result.rows.length === limitNumber
      }
    });

  } catch (error) {
    console.error('Erro ao buscar comentários:', error);
    res.status(500).json({ error: 'Erro ao buscar comentários' });
  }
});

// Get user's videos
router.get('/user/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const result = await pool.query(`
      SELECT 
        v.id, v.video_url, v.thumbnail_url, v.description, v.duration,
        v.views_count, v.likes_count, v.comments_count,
        v.exp_awarded, v.score_breakdown,
        v.created_at,
        p.name as park_name, o.name as obstacle_name
      FROM videos v
      LEFT JOIN parks p ON v.park_id = p.id
      LEFT JOIN obstacles o ON v.obstacle_id = o.id
      WHERE v.user_id = $1
      ORDER BY v.created_at DESC
      LIMIT $2 OFFSET $3
    `, [userId, limit, offset]);

    res.json({
      videos: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        hasMore: result.rows.length === limit
      }
    });

  } catch (error) {
    console.error('Erro ao buscar vídeos do usuário:', error);
    res.status(500).json({ error: 'Erro ao buscar vídeos do usuário' });
  }
});

// Delete video
router.delete('/:id', authMiddleware, async (req, res) => {
  const videoId = req.params.id;

  try {
    const videoResult = await pool.query(
      'SELECT id, user_id, video_url, thumbnail_url FROM videos WHERE id = $1',
      [videoId]
    );

    if (videoResult.rows.length === 0) {
      return res.status(404).json({ error: 'Vídeo não encontrado' });
    }

    const video = videoResult.rows[0];
    const isOwner = video.user_id === req.user.id;
    const isModerator = req.user.role === 'moderator' || req.user.role === 'admin';

    if (!isOwner && !isModerator) {
      return res.status(403).json({ error: 'Você não tem permissão para remover este vídeo' });
    }

    try {
      await expSystem.revokeVideoExp({ userId: video.user_id, videoId });
    } catch (xpError) {
      console.error('Erro ao revogar XP do vídeo removido:', xpError);
    }

    await pool.query('DELETE FROM videos WHERE id = $1', [videoId]);

    await Promise.allSettled([
      removeMediaFile(video.video_url),
      removeMediaFile(video.thumbnail_url),
    ]);

    res.json({ message: 'Vídeo removido com sucesso' });
  } catch (error) {
    console.error('Erro ao remover vídeo:', error);
    res.status(500).json({ error: 'Erro ao remover vídeo' });
  }
});

// Servir arquivos estáticos de vídeo
router.use('/uploads/videos', express.static('uploads/videos'));

module.exports = router;
