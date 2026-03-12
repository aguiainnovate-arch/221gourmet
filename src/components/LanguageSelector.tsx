import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import brasilFlag from '../assets/brasilflag.svg';
import francaFlag from '../assets/francaflag.svg';
import usaFlag from '../assets/usaflag.svg';

interface LanguageSelectorProps {
  className?: string;
  /** Estilo do botão: 'light' (fundo escuro, texto claro) ou 'dark' (fundo claro, texto escuro) */
  variant?: 'light' | 'dark';
  /** Versão compacta (ex.: app nativo Capacitor) — padding e ícone menores */
  compact?: boolean;
}

const LANGUAGE_CODES = ['pt-BR', 'en-US', 'fr-FR'] as const;

function normalizeLang(code: string): (typeof LANGUAGE_CODES)[number] {
  if (code.startsWith('pt')) return 'pt-BR';
  if (code.startsWith('en')) return 'en-US';
  if (code.startsWith('fr')) return 'fr-FR';
  return 'pt-BR';
}

export default function LanguageSelector({ className = '', variant = 'light', compact = false }: LanguageSelectorProps) {
  const { i18n, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState<(typeof LANGUAGE_CODES)[number]>(() => normalizeLang(i18n.language || 'pt-BR'));
  const containerRef = useRef<HTMLDivElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  // Reposicionar dropdown ao abrir — manter dentro da viewport (evita corte no mobile)
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const padding = 8;
    const dropdownWidth = 180;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Abrir abaixo do botão
    let top = rect.bottom + 4;
    let left = rect.left;

    // Evitar que o dropdown saia pela direita
    if (left + dropdownWidth > viewportWidth - padding) {
      left = viewportWidth - dropdownWidth - padding;
    }
    // Evitar que saia pela esquerda
    if (left < padding) {
      left = padding;
    }
    // Evitar que saia por baixo (mobile: abrir para cima se não couber)
    const dropdownHeight = 3 * 40 + 16;
    if (top + dropdownHeight > viewportHeight - padding) {
      top = rect.top - dropdownHeight - 4;
    }
    if (top < padding) {
      top = padding;
    }

    setDropdownStyle({
      position: 'fixed',
      top,
      left,
      width: dropdownWidth,
      maxWidth: viewportWidth - padding * 2,
      zIndex: 99999,
    });
  }, [isOpen]);

  // Atualizar estado quando o idioma mudar (garante re-render em toda a app)
  useEffect(() => {
    const handler = (lng: string) => setCurrentLang(normalizeLang(lng));
    i18n.on('languageChanged', handler);
    setCurrentLang(normalizeLang(i18n.language));
    return () => i18n.off('languageChanged', handler);
  }, [i18n]);

  const languages = [
    { code: 'pt-BR' as const, name: t('language.portuguese'), flag: brasilFlag },
    { code: 'en-US' as const, name: t('language.english'), flag: usaFlag },
    { code: 'fr-FR' as const, name: t('language.french'), flag: francaFlag }
  ];

  const changeLanguage = (langCode: string) => {
    const normalized = normalizeLang(langCode);
    setCurrentLang(normalized);
    i18n.changeLanguage(normalized);
    localStorage.setItem('language', normalized);
    setIsOpen(false);
  };

  // Fechar dropdown quando clicar fora (considera botão e dropdown no portal)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (containerRef.current?.contains(target) || target.closest('[data-language-dropdown]')) return;
      setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentFlag = languages.find(lang => lang.code === currentLang)?.flag;

  const sizeClass = compact ? 'gap-1.5 px-2 py-1.5 rounded-md' : 'gap-2 px-3 py-2 rounded-lg';
  const buttonClass = variant === 'dark'
    ? `flex items-center bg-gray-100 text-gray-800 hover:bg-gray-200 transition-colors border border-gray-200 ${sizeClass}`
    : `flex items-center bg-white bg-opacity-20 text-white rounded-lg hover:bg-opacity-30 transition-colors ${sizeClass}`;

  const dropdownContent = isOpen ? (
    <div
      data-language-dropdown
      className="bg-white rounded-lg shadow-lg border border-gray-200 py-1"
      style={{ ...dropdownStyle, boxShadow: '0 10px 40px rgba(0,0,0,0.25)' }}
      role="listbox"
    >
      {languages.map((language) => (
        <button
          type="button"
          key={language.code}
          onClick={() => changeLanguage(language.code)}
          className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex items-center gap-2 ${currentLang === language.code
            ? 'bg-primary-50 text-primary-700 font-medium'
            : 'text-black'
            }`}
          role="option"
          aria-selected={currentLang === language.code}
        >
          {language.flag ? (
            <img src={language.flag} alt="" className="w-4 h-4" />
          ) : (
            <span>🌐</span>
          )}
          <span>{language.name}</span>
        </button>
      ))}
    </div>
  ) : null;

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={buttonClass}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <Globe size={compact ? 14 : 16} />
        <span className={compact ? 'text-xs' : 'text-sm'}>
          {currentFlag ? <img src={currentFlag} alt="" className={compact ? 'w-4 h-4' : 'w-5 h-5'} /> : '🌐'}
        </span>
      </button>

      {dropdownContent && createPortal(dropdownContent, document.body)}
    </div>
  );
}
