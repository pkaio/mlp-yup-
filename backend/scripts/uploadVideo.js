const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const FormData = require('form-data');

const API_BASE = process.env.API_BASE_URL || 'http://yupapp.us-east-2.elasticbeanstalk.com';
const EMAIL = process.env.API_EMAIL || 'teste1@yup.app';
const PASSWORD = process.env.API_PASSWORD || 'Yup@2025';

const usage = () => {
  console.log('Uso:');
  console.log('  API_EMAIL=seu_email API_PASSWORD=sua_senha node scripts/uploadVideo.js /caminho/video.mp4');
  console.log('');
  console.log('Variáveis opcionais:');
  console.log('  API_BASE_URL  -> base da API (padrão: http://yupapp.us-east-2.elasticbeanstalk.com)');
};

const main = async () => {
  const filePath = process.argv[2];
  const description = process.argv[3] || 'Upload automático';

  if (!filePath) {
    console.error('❌ Caminho do arquivo não informado.');
    usage();
    process.exit(1);
  }

  const resolvedPath = path.resolve(filePath);
  if (!fs.existsSync(resolvedPath)) {
    console.error(`❌ Arquivo não encontrado: ${resolvedPath}`);
    process.exit(1);
  }

  console.log('🔐 Efetuando login...');
  const loginResponse = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD })
  });

  if (!loginResponse.ok) {
    const error = await loginResponse.text();
    throw new Error(`Falha no login (${loginResponse.status}): ${error}`);
  }

  const loginData = await loginResponse.json();
  const token = loginData.token;

  console.log('📤 Enviando vídeo...');
  const form = new FormData();
  form.append('video', fs.createReadStream(resolvedPath));
  form.append('description', description);

  const uploadResponse = await fetch(`${API_BASE}/api/videos`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: form
  });

  const resultText = await uploadResponse.text();

  if (!uploadResponse.ok) {
    throw new Error(`Falha no upload (${uploadResponse.status}): ${resultText}`);
  }

  try {
    const result = JSON.parse(resultText);
    console.log('✅ Upload realizado com sucesso!');
    console.log('Video URL:', result.video?.video_url || result.video_url);
    console.log('Thumbnail URL:', result.video?.thumbnail_url || result.thumbnail_url);
  } catch (parseErr) {
    console.log('✅ Upload realizado com sucesso (resposta bruta):');
    console.log(resultText);
  }
};

main().catch((err) => {
  console.error('❌ Erro:', err.message);
  process.exit(1);
});
