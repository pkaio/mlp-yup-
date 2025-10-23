const nodemailer = require('nodemailer');

let transporter;

function getTransporter() {
  if (transporter) {
    return transporter;
  }

  const {
    SMTP_HOST,
    SMTP_PORT = 587,
    SMTP_SECURE,
    SMTP_USER,
    SMTP_PASS,
  } = process.env;

  if (!SMTP_HOST) {
    throw new Error('SMTP_HOST não configurado. Defina as variáveis de e-mail no backend.');
  }

  const port = Number(SMTP_PORT);
  const secure = SMTP_SECURE === 'true' || port === 465;

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure,
    auth:
      SMTP_USER && SMTP_PASS
        ? {
            user: SMTP_USER,
            pass: SMTP_PASS,
          }
        : undefined,
  });

  return transporter;
}

function buildVerificationEmail(code) {
  const appName = process.env.APP_NAME || "Y'UP";
  const supportEmail = process.env.SUPPORT_EMAIL || process.env.SMTP_FROM || process.env.SMTP_USER;

  const text = [
    `Olá!`,
    '',
    `Aqui está o seu código de verificação para acessar o ${appName}:`,
    '',
    `${code}`,
    '',
    'Este código expira em 15 minutos. Caso não tenha solicitado este e-mail, ignore esta mensagem.',
    '',
    supportEmail ? `Se precisar de ajuda, fale com a gente: ${supportEmail}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; background: #ffffff; border-radius: 16px; border: 1px solid #e5e7eb;">
      <div style="text-align: center;">
        <h1 style="color: #ee4b22; font-size: 24px; margin-bottom: 16px;">${appName}</h1>
        <p style="color: #1f2937; font-size: 16px; margin-bottom: 24px;">
          Use o código abaixo para verificar seu e-mail. Ele expira em 15 minutos.
        </p>
        <div style="display: inline-block; padding: 16px 32px; border-radius: 999px; background: #161616; color: #ffffff; font-size: 32px; letter-spacing: 8px; font-weight: bold;">
          ${code}
        </div>
        <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
          Se você não solicitou este código, pode ignorar este e-mail com segurança.
        </p>
        ${
          supportEmail
            ? `<p style="color: #6b7280; font-size: 14px;">Precisa de ajuda? Escreva para <a href="mailto:${supportEmail}" style="color: #1f4488;">${supportEmail}</a></p>`
            : ''
        }
      </div>
    </div>
  `;

  return { text, html };
}

async function sendVerificationEmail(to, code) {
  const transport = getTransporter();

  const from =
    process.env.SMTP_FROM ||
    process.env.EMAIL_FROM ||
    process.env.SMTP_USER ||
    `"Y'UP" <no-reply@yup.app>`;

  const { text, html } = buildVerificationEmail(code);

  await transport.sendMail({
    from,
    to,
    subject: "Código de verificação - Y'UP",
    text,
    html,
  });
}

module.exports = {
  sendVerificationEmail,
};
