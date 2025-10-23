const fs = require('fs');
const path = require('path');
const AWS = require('aws-sdk');

const { 
  AWS_S3_BUCKET: bucket, 
  AWS_REGION: region,
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY 
} = process.env;

if (region) {
  AWS.config.update({ region });
}

const s3 = new AWS.S3({
  signatureVersion: 'v4'
});

const isConfigured = Boolean(bucket && AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY);

const getPublicUrl = (key) => {
  if (!bucket) return null;
  const normalizedKey = key.replace(/^\//, '');
  if (region && region !== 'us-east-1') {
    return `https://${bucket}.s3.${region}.amazonaws.com/${normalizedKey}`;
  }
  return `https://${bucket}.s3.amazonaws.com/${normalizedKey}`;
};

const uploadFile = async (filePath, key, contentType) => {
  if (!isConfigured) {
    throw new Error('AWS S3 não está configurado. Verifique variáveis de ambiente.');
  }

  const normalizedKey = path.posix.join(...key.split(path.sep));

  const uploadParams = {
    Bucket: bucket,
    Key: normalizedKey,
    Body: fs.createReadStream(filePath),
    CacheControl: 'public, max-age=31536000, immutable'
  };

  if (contentType) {
    uploadParams.ContentType = contentType;
  }

  uploadParams.Expires = new Date(Date.now() + 31536000000);

  await s3.upload(uploadParams).promise();

  return getPublicUrl(normalizedKey);
};

const deleteFile = async (key) => {
  if (!isConfigured || !key) {
    return;
  }
  await s3.deleteObject({
    Bucket: bucket,
    Key: key,
  }).promise();
};

const getKeyFromUrl = (fileUrl) => {
  if (!fileUrl || !bucket) {
    return null;
  }

  const normalizedUrl = fileUrl.split('?')[0];

  const s3Pattern = normalizedUrl.includes('.amazonaws.com/')
    ? normalizedUrl.split('.amazonaws.com/')[1]
    : null;

  if (s3Pattern) {
    return s3Pattern.replace(/^\/+/, '');
  }

  const bucketPrefix = `https://${bucket}.s3.amazonaws.com/`;
  if (normalizedUrl.startsWith(bucketPrefix)) {
    return normalizedUrl.slice(bucketPrefix.length);
  }

  const regionalPrefix = `https://${bucket}.s3.${region}.amazonaws.com/`;
  if (region && normalizedUrl.startsWith(regionalPrefix)) {
    return normalizedUrl.slice(regionalPrefix.length);
  }

  return null;
};

module.exports = {
  isConfigured,
  uploadFile,
  getPublicUrl,
  deleteFile,
  getKeyFromUrl
};
