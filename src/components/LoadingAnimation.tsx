import { useEffect, useState } from 'react';
import { Music, Utensils, Sparkles } from 'lucide-react';

interface LoadingAnimationProps {
  restaurantName: string;
  bannerUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  audioUrl?: string;
  onAnimationComplete: () => void;
}

export default function LoadingAnimation({
  restaurantName,
  bannerUrl,
  primaryColor,
  secondaryColor,
  onAnimationComplete
}: LoadingAnimationProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [showContent, setShowContent] = useState(false);

  const steps = [
    { icon: Music, text: 'Preparando sua experiência...', duration: 2000 },
    { icon: Utensils, text: 'Carregando o cardápio...', duration: 2000 },
    { icon: Sparkles, text: 'Quase pronto!', duration: 1500 }
  ];

  useEffect(() => {
    // Aguardar um pouco antes de mostrar o conteúdo
    const initialDelay = setTimeout(() => {
      setShowContent(true);
    }, 300);

    return () => clearTimeout(initialDelay);
  }, []);

  useEffect(() => {
    if (!showContent) return;

    let currentProgress = 0;
    const totalDuration = steps.reduce((sum, step) => sum + step.duration, 0);
    const progressInterval = 50; // Atualizar a cada 50ms
    const progressIncrement = (progressInterval / totalDuration) * 100;

    const progressTimer = setInterval(() => {
      currentProgress += progressIncrement;
      setProgress(Math.min(currentProgress, 100));

      if (currentProgress >= 100) {
        clearInterval(progressTimer);
        // Aguardar um pouco antes de completar
        setTimeout(() => {
          onAnimationComplete();
        }, 500);
      }
    }, progressInterval);

    // Controlar os steps
    let stepIndex = 0;
    let accumulatedTime = 0;

    const stepTimer = setInterval(() => {
      if (stepIndex < steps.length) {
        setCurrentStep(stepIndex);
        accumulatedTime += steps[stepIndex].duration;
        stepIndex++;
      } else {
        clearInterval(stepTimer);
      }
    }, steps[0].duration);

    return () => {
      clearInterval(progressTimer);
      clearInterval(stepTimer);
    };
  }, [showContent, onAnimationComplete]);

  const CurrentIcon = steps[currentStep]?.icon || Music;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden animate-gradientShift"
      style={{
        background: `linear-gradient(135deg, ${primaryColor}15, ${secondaryColor}15, ${primaryColor}25)`,
        backgroundSize: '400% 400%'
      }}
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-full h-full">
          <div 
            className="absolute top-1/4 left-1/4 w-32 h-32 rounded-full opacity-20"
            style={{ backgroundColor: primaryColor }}
          />
          <div 
            className="absolute top-3/4 right-1/4 w-24 h-24 rounded-full opacity-15"
            style={{ backgroundColor: secondaryColor }}
          />
          <div 
            className="absolute top-1/2 left-1/2 w-16 h-16 rounded-full opacity-25"
            style={{ backgroundColor: primaryColor }}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className={`relative z-10 text-center transition-all duration-1000 ${
        showContent ? 'opacity-100 transform scale-100' : 'opacity-0 transform scale-95'
      }`}>
        {/* Banner */}
        {bannerUrl && (
          <div className="mb-8 animate-fadeInUp">
            <div 
              className="w-32 h-32 mx-auto rounded-full overflow-hidden shadow-2xl border-4 border-white/20"
              style={{ 
                background: `linear-gradient(45deg, ${primaryColor}, ${secondaryColor})`,
                padding: '4px'
              }}
            >
              <img 
                src={bannerUrl} 
                alt="Banner do restaurante"
                className="w-full h-full object-cover rounded-full"
              />
            </div>
          </div>
        )}

        {/* Restaurant Name */}
        <div className="mb-8 animate-fadeInUp" style={{ animationDelay: '0.3s' }}>
          <h1 
            className="text-5xl font-serif font-bold mb-2"
            style={{ color: primaryColor }}
          >
            {restaurantName}
          </h1>
          <div 
            className="w-24 h-1 mx-auto rounded-full"
            style={{ backgroundColor: secondaryColor }}
          />
        </div>

        {/* Loading Icon and Text */}
        <div className="mb-8 animate-fadeInUp" style={{ animationDelay: '0.6s' }}>
          <div 
            className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center shadow-lg animate-pulse-custom"
            style={{ 
              backgroundColor: primaryColor
            }}
          >
            <CurrentIcon className="w-10 h-10 text-white" />
          </div>
          <p 
            className="text-xl font-medium"
            style={{ color: primaryColor }}
          >
            {steps[currentStep]?.text || 'Carregando...'}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="w-80 mx-auto animate-fadeInUp" style={{ animationDelay: '0.9s' }}>
          <div 
            className="w-full h-2 rounded-full overflow-hidden"
            style={{ backgroundColor: `${secondaryColor}40` }}
          >
            <div 
              className="h-full rounded-full transition-all duration-300 ease-out"
              style={{ 
                backgroundColor: primaryColor,
                width: `${progress}%`,
                boxShadow: `0 0 20px ${primaryColor}60`
              }}
            />
          </div>
          <p 
            className="text-sm mt-2 font-medium"
            style={{ color: primaryColor }}
          >
            {Math.round(progress)}%
          </p>
        </div>

        {/* Floating Elements */}
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-float"
              style={{
                left: `${20 + i * 15}%`,
                top: `${30 + (i % 3) * 20}%`,
                animationDelay: `${i * 0.5}s`,
                animationDuration: `${3 + i * 0.5}s`
              }}
            >
              <div 
                className="w-2 h-2 rounded-full opacity-30"
                style={{ backgroundColor: primaryColor }}
              />
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
