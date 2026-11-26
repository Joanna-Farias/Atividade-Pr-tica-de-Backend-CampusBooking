import type { Room } from '@prisma/client';
import type { RoomFilters } from '../../shared/types.js';
import { RoomRepository } from '../repositories/room.repository.js';

export class RoomService {
  private repo = new RoomRepository();

  async list(filters: RoomFilters): Promise<Room[]> {
    const rooms = await this.repo.list({
      ...filters,
      active: filters.active ?? true,
    });

    return rooms.sort((a, b) => {
      const nameCmp = a.name.localeCompare(b.name);
      return nameCmp !== 0 ? nameCmp : a.id - b.id;
    });
  }
}