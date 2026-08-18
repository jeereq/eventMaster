import type { RoomType } from '@prisma/client';
import { generateRoomBlueprint, type TableShape } from '../../src/services/roomLayoutService';

const TABLE_SHAPES: TableShape[] = ['round', 'rectangular', 'square', 'oval'];

/** Plan 2D réaliste pour le seed (SIMPLE / CUSTOM → banquet pour ne pas laisser le canvas vide). */
export function seedRoomBlueprint(roomType: RoomType, salt = 0) {
  const mapped: RoomType =
    roomType === 'SIMPLE' || roomType === 'CUSTOM' ? 'BANQUET' : roomType;
  const blueprint = generateRoomBlueprint(mapped, {
    tableCount: 6 + (salt % 10),
    seatsPerTable: 6 + (salt % 3) * 2,
    tableShape: TABLE_SHAPES[salt % TABLE_SHAPES.length],
    rowCount: 5 + (salt % 6),
    seatsPerRow: 8 + (salt % 5),
    tentWidthM: 16 + (salt % 8),
    tentLengthM: 22 + (salt % 10),
    chairType: mapped === 'AMPHITHEATER' || mapped === 'CONFERENCE' ? 'THEATER' : 'BANQUET',
  });
  return { ...blueprint, roomType };
}
