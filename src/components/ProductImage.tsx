import { useState, useEffect, useRef } from 'react';

interface ProductImageProps {
  src: string;
  alt: string;
  className?: string;
  containerClassName?: string;
}

export default function ProductImage({ 
  src, 
  alt, 
  className = '', 
  containerClassName = '' 
}: ProductImageProps) {
  const [isGif, setIsGif] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const [imageOrientation, setImageOrientation] = useState<'horizontal' | 'vertical' | 'square'>('square');
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    // Verificar se é um GIF
    setIsGif(src.toLowerCase().includes('.gif'));
    
    // Verificar se a imagem já está carregada
    if (imageRef.current?.complete) {
      handleImageLoad();
    }
  }, [src]);

  const handleImageLoad = () => {
    if (imageRef.current && containerRef.current) {
      const img = imageRef.current;
      const container = containerRef.current;
      
      // Obter dimensões da imagem e do container
      const imgWidth = img.naturalWidth;
      const imgHeight = img.naturalHeight;
      const containerWidth = container.offsetWidth;
      const containerHeight = container.offsetHeight;
      
      // Determinar orientação da imagem
      const aspectRatio = imgWidth / imgHeight;
      let orientation: 'horizontal' | 'vertical' | 'square' = 'square';
      
      if (aspectRatio > 1.2) {
        orientation = 'horizontal';
      } else if (aspectRatio < 0.8) {
        orientation = 'vertical';
      } else {
        orientation = 'square';
      }
      
      setImageOrientation(orientation);
      
      // Verificar se a imagem é significativamente maior que o container
      // Apenas animar se a imagem for pelo menos 20% maior em qualquer direção
      const widthRatio = imgWidth / containerWidth;
      const heightRatio = imgHeight / containerHeight;
      const shouldAnimateImage = widthRatio > 1.2 || heightRatio > 1.2;
      
      setShouldAnimate(shouldAnimateImage);
      setImageLoaded(true);
    }
  };

  // Se for GIF, não aplicar movimento automático
  if (isGif) {
    return (
      <div 
        ref={containerRef}
        className={`overflow-hidden rounded-lg ${containerClassName}`}
      >
        <img
          ref={imageRef}
          src={src}
          alt={alt}
          className={`w-full h-full object-cover rounded-lg ${className}`}
          onLoad={handleImageLoad}
        />
      </div>
    );
  }

  // Para imagens estáticas, aplicar movimento se necessário
  const getAnimationClass = () => {
    if (!shouldAnimate || !imageLoaded) return '';
    
    switch (imageOrientation) {
      case 'horizontal':
        return 'animate-image-movement-horizontal';
      case 'vertical':
        return 'animate-image-movement-vertical';
      case 'square':
      default:
        return 'animate-image-movement';
    }
  };

  return (
    <div 
      ref={containerRef}
      className={`overflow-hidden rounded-lg ${containerClassName}`}
    >
      <img
        ref={imageRef}
        src={src}
        alt={alt}
        className={`w-full h-full object-cover rounded-lg transition-all duration-1000 ease-in-out ${
          getAnimationClass()
        } ${className}`}
        onLoad={handleImageLoad}
        style={{
          transform: shouldAnimate && imageLoaded ? 'scale(1.1)' : 'scale(1)'
        }}
      />
    </div>
  );
}
