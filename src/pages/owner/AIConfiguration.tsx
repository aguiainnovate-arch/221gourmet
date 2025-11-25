import { useState, useEffect } from 'react';
import { 
  Bot, 
  Key, 
  Settings, 
  Send, 
  TestTube, 
  CheckCircle, 
  XCircle, 
  Loader2,
  Save,
  Sparkles,
  MessageSquare,
  AlertTriangle
} from 'lucide-react';
import { 
  initializeOpenAI, 
  testOpenAIConnection,
  testOpenAIPrompt,
  type OpenAIConfig,
  type TestPromptResult 
} from '../../services/openaiService';
import { 
  saveChatbotConfig, 
  getChatbotConfig,
  type ChatbotConfig 
} from '../../services/chatbotConfigService';

export default function AIConfiguration() {
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('gpt-4o-mini');
  const [maxTokens, setMaxTokens] = useState(1000);
  const [temperature, setTemperature] = useState(0.7);
  
  const [testPrompt, setTestPrompt] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [testResults, setTestResults] = useState<TestPromptResult[]>([]);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [connectionError, setConnectionError] = useState('');

  // Configurações do Chatbot
  const [chatbotCustomRules, setChatbotCustomRules] = useState('');
  const [chatbotTone, setChatbotTone] = useState('friendly'); // friendly, professional, casual
  const [chatbotShowCardsThreshold, setChatbotShowCardsThreshold] = useState('conservative'); // conservative, balanced, eager
  const [chatbotGreeting, setChatbotGreeting] = useState('Olá! 👋 Sou seu assistente virtual. Como posso te ajudar a encontrar o restaurante perfeito hoje?');
  const [isSavingChatbot, setIsSavingChatbot] = useState(false);

  useEffect(() => {
    const savedConfig = localStorage.getItem('openai-config');
    if (savedConfig) {
      try {
        const config = JSON.parse(savedConfig);
        setApiKey(config.apiKey || '');
        setModel(config.model || 'gpt-4o-mini');
        setMaxTokens(config.maxTokens || 1000);
        setTemperature(config.temperature || 0.7);
        
        if (config.apiKey) {
          initializeOpenAI(config);
        }
      } catch (error) {
        console.error('Erro ao carregar configuração:', error);
      }
    }

    // Carregar configurações do chatbot do Firestore
    loadChatbotConfig();
  }, []);

  const saveConfiguration = async () => {
    setIsSaving(true);
    
    try {
      const config: OpenAIConfig = {
        apiKey,
        model,
        maxTokens,
        temperature
      };

      localStorage.setItem('openai-config', JSON.stringify(config));
      
      if (apiKey) {
        initializeOpenAI(config);
      }

      alert('✅ Configuração salva com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar configuração:', error);
      alert('❌ Erro ao salvar configuração');
    } finally {
      setIsSaving(false);
    }
  };

  const testConnection = async () => {
    if (!apiKey.trim()) {
      alert('⚠️ Digite a chave da API primeiro');
      return;
    }

    setConnectionStatus('testing');
    setConnectionError('');

    try {
      const tempConfig: OpenAIConfig = {
        apiKey,
        model,
        maxTokens,
        temperature
      };
      
      initializeOpenAI(tempConfig);
      
      const result = await testOpenAIConnection();
      
      if (result.success) {
        setConnectionStatus('success');
        alert('✅ Conexão estabelecida com sucesso!');
      } else {
        setConnectionStatus('error');
        setConnectionError(result.error || 'Erro desconhecido');
        alert(`❌ Erro na conexão: ${result.error}`);
      }
    } catch (error) {
      setConnectionStatus('error');
      setConnectionError(error instanceof Error ? error.message : 'Erro desconhecido');
      alert(`❌ Erro na conexão: ${error}`);
    }
  };

  const testPromptSubmit = async () => {
    if (!testPrompt.trim()) {
      alert('⚠️ Digite um prompt para testar');
      return;
    }

    if (!apiKey.trim()) {
      alert('⚠️ Configure a chave da API primeiro');
      return;
    }

    setIsTesting(true);

    try {
      const result = await testOpenAIPrompt(testPrompt, systemPrompt || undefined);
      
      setTestResults(prev => [result, ...prev]);
      
      if (result.success) {
        alert('✅ Prompt testado com sucesso!');
      } else {
        alert(`❌ Erro no teste: ${result.error}`);
      }
    } catch (error) {
      console.error('Erro ao testar prompt:', error);
      alert(`❌ Erro ao testar prompt: ${error}`);
    } finally {
      setIsTesting(false);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  const loadChatbotConfig = async () => {
    try {
      const config = await getChatbotConfig();
      setChatbotCustomRules(config.customRules);
      setChatbotTone(config.tone);
      setChatbotShowCardsThreshold(config.showCardsThreshold);
      setChatbotGreeting(config.greeting);
    } catch (error) {
      console.error('Erro ao carregar configuração do chatbot:', error);
    }
  };

  const saveChatbotConfiguration = async () => {
    setIsSavingChatbot(true);
    
    try {
      const config: ChatbotConfig = {
        customRules: chatbotCustomRules,
        tone: chatbotTone as 'friendly' | 'professional' | 'enthusiastic',
        showCardsThreshold: chatbotShowCardsThreshold as 'conservative' | 'balanced' | 'eager',
        greeting: chatbotGreeting
      };

      await saveChatbotConfig(config);
      alert('✅ Configuração do chatbot salva com sucesso no banco de dados!');
    } catch (error) {
      console.error('Erro ao salvar configuração do chatbot:', error);
      alert('❌ Erro ao salvar configuração do chatbot. Verifique sua conexão com o banco de dados.');
    } finally {
      setIsSavingChatbot(false);
    }
  };

  const examplePrompts = [
    "Crie uma descrição atrativa para um hambúrguer artesanal",
    "Sugira 5 nomes criativos para uma sobremesa de chocolate",
    "Escreva um texto promocional para happy hour",
    "Crie um cardápio para um restaurante italiano",
    "Descreva os benefícios de uma dieta saudável"
  ];

  const insertExamplePrompt = (prompt: string) => {
    setTestPrompt(prompt);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-2">
          <Bot className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Configuração de IA</h1>
        </div>
        <p className="text-gray-600">
          Configure e teste a integração com OpenAI GPT-4 Mini para gerar conteúdo automático
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Settings className="w-5 h-5 text-gray-600" />
              <h2 className="text-xl font-semibold">Configuração da API</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Key className="w-4 h-4 inline mr-1" />
                  Chave da API OpenAI
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Sua chave será salva localmente no navegador
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Modelo
                </label>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="gpt-4o-mini">GPT-4o Mini</option>
                  <option value="gpt-4o">GPT-4o</option>
                  <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Máximo de Tokens
                </label>
                <input
                  type="number"
                  value={maxTokens}
                  onChange={(e) => setMaxTokens(Number(e.target.value))}
                  min="1"
                  max="4000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Temperature: {temperature}
                </label>
                <input
                  type="range"
                  value={temperature}
                  onChange={(e) => setTemperature(Number(e.target.value))}
                  min="0"
                  max="2"
                  step="0.1"
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Mais focado</span>
                  <span>Mais criativo</span>
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={saveConfiguration}
                  disabled={isSaving}
                  className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-md"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>Salvar</span>
                </button>

                <button
                  onClick={testConnection}
                  disabled={!apiKey.trim() || connectionStatus === 'testing'}
                  className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-4 py-2 rounded-md"
                >
                  {connectionStatus === 'testing' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : connectionStatus === 'success' ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : connectionStatus === 'error' ? (
                    <XCircle className="w-4 h-4" />
                  ) : (
                    <TestTube className="w-4 h-4" />
                  )}
                  <span>Testar Conexão</span>
                </button>
              </div>

              {connectionStatus === 'success' && (
                <div className="flex items-center space-x-2 text-green-600 bg-green-50 p-3 rounded-md">
                  <CheckCircle className="w-5 h-5" />
                  <span className="text-sm font-medium">Conexão estabelecida com sucesso!</span>
                </div>
              )}

              {connectionStatus === 'error' && (
                <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-md">
                  <XCircle className="w-5 h-5" />
                  <div>
                    <span className="text-sm font-medium">Erro na conexão</span>
                    {connectionError && (
                      <p className="text-xs mt-1">{connectionError}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Nova Seção: Configuração do Chatbot */}
          <div className="bg-white rounded-lg shadow-md p-6 border-2 border-orange-200">
            <div className="flex items-center space-x-2 mb-4">
              <Sparkles className="w-5 h-5 text-orange-600" />
              <h2 className="text-xl font-semibold text-gray-900">Configuração do Chatbot</h2>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              Personalize o comportamento da IA no chatbot de recomendações de restaurantes
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mensagem de Boas-Vindas
                </label>
                <textarea
                  value={chatbotGreeting}
                  onChange={(e) => setChatbotGreeting(e.target.value)}
                  placeholder="Olá! Como posso ajudar você hoje?"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Primeira mensagem que o usuário verá ao abrir o chat
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tom de Voz
                </label>
                <select
                  value={chatbotTone}
                  onChange={(e) => setChatbotTone(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="friendly">Amigável e Casual 😊</option>
                  <option value="professional">Profissional e Formal 👔</option>
                  <option value="enthusiastic">Entusiasmado e Energético 🎉</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Define o estilo de comunicação da IA
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quando Mostrar Cards de Restaurantes
                </label>
                <select
                  value={chatbotShowCardsThreshold}
                  onChange={(e) => setChatbotShowCardsThreshold(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="conservative">Conservador - Apenas quando muito apropriado 🎯</option>
                  <option value="balanced">Equilibrado - Quando fizer sentido 📊</option>
                  <option value="eager">Proativo - Mostrar com mais frequência 🚀</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Define a frequência com que cards de restaurantes aparecem
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Regras Personalizadas
                </label>
                <textarea
                  value={chatbotCustomRules}
                  onChange={(e) => setChatbotCustomRules(e.target.value)}
                  placeholder="Ex: Sempre mencionar opções vegetarianas quando disponível&#10;Priorizar restaurantes com entrega grátis&#10;Sugerir bebidas junto com comidas"
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Adicione regras específicas para o comportamento da IA (uma por linha)
                </p>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <button
                  onClick={saveChatbotConfiguration}
                  disabled={isSavingChatbot}
                  className="w-full flex items-center justify-center space-x-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white px-4 py-3 rounded-md transition-colors"
                >
                  {isSavingChatbot ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span className="font-medium">Salvar Configurações do Chatbot</span>
                </button>
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-md p-4">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-orange-800">
                    <p className="font-medium mb-1">💡 Dica:</p>
                    <p>As configurações são aplicadas imediatamente após salvar. Teste o chatbot na página de delivery para ver as mudanças!</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center space-x-2 mb-4">
              <MessageSquare className="w-5 h-5 text-gray-600" />
              <h2 className="text-xl font-semibold">Teste de Prompts</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prompt do Sistema (opcional)
                </label>
                <textarea
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  placeholder="Ex: Você é um especialista em marketing gastronômico..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prompt para Teste
                </label>
                <textarea
                  value={testPrompt}
                  onChange={(e) => setTestPrompt(e.target.value)}
                  placeholder="Digite seu prompt aqui..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Exemplos de Prompts
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {examplePrompts.map((prompt, index) => (
                    <button
                      key={index}
                      onClick={() => insertExamplePrompt(prompt)}
                      className="text-left p-2 text-sm bg-gray-50 hover:bg-gray-100 rounded-md border border-gray-200"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={testPromptSubmit}
                disabled={isTesting || !testPrompt.trim()}
                className="w-full flex items-center justify-center space-x-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-4 py-2 rounded-md"
              >
                {isTesting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                <span>{isTesting ? 'Testando...' : 'Testar Prompt'}</span>
              </button>
            </div>
          </div>

          {testResults.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-5 h-5 text-gray-600" />
                  <h3 className="text-lg font-semibold">Resultados dos Testes</h3>
                </div>
                <button
                  onClick={clearResults}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Limpar
                </button>
              </div>

              <div className="space-y-4 max-h-96 overflow-y-auto">
                {testResults.map((result, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-md border ${
                      result.success 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="flex items-start space-x-2">
                      {result.success ? (
                        <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="text-sm font-medium">
                            {result.success ? 'Sucesso' : 'Erro'}
                          </span>
                          {result.tokensUsed && (
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                              {result.tokensUsed} tokens
                            </span>
                          )}
                          {result.model && (
                            <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
                              {result.model}
                            </span>
                          )}
                        </div>
                        
                        {result.success && result.response && (
                          <div className="text-sm text-gray-700 whitespace-pre-wrap">
                            {result.response}
                          </div>
                        )}
                        
                        {!result.success && result.error && (
                          <div className="text-sm text-red-600">
                            {result.error}
                          </div>
                        )}
                        
                        {result.timestamp && (
                          <div className="text-xs text-gray-500 mt-2">
                            {result.timestamp.toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-start space-x-2">
          <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-amber-800">Informações Importantes</h4>
            <ul className="text-sm text-amber-700 mt-2 space-y-1">
              <li>• Sua chave da API é salva apenas localmente no navegador</li>
              <li>• O GPT-4o Mini é mais econômico que o GPT-4o completo</li>
              <li>• Tokens são cobrados por uso - teste com prompts pequenos primeiro</li>
              <li>• A temperatura controla a criatividade (0 = mais focado, 2 = mais criativo)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}