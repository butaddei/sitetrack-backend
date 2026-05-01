import nodemailer from "nodemailer";
import { logger } from "./logger.js";

function createTransport() {
  const host = process.env["SMTP_HOST"];
  const port = parseInt(process.env["SMTP_PORT"] ?? "587", 10);
  const user = process.env["SMTP_USER"];
  const pass = process.env["SMTP_PASS"];

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

export async function sendPasswordResetEmail(
  toEmail: string,
  toName: string,
  resetToken: string,
): Promise<void> {
  const transport = createTransport();

  if (!transport) {
    logger.warn(
      "[mailer] SMTP not configured — reset token logged to console only",
    );
    logger.info(`[forgot-password] Token for ${toEmail}: ${resetToken}`);
    return;
  }

  const from = process.env["SMTP_FROM"] ?? process.env["SMTP_USER"];

  await transport.sendMail({
    from: `"SiteTrack" <${from}>`,
    to: toEmail,
    subject: "SiteTrack — Código de recuperação de senha",
    text: `Olá ${toName},\n\nO seu código de recuperação de senha é:\n\n${resetToken}\n\nEste código expira em 1 hora.\n\nSe não pediu a recuperação de senha, ignore este email.\n\nSiteTrack`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
        <h2 style="color:#f97316;margin-bottom:8px;">SiteTrack</h2>
        <p>Olá <strong>${toName}</strong>,</p>
        <p>O seu código de recuperação de senha é:</p>
        <div style="background:#f3f4f6;border-radius:12px;padding:20px;text-align:center;margin:24px 0;">
          <span style="font-size:32px;font-weight:900;letter-spacing:8px;color:#111;">${resetToken}</span>
        </div>
        <p style="color:#666;font-size:14px;">Este código expira em 1 hora.</p>
        <p style="color:#999;font-size:12px;">Se não pediu a recuperação de senha, ignore este email.</p>
      </div>
    `,
  });

  logger.info(`[mailer] Reset email sent to ${toEmail}`);
}
