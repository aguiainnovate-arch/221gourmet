import type {
  DayOpeningHours,
  OpeningHoursInterval,
  RestaurantOpeningHours,
  Weekday,
} from '../types/restaurant';
import { WEEKDAY_ORDER } from '../types/restaurant';

const WEEKDAY_FROM_JS: Weekday[] = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
];

export const WEEKDAY_SHORT_LABELS_PT: Record<Weekday, string> = {
  monday: 'Seg',
  tuesday: 'Ter',
  wednesday: 'Qua',
  thursday: 'Qui',
  friday: 'Sex',
  saturday: 'Sáb',
  sunday: 'Dom',
};

export const WEEKDAY_FULL_LABELS_PT: Record<Weekday, string> = {
  monday: 'Segunda-feira',
  tuesday: 'Terça-feira',
  wednesday: 'Quarta-feira',
  thursday: 'Quinta-feira',
  friday: 'Sexta-feira',
  saturday: 'Sábado',
  sunday: 'Domingo',
};

function parseTimeToMinutes(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export function getDayIntervals(day: DayOpeningHours): OpeningHoursInterval[] {
  if (Array.isArray(day.intervals) && day.intervals.length > 0) {
    return day.intervals;
  }
  if (day.open?.trim() && day.close?.trim()) {
    return [{ open: day.open, close: day.close }];
  }
  return [];
}

export function isTimeWithinInterval(currentMin: number, open: string, close: string): boolean {
  const openMin = parseTimeToMinutes(open);
  const closeMin = parseTimeToMinutes(close);
  if (openMin === null || closeMin === null) return false;

  // Intervalo atravessa meia-noite (ex.: 18:00–02:00)
  if (closeMin <= openMin) {
    return currentMin >= openMin || currentMin < closeMin;
  }

  return currentMin >= openMin && currentMin < closeMin;
}

export function formatDayHoursLabel(day: DayOpeningHours, closedLabel = 'Fechado'): string {
  if (day.closed) return closedLabel;
  const intervals = getDayIntervals(day);
  if (intervals.length === 0) return closedLabel;
  return intervals
    .map((interval) => {
      const open = interval.open?.trim() || '--:--';
      const close = interval.close?.trim() || '--:--';
      return `${open} - ${close}`;
    })
    .join('  ·  ');
}

export function hasConfiguredOpeningHours(hours?: RestaurantOpeningHours | null): boolean {
  if (!hours) return false;
  return WEEKDAY_ORDER.some((day) => {
    const entry = hours[day];
    if (!entry) return false;
    if (entry.closed) return true;
    return getDayIntervals(entry).some(
      (interval) => Boolean(interval.open?.trim() && interval.close?.trim())
    );
  });
}

export function isRestaurantOpenNow(
  hours?: RestaurantOpeningHours | null,
  now: Date = new Date()
): boolean | null {
  if (!hasConfiguredOpeningHours(hours) || !hours) return null;

  const weekday = WEEKDAY_FROM_JS[now.getDay()];
  const day = hours[weekday];
  if (!day || day.closed) return false;

  const intervals = getDayIntervals(day);
  if (intervals.length === 0) return false;

  const currentMin = now.getHours() * 60 + now.getMinutes();
  return intervals.some((interval) =>
    isTimeWithinInterval(currentMin, interval.open, interval.close)
  );
}

export function getTodayHoursLabel(
  hours?: RestaurantOpeningHours | null,
  closedLabel = 'Fechado'
): string | null {
  if (!hasConfiguredOpeningHours(hours) || !hours) return null;
  const weekday = WEEKDAY_FROM_JS[new Date().getDay()];
  return formatDayHoursLabel(hours[weekday], closedLabel);
}
