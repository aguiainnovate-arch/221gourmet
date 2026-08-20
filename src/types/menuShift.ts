/** Onde o turno aparece para o cliente. */
export type MenuShiftChannel = 'dine_in' | 'delivery' | 'both';

export interface MenuShift {
  id: string;
  name: string;
  /** HH:mm */
  start: string;
  /** HH:mm — pode passar da meia-noite (ex.: 18:00–02:00). */
  end: string;
  channels: MenuShiftChannel;
  enabled: boolean;
}

export const MAX_MENU_SHIFTS = 8;

function isValidTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value.trim());
}

function parseChannel(value: unknown): MenuShiftChannel {
  if (value === 'dine_in' || value === 'delivery' || value === 'both') return value;
  return 'both';
}

export function createMenuShiftId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `shift-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createEmptyMenuShift(): MenuShift {
  return {
    id: createMenuShiftId(),
    name: '',
    start: '11:00',
    end: '15:00',
    channels: 'both',
    enabled: true,
  };
}

export function createTypicalMenuShifts(): MenuShift[] {
  return [
    {
      id: createMenuShiftId(),
      name: 'Café da manhã',
      start: '07:00',
      end: '11:00',
      channels: 'both',
      enabled: true,
    },
    {
      id: createMenuShiftId(),
      name: 'Almoço',
      start: '11:00',
      end: '16:00',
      channels: 'both',
      enabled: true,
    },
    {
      id: createMenuShiftId(),
      name: 'Jantar',
      start: '18:00',
      end: '23:00',
      channels: 'both',
      enabled: true,
    },
  ];
}

export function normalizeMenuShifts(raw: unknown): MenuShift[] {
  if (!Array.isArray(raw)) return [];
  const shifts: MenuShift[] = [];
  const seen = new Set<string>();

  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const rec = item as Record<string, unknown>;
    const name = typeof rec.name === 'string' ? rec.name.trim() : '';
    const start = typeof rec.start === 'string' ? rec.start.trim() : '';
    const end = typeof rec.end === 'string' ? rec.end.trim() : '';
    if (!name || !isValidTime(start) || !isValidTime(end)) continue;
    const id =
      typeof rec.id === 'string' && rec.id.trim() && !seen.has(rec.id.trim())
        ? rec.id.trim()
        : createMenuShiftId();
    seen.add(id);
    shifts.push({
      id,
      name,
      start,
      end,
      channels: parseChannel(rec.channels),
      enabled: rec.enabled !== false,
    });
    if (shifts.length >= MAX_MENU_SHIFTS) break;
  }

  return shifts;
}

export function menuShiftChannelLabel(channel: MenuShiftChannel): string {
  switch (channel) {
    case 'dine_in':
      return 'Só nas mesas (QR Code)';
    case 'delivery':
      return 'Só no delivery';
    default:
      return 'Mesas e delivery';
  }
}
