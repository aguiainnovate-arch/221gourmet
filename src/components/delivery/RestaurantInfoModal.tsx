import { X, Clock, MapPin, Phone } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ModalOverlay from '../ModalOverlay';
import type { Restaurant } from '../../types/restaurant';
import { WEEKDAY_ORDER } from '../../types/restaurant';
import {
  WEEKDAY_SHORT_LABELS_PT,
  formatDayHoursLabel,
  hasConfiguredOpeningHours,
  isRestaurantOpenNow,
} from '../../utils/openingHours';

interface RestaurantInfoModalProps {
  restaurant: Restaurant;
  onClose: () => void;
}

export default function RestaurantInfoModal({ restaurant, onClose }: RestaurantInfoModalProps) {
  const { t } = useTranslation();
  const hours = restaurant.openingHours;
  const configured = hasConfiguredOpeningHours(hours);
  const openNow = isRestaurantOpenNow(hours);

  return (
    <ModalOverlay onBackdropClick={onClose} zIndexClass="z-[120]">
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[85dvh] overflow-hidden flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="restaurant-info-title"
      >
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3 border-b border-gray-100">
          <div className="min-w-0">
            <h2 id="restaurant-info-title" className="text-lg font-bold text-gray-900 truncate">
              {restaurant.name}
            </h2>
            {configured && openNow !== null && (
              <p className="mt-1 text-sm font-medium flex items-center gap-1.5">
                <span
                  className={`inline-block w-2 h-2 rounded-full ${
                    openNow ? 'bg-green-500' : 'bg-red-500'
                  }`}
                />
                <span className={openNow ? 'text-green-700' : 'text-red-600'}>
                  {openNow ? t('delivery.open') : t('delivery.closed')}
                </span>
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-500 shrink-0"
            aria-label={t('delivery.closeModal')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4 space-y-5">
          {(restaurant.address || restaurant.phone) && (
            <div className="space-y-2">
              {restaurant.address && (
                <p className="text-sm text-gray-600 flex items-start gap-2">
                  <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-gray-400" />
                  <span>{restaurant.address}</span>
                </p>
              )}
              {restaurant.phone && (
                <p className="text-sm text-gray-600 flex items-center gap-2">
                  <Phone className="w-4 h-4 shrink-0 text-gray-400" />
                  <span>{restaurant.phone}</span>
                </p>
              )}
            </div>
          )}

          <div>
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-amber-600" />
              <h3 className="text-sm font-semibold text-gray-900">
                {t('delivery.openingHours')}
              </h3>
            </div>

            {configured && hours ? (
              <ul className="space-y-1.5">
                {WEEKDAY_ORDER.map((day) => {
                  const entry = hours[day];
                  const label = formatDayHoursLabel(entry, t('delivery.closedDay'));
                  return (
                    <li
                      key={day}
                      className="flex items-center justify-between gap-3 text-sm py-1.5 border-b border-gray-50 last:border-0"
                    >
                      <span className="font-medium text-gray-700 w-10 shrink-0">
                        {WEEKDAY_SHORT_LABELS_PT[day]}
                      </span>
                      <span
                        className={`tabular-nums text-right ${
                          entry.closed ? 'text-gray-400' : 'text-gray-900'
                        }`}
                      >
                        {label}
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">{t('delivery.openingHoursUnavailable')}</p>
            )}
          </div>
        </div>
      </div>
    </ModalOverlay>
  );
}
