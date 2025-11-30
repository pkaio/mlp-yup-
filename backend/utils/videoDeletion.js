const path = require('path');
const fs = require('fs');
const pool = require('../config/database');
const expSystem = require('./expSystem');
const { recalculateQuestProgress } = require('./skillTreeSystem');
const s3Client = require('./s3Client');

const MEDIA_ROOT = path.join(__dirname, '..');

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

const canModerate = (user) =>
  user && (user.role === 'moderator' || user.role === 'admin' || user.role === 'super_moderator');

const deleteVideoAndCleanup = async ({ videoId, actingUser, force = false }) => {
  const videoResult = await pool.query(
    'SELECT id, user_id, video_url, thumbnail_url, quest_node_id FROM videos WHERE id = $1',
    [videoId],
  );

  if (videoResult.rows.length === 0) {
    return { status: 404, message: 'Vídeo não encontrado' };
  }

  const video = videoResult.rows[0];
  const isOwner = actingUser && video.user_id === actingUser.id;
  const isAllowed = force || isOwner || canModerate(actingUser);

  if (!isAllowed) {
    return { status: 403, message: 'Você não tem permissão para remover este vídeo' };
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

  if (video.quest_node_id) {
    recalculateQuestProgress(video.user_id, video.quest_node_id).catch((recalcError) => {
      console.error('Erro ao recalcular progresso da quest:', recalcError);
    });
  }

  return { status: 200, message: 'Vídeo removido com sucesso' };
};

module.exports = {
  deleteVideoAndCleanup,
  removeMediaFile,
  canModerate,
};
