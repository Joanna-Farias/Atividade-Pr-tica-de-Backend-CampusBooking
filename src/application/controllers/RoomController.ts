import type { Request, Response } from 'express';
import { z } from 'zod';
import { RoomType } from '@prisma/client';
import { RoomService } from '../../infrastructure/services/room.service.js';

const roomQuerySchema = z
  .object({
    buildingId: z.coerce.number().int().positive().optional(),
    type: z.nativeEnum(RoomType).optional(),
    minCapacity: z.coerce.number().int().positive().optional(),
    active: z
      .enum(['true', 'false'])
      .transform((val) => val === 'true')
      .optional(),
    name: z.string().trim().min(1).optional(),
  })
  .strict();

export class RoomController {
  private service = new RoomService();

  list = async (req: Request, res: Response): Promise<void> => {
    const filters = roomQuerySchema.parse(req.query);
    const rooms = await this.service.list(filters);
    res.status(200).json(rooms);
  };
}