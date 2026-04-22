import { z } from 'zod';
import type { FastifyReply, FastifyRequest } from 'fastify';

const agreementSchema = z
  .object({
    agreedToTerms: z.literal(true),
  })
  .passthrough();

export async function requireCopyrightAgreement(request: FastifyRequest, reply: FastifyReply) {
  const parsed = agreementSchema.safeParse(request.body ?? {});

  if (parsed.success) {
    return;
  }

  await reply.status(400).send({
    message: '请先勾选版权声明后再继续',
    code: 'COPYRIGHT_AGREEMENT_REQUIRED',
  });
}
