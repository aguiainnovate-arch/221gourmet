import LanguageSelector from '../LanguageSelector';

interface MenuHeaderProps {
  restaurantName: string;
  tableLabel: string;
}

export default function MenuHeader({ restaurantName, tableLabel }: MenuHeaderProps) {
  return (
    <header className="menu-header relative overflow-hidden">
      <div className="menu-header-pattern pointer-events-none absolute inset-0" aria-hidden="true" />

      <div className="relative z-10 px-5 pt-10 pb-16 max-w-lg mx-auto">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="font-serif text-[1.75rem] font-bold leading-tight text-white tracking-tight">
              {restaurantName}
            </h1>
            <p className="mt-1 text-sm font-medium text-white/75">{tableLabel}</p>
          </div>
          <LanguageSelector variant="header" className="shrink-0 mt-1" />
        </div>
      </div>

      <div className="menu-header-wave pointer-events-none absolute bottom-0 left-0 right-0 leading-none" aria-hidden="true">
        <svg
          viewBox="0 0 1440 49"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="block w-full h-8 sm:h-10"
          preserveAspectRatio="none"
        >
          <path
            d="M0 24C240 48 480 0 720 24C960 48 1200 0 1440 24V49H0V24Z"
            style={{ fill: 'var(--menu-bg, #f7f4fc)' }}
          />
        </svg>
      </div>
    </header>
  );
}
