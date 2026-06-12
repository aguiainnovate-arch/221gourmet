import { Compass, ClipboardList, Heart } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export type DeliveryNavTab = 'discover' | 'orders' | 'favorites';

interface Props {
  active: DeliveryNavTab;
  onChange: (tab: DeliveryNavTab) => void;
}

export default function DeliveryBottomNav({ active, onChange }: Props) {
  const { t } = useTranslation();

  const items: { id: DeliveryNavTab; label: string; icon: typeof Compass }[] = [
    { id: 'discover', label: t('delivery.navDiscover'), icon: Compass },
    { id: 'orders', label: t('delivery.navOrders'), icon: ClipboardList },
    { id: 'favorites', label: t('delivery.navFavorites'), icon: Heart },
  ];

  return (
    <nav
      className="shrink-0 border-t px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
      style={{ backgroundColor: '#FFFFFF', borderColor: '#E9D7C4' }}
      aria-label={t('delivery.mainNavigation')}
    >
      <div className="flex items-end justify-around max-w-lg mx-auto">
        {items.map(({ id, label, icon: Icon }) => {
          const selected = active === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              className="flex flex-col items-center gap-0.5 min-w-[72px] py-1 active:scale-95 transition-transform"
              aria-current={selected ? 'page' : undefined}
            >
              <Icon
                className="w-5 h-5"
                strokeWidth={selected ? 2.5 : 2}
                style={{ color: selected ? '#E91120' : '#6B5A54' }}
              />
              <span
                className="text-[10px] font-semibold"
                style={{ color: selected ? '#E91120' : '#6B5A54' }}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
