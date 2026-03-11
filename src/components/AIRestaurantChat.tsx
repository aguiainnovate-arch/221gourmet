import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Sparkles, Bot, User, AlertCircle } from 'lucide-react';
import { recommendRestaurants } from '../services/openaiService';
import { getAllRestaurantsWithMenus, type RestaurantWithMenu } from '../services/restaurantService';
import { getChatbotConfig } from '../services/chatbotConfigService';
import RestaurantChatCard from './RestaurantChatCard';

interface RecommendedRestaurant {
  id: string;
  name: string;
  reason: string;
}

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  restaurants?: RecommendedRestaurant[];
}

export default function AIRestaurantChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [greeting, setGreeting] = useState('Olá! 👋 Sou seu assistente virtual. Como posso te ajudar a encontrar o restaurante perfeito hoje?');

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [restaurantsData, setRestaurantsData] = useState<RestaurantWithMenu[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [aiConfigured, setAiConfigured] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Carregar configuração do chatbot ao montar
  useEffect(() => {
    loadChatbotGreeting();
  }, []);

  // Carregar dados dos restaurantes ao abrir o chat
  useEffect(() => {
    if (isOpen && restaurantsData.length === 0) {
      loadRestaurantsData();
    }
  }, [isOpen]);

  // Inicializar mensagens quando greeting for carregado
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: '1',
          text: greeting,
          sender: 'ai',
          timestamp: new Date()
        }
      ]);
    }
  }, [greeting]);

  const loadChatbotGreeting = async () => {
    try {
      const config = await getChatbotConfig();
      setGreeting(config.greeting);
    } catch (error) {
      console.error('Erro ao carregar saudação do chatbot:', error);
      // Manter saudação padrão em caso de erro
    }
  };

  const loadRestaurantsData = async () => {
    setIsLoadingData(true);
    try {
      const data = await getAllRestaurantsWithMenus();
      setRestaurantsData(data);
      console.log('Dados dos restaurantes carregados:', data.length, 'restaurantes');
    } catch (error) {
      console.error('Erro ao carregar restaurantes:', error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        text: '⚠️ Desculpe, tive um problema ao carregar os dados dos restaurantes. Vou tentar novamente...',
        sender: 'ai',
        timestamp: new Date()
      }]);
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoadingData) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'user',
      timestamp: new Date()
    };

    const currentInput = inputText;
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);

    // Se não há dados de restaurantes ainda, aguardar
    if (restaurantsData.length === 0) {
      await loadRestaurantsData();
    }

    try {
      // Preparar histórico de conversa para a AI
      const conversationHistory = messages.slice(1).map(msg => ({
        role: msg.sender === 'user' ? 'user' as const : 'assistant' as const,
        content: msg.text
      }));

      // Chamar a AI para recomendar restaurantes
      const result = await recommendRestaurants(
        currentInput,
        conversationHistory,
        restaurantsData
      );

      if (result.success && result.response) {
        const aiResponse: Message = {
          id: Date.now().toString(),
          text: result.response,
          sender: 'ai',
          timestamp: new Date(),
          restaurants: result.recommendedRestaurants || []
        };
        setMessages(prev => [...prev, aiResponse]);
      } else {
        // Fallback para resposta padrão se a AI falhar
        const fallbackResponse: Message = {
          id: Date.now().toString(),
          text: getFallbackResponse(result.error || ''),
          sender: 'ai',
          timestamp: new Date(),
          restaurants: []
        };
        setMessages(prev => [...prev, fallbackResponse]);
        
        if (result.error?.includes('não configurado')) {
          setAiConfigured(false);
        }
      }
    } catch (error) {
      console.error('Erro ao obter resposta da AI:', error);
      const errorResponse: Message = {
        id: Date.now().toString(),
        text: '😔 Desculpe, tive um problema ao processar sua mensagem. Pode tentar novamente?',
        sender: 'ai',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorResponse]);
    } finally {
      setIsTyping(false);
    }
  };

  const getFallbackResponse = (error: string): string => {
    if (error.includes('não configurado')) {
      return '🤖 Para ativar as recomendações inteligentes, é necessário configurar a chave da API OpenAI. Entre em contato com o administrador.\n\nEnquanto isso, me conte: que tipo de comida você está procurando hoje? 🍽️';
    }
    return '🤔 Interessante! Para te recomendar os melhores restaurantes, me conte mais: você tem preferência por algum tipo de comida específica? Italiana, japonesa, brasileira, lanches... Ou prefere que eu te mostre os mais populares?';
  };

  const quickSuggestions = [
    '🍕 Quero pizza',
    '🍣 Comida japonesa',
    '💰 Opções baratas',
    '⚡ Entrega rápida'
  ];

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 z-40 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-full p-4 shadow-2xl hover:shadow-orange-500/50 transition-all duration-300 hover:scale-110 ${
          isOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
        <div className="relative">
          <MessageCircle className="w-7 h-7" />
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
        </div>
      </button>

      {/* Chat Modal */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[400px] h-[600px] flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
          {/* Header */}
          <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-600 text-white p-5 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-orange-600 ${
                  aiConfigured ? 'bg-green-400' : 'bg-yellow-400'
                }`}></div>
              </div>
              <div>
                <h3 className="font-bold text-lg">Assistente IA</h3>
                <p className="text-xs text-amber-100">
                  {isLoadingData ? 'Carregando dados...' : 'Online agora'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="hover:bg-white/20 rounded-full p-2 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* AI Status Warning */}
          {!aiConfigured && (
            <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-yellow-600" />
              <p className="text-xs text-yellow-800">
                IA em modo limitado. Configure a API OpenAI para recomendações completas.
              </p>
            </div>
          )}

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 bg-gradient-to-b from-orange-50/30 to-white space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
              >
                <div className={`flex items-start space-x-2 max-w-[80%] ${message.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  {/* Avatar */}
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    message.sender === 'user' 
                      ? 'bg-gradient-to-br from-amber-500 to-orange-500' 
                      : 'bg-gradient-to-br from-orange-500 to-amber-600'
                  }`}>
                    {message.sender === 'user' ? (
                      <User className="w-4 h-4 text-white" />
                    ) : (
                      <Bot className="w-4 h-4 text-white" />
                    )}
                  </div>

                  {/* Message Bubble */}
                  <div className="flex-1">
                    <div className={`rounded-2xl px-4 py-2.5 ${
                      message.sender === 'user'
                        ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-white'
                        : 'bg-white border border-gray-200 text-gray-800 shadow-sm'
                    }`}>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.text}</p>
                    </div>

                    {/* Restaurant Cards */}
                    {message.sender === 'ai' && message.restaurants && message.restaurants.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {message.restaurants.map((restaurant) => {
                          const restaurantData = restaurantsData.find(r => r.id === restaurant.id);
                          return (
                            <RestaurantChatCard
                              key={restaurant.id}
                              id={restaurant.id}
                              name={restaurant.name}
                              address={restaurantData?.address}
                              phone={restaurantData?.phone}
                              reason={restaurant.reason}
                              onClick={() => setIsOpen(false)}
                            />
                          );
                        })}
                      </div>
                    )}

                    <p className={`text-xs text-gray-400 mt-1 ${message.sender === 'user' ? 'text-right' : 'text-left'}`}>
                      {message.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-start space-x-2 max-w-[80%]">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm">
                    <div className="flex space-x-1.5">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestions */}
          {messages.length === 1 && (
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
              <p className="text-xs text-gray-500 mb-2 font-medium">Sugestões rápidas:</p>
              <div className="flex flex-wrap gap-2">
                {quickSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setInputText(suggestion);
                      setTimeout(() => handleSendMessage(), 100);
                    }}
                    className="text-xs bg-white border border-orange-200 text-orange-700 px-3 py-1.5 rounded-full hover:bg-orange-50 hover:border-orange-300 transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="p-4 bg-white border-t border-gray-200">
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !isLoadingData && handleSendMessage()}
                placeholder={isLoadingData ? "Carregando dados..." : "Digite sua mensagem..."}
                disabled={isLoadingData}
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm text-black placeholder:text-gray-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputText.trim() || isLoadingData}
                className="bg-gradient-to-r from-amber-600 to-orange-600 text-white p-2.5 rounded-full hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 disabled:hover:scale-100"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
            {restaurantsData.length > 0 && (
              <p className="text-xs text-gray-400 mt-2 text-center">
                Conhecendo {restaurantsData.length} restaurante{restaurantsData.length !== 1 ? 's' : ''} para te ajudar 🍽️
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}

