import { Resend } from 'resend';

let resendInstance: Resend | null = null;

export const getResend = () => {
  if (!resendInstance) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY is required');
    }
    resendInstance = new Resend(apiKey);
  }
  return resendInstance;
};

export async function sendVerificationEmail(email: string, token: string) {
  const confirmLink = `${process.env.NEXT_PUBLIC_APP_URL}/auth/verify-email?token=${token}`;

  await getResend().emails.send({
    from: 'Omni Saúde <no-reply@omniapp.online>',
    to: email,
    subject: 'Confirme seu e-mail - Omni Saúde',
    html: `
      <h2>Bem-vindo à Omni Saúde!</h2>
      <p>Para finalizar seu cadastro, clique no botão abaixo:</p>
      <p style="text-align:center;margin:30px 0;">
        <a href="${confirmLink}" style="background:#0066cc;color:white;padding:14px 28px;text-decoration:none;border-radius:8px;font-size:16px;">
          Confirmar e-mail
        </a>
      </p>
      <p>Ou copie este link:<br><strong>${confirmLink}</strong></p>
      <p>Validade: 1 hora</p>
    `,
  });
}
