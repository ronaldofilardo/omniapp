import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

// Redis para status dos jobs
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const JOB_STATUS_PREFIX = 'job:';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;

  if (!jobId) {
    return NextResponse.json({ error: 'Job ID é obrigatório' }, { status: 400 });
  }

  try {
    // Buscar status do job no Redis
    const jobData = await redis.get(`${JOB_STATUS_PREFIX}${jobId}`);

    if (!jobData) {
      return NextResponse.json({
        error: 'Job não encontrado ou expirado'
      }, { status: 404 });
    }

    const job = JSON.parse(jobData as string);

    // Retornar status do job
    const response = {
      jobId,
      status: job.status,
      createdAt: job.createdAt,
      ...(job.startedAt && { startedAt: job.startedAt }),
      ...(job.completedAt && { completedAt: job.completedAt }),
      ...(job.failedAt && { failedAt: job.failedAt }),
      ...(job.error && { error: job.error }),
      ...(job.result && { result: job.result })
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Erro ao consultar status do job:', error);
    return NextResponse.json({
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
}