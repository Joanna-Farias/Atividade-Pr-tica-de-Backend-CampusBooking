import { z } from 'zod';

const isoDateTimeWithOffset = z
  .string()
  .datetime({ offset: true, message: 'Data/hora deve estar no padrão ISO 8601 com offset.' });

export const createBookingSchema = z
  .object({
    userId: z.number().int().positive(),
    roomId: z.number().int().positive(),
    startAt: isoDateTimeWithOffset,
    endAt: isoDateTimeWithOffset,
    purpose: z.string().trim().min(1, 'Finalidade obrigatória.').max(200, 'Máximo de 200 caracteres.'),
  })
  .strict();

export const updateBookingSchema = z
  .object({
    roomId: z.number().int().positive().optional(),
    startAt: isoDateTimeWithOffset.optional(),
    endAt: isoDateTimeWithOffset.optional(),
    purpose: z
      .string()
      .trim()
      .min(1, 'Finalidade não pode ser vazia.')
      .max(200, 'Máximo de 200 caracteres.')
      .optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Pelo menos um campo deve ser informado para atualização.',
  });