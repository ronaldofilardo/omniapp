'use server';

import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';

export async function verifyEmailToken(token: string) {
  const verificationToken = await prisma.verificationToken.findUnique({
    where: { token },
  });

  if (!verificationToken) {
    return { success: false, error: 'Token inválido.' };
  }

  if (verificationToken.expires < new Date()) {
    await prisma.verificationToken.delete({ where: { token } });
    return { success: false, error: 'Este link expirou.' };
  }

  // Marca o usuário como verificado
  await prisma.user.update({
    where: { email: verificationToken.identifier },
    data: { emailVerified: new Date() },
  });

  // Remove o token usado
  await prisma.verificationToken.delete({ where: { token } });

  return { success: true };
}
