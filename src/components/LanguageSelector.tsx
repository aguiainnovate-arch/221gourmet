import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import brasilFlag from '../assets/brasilflag.svg';
import espanhaFlag from '../assets/espanhaflag.svg';
import francaFlag from '../assets/francaflag.svg';
import usaFlag from '../assets/usaflag.svg';

interface LanguageSelectorProps {
  className?: string;
}

export default function LanguageSelector({ className = '' }: LanguageSelectorProps) {
  const { i18n, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const languages = [
    { code: 'pt-BR', name: t('language.portuguese'), flag: brasilFlag },
    { code: 'en-US', name: t('language.english'), flag: usaFlag },
    { code: 'es-ES', name: t('language.spanish'), flag: espanhaFlag },
    { code: 'fr-FR', name: t('language.french'), flag: francaFlag }
  ];

  const changeLanguage = (langCode: string) => {
    i18n.changeLanguage(langCode);
    localStorage.setItem('language', langCode);
    setIsOpen(false);
  };

  // Fechar dropdown quando clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-white bg-opacity-20 text-white px-3 py-2 rounded-lg hover:bg-opacity-30 transition-colors"
      >
        <Globe size={16} />
        <span className="text-sm">
          {(() => {
            const currentLang = languages.find(lang => lang.code === i18n.language);
            if (currentLang && currentLang.flag) {
              return <img src={currentLang.flag} alt="flag" className="w-5 h-5" />;
            }
            return '🌐';
          })()}
        </span>
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[160px] z-50">
          {languages.map((language) => (
            <button
              key={language.code}
              onClick={() => changeLanguage(language.code)}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex items-center gap-2 ${i18n.language === language.code
                ? 'bg-primary-50 text-primary-700 font-medium'
                : 'text-gray-700'
                }`}
            >
              {language.flag ? (
                <img src={language.flag} alt="flag" className="w-4 h-4" />
              ) : (
                <span>🌐</span>
              )}
              <span>{language.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
