import type { Request, Response } from 'express';
import { z } from 'zod';
import { BuildingService } from '../../infrastructure/services/building.service.js';
import { AppError } from '../../shared/errors/AppError.js';

const buildingParamsSchema = z.object({
  buildingId: z.coerce.number().int().positive(),
});

const usageQuerySchema = z
  .object({
    date: z
      .string({ required_error: 'O parâmetro date é obrigatório.' })
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'A data deve estar no formato YYYY-MM-DD.'),
  })
  .strict();

export class BuildingController {
  private service = new BuildingService();

  usage = async (req: Request, res: Response): Promise<void> => {
    const { buildingId } = buildingParamsSchema.parse(req.params);
    const { date } = usageQuerySchema.parse(req.query);

    // Verifica se a data do calendário realmente existe (ex: rejeita 2026-02-30)
    const parsed = new Date(`${date}T00:00:00.000Z`);
    if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
      throw new AppError(400, 'INVALID_DATE', 'Data inválida.');
    }

    const result = await this.service.usage(buildingId, date);
    res.status(200).json(result);
  };
}