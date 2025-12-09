import { NextResponse } from 'next/server';
import { sendVerificationEmail } from '@/lib/resend';

export async function GET() {
  try {
    await sendVerificationEmail(
      'seu_email_pessoal@gmail.com', // ← COLOQUE SEU E-MAIL AQUI
      'teste-12345'
    );
    return NextResponse.json({ success: true, message: 'E-mail enviado!' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
