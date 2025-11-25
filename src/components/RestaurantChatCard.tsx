import { MapPin, Phone, ArrowRight, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface RestaurantChatCardProps {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  reason: string;
  onClick?: () => void;
}

export default function RestaurantChatCard({
  id,
  name,
  address,
  phone,
  reason,
  onClick
}: RestaurantChatCardProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    // Sempre navegar para a página do restaurante
    navigate(`/delivery/${id}`);
    
    // Se houver callback (fechar chat), executar também
    if (onClick) {
      onClick();
    }
  };

  return (
    <div
      onClick={handleClick}
      className="bg-gradient-to-br from-white to-orange-50 rounded-xl p-4 border-2 border-orange-200 hover:border-orange-400 hover:shadow-lg transition-all duration-300 cursor-pointer group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-bold text-gray-900 group-hover:text-orange-600 transition-colors">
              {name}
            </h4>
            <div className="flex items-center gap-1">
              <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
              <span className="text-xs text-gray-600">4.5</span>
            </div>
          </div>
          
          <p className="text-sm text-orange-600 font-medium mb-2">
            {reason}
          </p>

          {address && (
            <div className="flex items-start gap-1.5 text-xs text-gray-600 mb-1">
              <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
              <span className="line-clamp-1">{address}</span>
            </div>
          )}

          {phone && (
            <div className="flex items-center gap-1.5 text-xs text-gray-600">
              <Phone className="w-3 h-3 flex-shrink-0" />
              <span>{phone}</span>
            </div>
          )}
        </div>

        <div className="flex-shrink-0 bg-orange-500 text-white rounded-full p-2 group-hover:bg-orange-600 group-hover:scale-110 transition-all">
          <ArrowRight className="w-4 h-4" />
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-orange-100">
        <button className="w-full text-center text-sm font-semibold text-orange-600 group-hover:text-orange-700 transition-colors">
          Ver cardápio completo →
        </button>
      </div>
    </div>
  );
}

