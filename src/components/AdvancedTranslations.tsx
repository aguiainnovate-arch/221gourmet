import { useState } from 'react';
import { ChevronDown, ChevronRight, Globe } from 'lucide-react';
import brasilFlag from '../assets/brasilflag.svg';
import espanhaFlag from '../assets/espanhaflag.svg';
import francaFlag from '../assets/francaflag.svg';
import usaFlag from '../assets/usaflag.svg';

interface Translation {
  'en-US': string;
  'es-ES': string;
  'fr-FR': string;
}

interface AdvancedTranslationsProps {
  type: 'product' | 'category';
  translations?: {
    name?: Translation;
    description?: Translation;
  };
  onTranslationsChange: (translations: {
    name?: Translation;
    description?: Translation;
  }) => void;
}

export default function AdvancedTranslations({ 
  type, 
  translations, 
  onTranslationsChange 
}: AdvancedTranslationsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleTranslationChange = (
    field: 'name' | 'description',
    language: 'en-US' | 'es-ES' | 'fr-FR',
    value: string
  ) => {
    const currentTranslations = translations || {};
    const currentFieldTranslations = currentTranslations[field] || { 'en-US': '', 'es-ES': '', 'fr-FR': '' };
    
    const updatedTranslations = {
      ...currentTranslations,
      [field]: {
        ...currentFieldTranslations,
        [language]: value
      }
    };
    
    onTranslationsChange(updatedTranslations);
  };

  return (
    <div className="mt-4 border border-gray-200 rounded-lg bg-gray-50">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-100 transition-colors rounded-lg"
      >
                 <div className="flex items-center gap-2 text-gray-700">
           <Globe size={16} />
           <span className="font-medium">Configurações Avançadas</span>
           <span className="text-sm text-gray-500">(Traduções)</span>
           <div className="flex items-center gap-1 ml-2">
             <img src={brasilFlag} alt="Brazil Flag" className="w-4 h-4" />
             <span className="text-xs text-gray-500">Português como base</span>
           </div>
         </div>
        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-gray-200">
          <p className="text-sm text-gray-600 mt-4">
            Configure as traduções para outros idiomas (Inglês, Espanhol e Francês). O português será sempre o texto dos campos principais acima.
          </p>
          
          {/* Cards por Idioma */}
          <div className="space-y-4">
            {/* Card Inglês */}
            <div className="border border-gray-200 rounded-lg bg-white p-4">
                             <div className="flex items-center gap-2 mb-4">
                 <img src={usaFlag} alt="USA Flag" className="w-6 h-6" />
                 <h3 className="font-medium text-gray-800">English</h3>
               </div>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome / Name
                  </label>
                  <input
                    type="text"
                    value={translations?.name?.['en-US'] || ''}
                    onChange={(e) => handleTranslationChange('name', 'en-US', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Name in English..."
                  />
                </div>

                {type === 'product' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Descrição / Description
                    </label>
                    <textarea
                      value={translations?.description?.['en-US'] || ''}
                      onChange={(e) => handleTranslationChange('description', 'en-US', e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      rows={3}
                      placeholder="Description in English..."
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Card Espanhol */}
            <div className="border border-gray-200 rounded-lg bg-white p-4">
                             <div className="flex items-center gap-2 mb-4">
                 <img src={espanhaFlag} alt="Spain Flag" className="w-6 h-6" />
                 <h3 className="font-medium text-gray-800">Español</h3>
               </div>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre
                  </label>
                  <input
                    type="text"
                    value={translations?.name?.['es-ES'] || ''}
                    onChange={(e) => handleTranslationChange('name', 'es-ES', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Nombre en Español..."
                  />
                </div>

                {type === 'product' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Descripción
                    </label>
                    <textarea
                      value={translations?.description?.['es-ES'] || ''}
                      onChange={(e) => handleTranslationChange('description', 'es-ES', e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      rows={3}
                      placeholder="Descripción en Español..."
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Card Francês */}
            <div className="border border-gray-200 rounded-lg bg-white p-4">
                             <div className="flex items-center gap-2 mb-4">
                 <img src={francaFlag} alt="France Flag" className="w-6 h-6" />
                 <h3 className="font-medium text-gray-800">Français</h3>
               </div>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nom
                  </label>
                  <input
                    type="text"
                    value={translations?.name?.['fr-FR'] || ''}
                    onChange={(e) => handleTranslationChange('name', 'fr-FR', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Nom en Français..."
                  />
                </div>

                {type === 'product' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      value={translations?.description?.['fr-FR'] || ''}
                      onChange={(e) => handleTranslationChange('description', 'fr-FR', e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      rows={3}
                      placeholder="Description en Français..."
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
