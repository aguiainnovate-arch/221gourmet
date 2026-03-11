import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Importing translation files (trilingual: Portuguese, English, French)
import ptBR from './locales/pt-BR.json';
import enUS from './locales/en-US.json';
import frFR from './locales/fr-FR.json';

const resources = {
  'pt-BR': {
    translation: ptBR
  },
  'en-US': {
    translation: enUS
  },
  'fr-FR': {
    translation: frFR
  }
};

// Get saved language from localStorage or default to pt-BR
const savedLanguage = localStorage.getItem('language') || 'pt-BR';

i18n
  .use(initReactI18next) // passes i18n down to react-i18next
  .init({
    resources,
    lng: savedLanguage,
    fallbackLng: 'pt-BR',
    supportedLngs: ['pt-BR', 'en-US', 'fr-FR'],
    interpolation: {
      escapeValue: false // react already does escaping
    }
  });

export default i18n;
