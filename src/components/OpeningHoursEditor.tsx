import { Plus, Trash2 } from 'lucide-react';
import type { DayOpeningHours, RestaurantOpeningHours, Weekday } from '../types/restaurant';
import {
  cloneDayHours,
  DEFAULT_SECOND_INTERVAL,
  MAX_OPENING_INTERVALS,
  WEEKDAY_ORDER,
} from '../types/restaurant';
import { getDayIntervals, WEEKDAY_FULL_LABELS_PT } from '../utils/openingHours';
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
    [day]: cloneDayHours({
      ...hours[day],
      ...patch,
    }),
  };
}

export default function OpeningHoursEditor({ value, onChange }: OpeningHoursEditorProps) {
  return (
    <div className="space-y-3">
      {WEEKDAY_ORDER.map((day) => {
        const entry = value[day];
        const intervals = getDayIntervals(entry);
        return (
          <div
            key={day}
            className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-gray-50/70 px-3 py-2.5"
          >
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
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

              {entry.closed && (
                <span className="text-sm text-gray-500 sm:ml-auto">
                  Sem atendimento neste dia
                </span>
              )}
            </div>

            {!entry.closed && (
              <div className="sm:pl-0 space-y-2">
                {intervals.map((interval, index) => (
                  <div key={`${day}-${index}`} className="flex items-center gap-2 min-w-0">
                    <input
                      type="time"
                      value={interval.open}
                      onChange={(e) => {
                        const nextIntervals = intervals.map((item, i) =>
                          i === index ? { ...item, open: e.target.value } : item
                        );
                        onChange(updateDay(value, day, { intervals: nextIntervals }));
                      }}
                      className={`${panelInputClass} py-1.5`}
                      aria-label={`${WEEKDAY_FULL_LABELS_PT[day]} abertura ${index + 1}`}
                    />
                    <span className="text-gray-400 text-sm shrink-0">até</span>
                    <input
                      type="time"
                      value={interval.close}
                      onChange={(e) => {
                        const nextIntervals = intervals.map((item, i) =>
                          i === index ? { ...item, close: e.target.value } : item
                        );
                        onChange(updateDay(value, day, { intervals: nextIntervals }));
                      }}
                      className={`${panelInputClass} py-1.5`}
                      aria-label={`${WEEKDAY_FULL_LABELS_PT[day]} fechamento ${index + 1}`}
                    />
                    {intervals.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const nextIntervals = intervals.filter((_, i) => i !== index);
                          onChange(updateDay(value, day, { intervals: nextIntervals }));
                        }}
                        className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 shrink-0"
                        aria-label={`Remover intervalo ${index + 1} de ${WEEKDAY_FULL_LABELS_PT[day]}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}

                {intervals.length < MAX_OPENING_INTERVALS && (
                  <button
                    type="button"
                    onClick={() =>
                      onChange(
                        updateDay(value, day, {
                          intervals: [...intervals, { ...DEFAULT_SECOND_INTERVAL }],
                        })
                      )
                    }
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-700 hover:text-amber-800"
                  >
                    <Plus className="w-4 h-4" />
                    Adicionar 2º horário (pausa)
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
