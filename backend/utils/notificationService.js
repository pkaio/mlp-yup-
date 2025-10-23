const pool = require('../config/database');

const DEFAULT_MAX_DESCRIPTION = 80;

const getDisplayName = (user) => {
  if (!user) {
    return 'Um atleta';
  }
  return user.full_name || user.username || 'Um atleta';
};

const truncate = (text, maxLength = DEFAULT_MAX_DESCRIPTION) => {
  if (!text) {
    return '';
  }
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength - 3).trimEnd() + '...';
};

const sanitizeData = (data = {}) => {
  return Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined && value !== null)
  );
};

async function createNotification({ userId, type, title, message, data = {} }) {
  if (!userId) {
    return null;
  }

  const payload = sanitizeData(data);

  const result = await pool.query(
    `
      INSERT INTO notifications (user_id, type, title, message, data)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, type, title, message, data, is_read, created_at
    `,
    [
      userId,
      type,
      title,
      message,
      Object.keys(payload).length > 0 ? JSON.stringify(payload) : null
    ]
  );

  return result.rows[0];
}

async function notifyVideoOwner({ video, actor, event, commentContent = null }) {
  if (!video?.user_id || !actor?.id) {
    return null;
  }

  // Skip self-notifications
  if (video.user_id === actor.id) {
    return null;
  }

  const actorName = getDisplayName(actor);
  const videoSnippet = truncate(video.description);

  let title;
  let message;
  const data = {
    video_id: video.id,
    actor_id: actor.id,
    actor_username: actor.username,
    actor_full_name: actor.full_name
  };

  if (event === 'like') {
    title = 'Nova curtida no seu video';
    message = videoSnippet
      ? `${actorName} curtiu seu video: "${videoSnippet}"`
      : `${actorName} curtiu seu video`;
  } else if (event === 'comment') {
    title = 'Novo comentario no seu video';
    message = `${actorName} comentou no seu video`;
    if (commentContent) {
      data.comment_preview = truncate(commentContent, DEFAULT_MAX_DESCRIPTION);
    }
  } else {
    return null;
  }

  return createNotification({
    userId: video.user_id,
    type: event,
    title,
    message,
    data
  });
}

module.exports = {
  createNotification,
  notifyVideoOwner
};
