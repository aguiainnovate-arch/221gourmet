import { memo, useMemo, useState, type KeyboardEvent } from 'react';
import { MapPin, Star, Clock, Bike, Heart, Circle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Restaurant } from '../../types/restaurant';
import { getFeeSettings, formatFeePreview } from '../../utils/deliveryFee';
import {
  CHIP_TONE_STYLES,
  COVER_BADGE_STYLES,
  getRestaurantVisualIdentity,
  type CoverBadgeKind,
} from '../../utils/restaurantVisualIdentity';
import { isRestaurantOpenNow } from '../../utils/openingHours';

interface Props {
  restaurant: Restaurant;
  coverUrl?: string;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onClick: () => void;
}

/** Card compacto de listagem — capa panorâmica + painel branco sobreposto (ref. mockup). */
function DeliveryRestaurantCard({
  restaurant,
  coverUrl,
  isFavorite,
  onToggleFavorite,
  onClick,
}: Props) {
  const { t } = useTranslation();
  const [coverError, setCoverError] = useState(false);
  const identity = useMemo(() => getRestaurantVisualIdentity(restaurant), [restaurant]);
  const feeLabel = formatFeePreview(getFeeSettings(restaurant.deliverySettings?.fee));
  const logoUrl = restaurant.theme?.logo?.trim();
  const LogoIcon = identity.logo.icon;
  const openNow = isRestaurantOpenNow(restaurant.openingHours);
  const badgeKind: CoverBadgeKind =
    openNow === true ? 'open' : openNow === false ? 'closed' : identity.coverBadge;
  const coverBadge = COVER_BADGE_STYLES[badgeKind];
  const CoverBadgeIcon = coverBadge.icon;

  const handleCardKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <article
      className="group relative rounded-[1.15rem] transition-transform duration-200 active:scale-[0.985] pb-0.5"
      style={{
        boxShadow: '0 6px 22px rgba(42, 30, 26, 0.09)',
      }}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={handleCardKeyDown}
        className="w-full text-left block cursor-pointer rounded-[1.15rem] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E91120]/40"
      >
        {/* Capa panorâmica — altura maior; painel branco abaixo não muda */}
        <div
          className="relative h-[158px] w-full overflow-hidden rounded-t-[1.15rem]"
          style={{ backgroundColor: '#FAF0DB' }}
        >
          {coverUrl && !coverError ? (
            <img
              src={coverUrl}
              alt=""
              className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-[1.04]"
              loading="lazy"
              onError={() => setCoverError(true)}
            />
          ) : (
            <div className="w-full h-full" style={{ background: identity.logo.background }} />
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/5 to-transparent pointer-events-none" />

          {/* Badge — canto superior esquerdo */}
          <span
            className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold text-white shadow-sm"
            style={{ backgroundColor: coverBadge.bg }}
          >
            {badgeKind === 'open' ? (
              <Circle className="w-1.5 h-1.5 fill-white stroke-none" />
            ) : (
              <CoverBadgeIcon className="w-3 h-3" />
            )}
            {t(`delivery.${coverBadge.labelKey}`)}
          </span>

          {/* Favorito — canto superior direito */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite();
            }}
            className="absolute top-2.5 right-2.5 w-9 h-9 rounded-full flex items-center justify-center active:scale-95 transition-transform"
            style={{
              backgroundColor: 'rgba(255,255,255,0.97)',
              boxShadow: '0 2px 10px rgba(42, 30, 26, 0.15)',
            }}
            aria-label={isFavorite ? t('delivery.removeFavorite') : t('delivery.addFavorite')}
          >
            <Heart
              className={`w-4 h-4 ${
                isFavorite ? 'fill-[#E91120] stroke-[#E91120]' : 'stroke-[#2A1E1A] stroke-[2px]'
              }`}
            />
          </button>
        </div>

        {/* Painel branco sobreposto — conteúdo contido dentro da div */}
        <div
          className="relative z-10 -mt-14 mx-4 rounded-[1rem] bg-white px-3 pb-2.5 pt-2.5 border border-[#F0E4D4] overflow-hidden"
          style={{
            boxShadow: '0 4px 16px rgba(42, 30, 26, 0.1)',
          }}
        >
          <div className="flex items-start gap-2.5">
            {/* Logo — dentro do painel branco */}
            <div
              className="shrink-0 w-14 h-14 rounded-xl border-2 border-[#F0E4D4] overflow-hidden shadow-sm flex flex-col items-center justify-center text-white px-0.5"
              style={{
                background: logoUrl ? '#FFFFFF' : identity.logo.background,
              }}
            >
              {logoUrl ? (
                <img src={logoUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <>
                  <LogoIcon className="w-4 h-4 mb-0.5 opacity-95 shrink-0" strokeWidth={2.25} />
                  <span className="text-[9px] font-black uppercase leading-[1.05] text-center tracking-wide">
                    {identity.logoBrand.line1}
                  </span>
                  {identity.logoBrand.line2 && (
                    <span className="text-[9px] font-black uppercase leading-[1.05] text-center tracking-wide">
                      {identity.logoBrand.line2}
                    </span>
                  )}
                </>
              )}
            </div>

            {/* Texto ao lado do logo */}
            <div className="flex-1 min-w-0 pt-0.5">
              <h3
                className="font-bold text-[15px] leading-tight tracking-tight line-clamp-1"
                style={{ color: '#2A1E1A' }}
              >
                {restaurant.name}
              </h3>
              <p className="text-[11px] mt-0.5 font-medium line-clamp-1" style={{ color: '#6B5A54' }}>
                {identity.categoryLabel}
                {identity.categoryFlag ? ` ${identity.categoryFlag}` : ''}
              </p>

              {/* Métricas — linha simples */}
              <div
                className="flex flex-wrap items-center gap-x-1.5 gap-y-0 mt-1.5 text-[10px] font-semibold tabular-nums"
                style={{ color: '#5C4F49' }}
              >
                <span className="inline-flex items-center gap-0.5 shrink-0">
                  <Star className="w-3 h-3 text-[#F9CF4A] fill-[#F9CF4A]" />
                  4,5
                </span>
                <span className="text-[#D4C4B8]">|</span>
                <span className="inline-flex items-center gap-0.5 shrink-0">
                  <Clock className="w-3 h-3" style={{ color: '#8A7A74' }} />
                  {t('delivery.deliveryTimeShort', { min: 25, max: 35 })}
                </span>
                <span className="text-[#D4C4B8]">|</span>
                <span className="inline-flex items-center gap-0.5 shrink-0">
                  <Bike className="w-3 h-3" style={{ color: '#8A7A74' }} />
                  {feeLabel}
                </span>
              </div>

              {/* Chips compactos */}
              {identity.contentChips.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {identity.contentChips.map((chip) => {
                    const tone = CHIP_TONE_STYLES[chip.tone];
                    return (
                      <span
                        key={chip.id}
                        className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-bold border leading-none"
                        style={{
                          backgroundColor: tone.bg,
                          color: tone.color,
                          borderColor: tone.border,
                        }}
                      >
                        {chip.label}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Endereço — última linha, largura total */}
          <p
            className="text-[10px] flex items-start gap-1 mt-2 ml-0.5 leading-snug"
            style={{ color: '#9A8B85' }}
          >
            <MapPin className="w-3 h-3 shrink-0 mt-px opacity-80" />
            <span className="line-clamp-1">{restaurant.address}</span>
          </p>
        </div>
      </div>
    </article>
  );
}

export default memo(DeliveryRestaurantCard);
