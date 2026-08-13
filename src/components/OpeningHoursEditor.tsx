import type { DayOpeningHours, RestaurantOpeningHours, Weekday } from '../types/restaurant';
import { WEEKDAY_ORDER } from '../types/restaurant';
import { WEEKDAY_FULL_LABELS_PT } from '../utils/openingHours';
import { panelInputClass, panelLabelClass } from './panel/panelStyles';

interface OpeningHoursEditorProps {
  value: RestaurantOpeningHours;
  onChange: (next: RestaurantOpeningHours) => void;
}

function updateDay(
  hours: RestaurantOpeningHours,
  day: Weekday,
  patch: Partial<DayOpeningHours>
): RestaurantOpeningHours {
  return {
    ...hours,
    [day]: {
      ...hours[day],
      ...patch,
    },
  };
}

export default function OpeningHoursEditor({ value, onChange }: OpeningHoursEditorProps) {
  return (
    <div className="space-y-3">
      {WEEKDAY_ORDER.map((day) => {
        const entry = value[day];
        return (
          <div
            key={day}
            className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 rounded-lg border border-gray-200 bg-gray-50/70 px-3 py-2.5"
          >
            <div className="sm:w-36 shrink-0">
              <span className={panelLabelClass}>{WEEKDAY_FULL_LABELS_PT[day]}</span>
            </div>

            <label className="inline-flex items-center gap-2 text-sm text-gray-700 shrink-0">
              <input
                type="checkbox"
                checked={entry.closed}
                onChange={(e) =>
                  onChange(updateDay(value, day, { closed: e.target.checked }))
                }
                className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
              />
              Fechado
            </label>

            {!entry.closed && (
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <input
                  type="time"
                  value={entry.open}
                  onChange={(e) => onChange(updateDay(value, day, { open: e.target.value }))}
                  className={`${panelInputClass} py-1.5`}
                  aria-label={`${WEEKDAY_FULL_LABELS_PT[day]} abertura`}
                />
                <span className="text-gray-400 text-sm shrink-0">até</span>
                <input
                  type="time"
                  value={entry.close}
                  onChange={(e) => onChange(updateDay(value, day, { close: e.target.value }))}
                  className={`${panelInputClass} py-1.5`}
                  aria-label={`${WEEKDAY_FULL_LABELS_PT[day]} fechamento`}
                />
              </div>
            )}

            {entry.closed && (
              <span className="text-sm text-gray-500 sm:ml-auto">Sem atendimento neste dia</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
