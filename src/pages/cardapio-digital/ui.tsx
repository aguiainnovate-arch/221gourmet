import { useContext, createContext, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRestaurantAuth } from '../../contexts/RestaurantAuthContext';
import { getRestaurantById } from '../../services/restaurantService';
import { activateDigitalMenuLocally, startDigitalMenuCheckout } from '../../services/digitalMenuService';
import { hasActiveDigitalMenu } from '../../types/digitalMenuOffer';
import { isNativePlatform } from '../../utils/capacitorUtils';
import { venues, type MenuScene } from './content';

type CheckoutApi = {
  buy: () => Promise<void>;
  busy: boolean;
  note: string | null;
};

const CheckoutContext = createContext<CheckoutApi | null>(null);

export function CheckoutProvider({ children }: { children: ReactNode }) {
  const { currentRestaurantId, isLoading } = useRestaurantAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const buy = async () => {
    if (isLoading || busy) return;
    if (!currentRestaurantId) {
      navigate('/captar/restaurante#cadastro');
      return;
    }
    try {
      setBusy(true);
      setNote(null);
      const restaurant = await getRestaurantById(currentRestaurantId);
      if (hasActiveDigitalMenu(restaurant?.digitalMenu)) {
        setNote('Este restaurante já tem o cardápio digital ativo.');
        return;
      }
      const { url } = await startDigitalMenuCheckout(currentRestaurantId);
      if (isNativePlatform()) {
        window.open(url, '_blank', 'noopener,noreferrer');
        setNote('Continue no navegador.');
        return;
      }
      window.location.href = url;
    } catch (error) {
      console.error(error);
      if (import.meta.env.DEV) {
        try {
          await activateDigitalMenuLocally(currentRestaurantId);
          setNote('Cardápio digital ativado neste computador.');
          return;
        } catch (localError) {
          console.error(localError);
        }
      }
      setNote('Não foi possível continuar. Tente de novo.');
    } finally {
      setBusy(false);
    }
  };

  return <CheckoutContext.Provider value={{ buy, busy, note }}>{children}</CheckoutContext.Provider>;
}

export function useCheckout(): CheckoutApi {
  const value = useContext(CheckoutContext);
  if (!value) {
    throw new Error('useCheckout deve ficar dentro de CheckoutProvider');
  }
  return value;
}

export function BuyButton({
  children,
  ghost = false,
  className = '',
}: {
  children: ReactNode;
  ghost?: boolean;
  className?: string;
}) {
  const { buy, busy } = useCheckout();
  return (
    <button
      type="button"
      className={`cd-btn${ghost ? ' cd-btn-ghost' : ''} ${className}`.trim()}
      onClick={() => {
        void buy();
      }}
      disabled={busy}
    >
      {busy ? 'Abrindo…' : children}
    </button>
  );
}

const homeVenue = venues[0];
const productVenue = venues[3];

export function MenuScreen({ scene }: { scene: MenuScene }) {
  if (scene === 'product') {
    return (
      <div className="cd-product">
        <img src={productVenue.image} alt="Prato em destaque no cardápio" />
        <div className="cd-product-body">
          <h3>{productVenue.dish}</h3>
          <p>Peixe grelhado, ervas e manteiga. Serve uma pessoa.</p>
          <div className="cd-product-foot">
            <strong>{productVenue.price}</strong>
            <span className="cd-add">Pedir</span>
          </div>
        </div>
      </div>
    );
  }

  if (scene === 'categories') {
    const names = ['Burgers', 'Pizzas', 'Cafés', 'Pratos', 'Drinks'];
    return (
      <div className="cd-menu">
        <div className="cd-menu-top">
          <strong>Casa Lume</strong>
          <span>Mesa 04</span>
        </div>
        <div className="cd-cats">
          {names.map((name, index) => (
            <div key={name} className={`cd-cat${index === 1 ? ' is-on' : ''}`}>
              <span>{name}</span>
              <span>{index === 1 ? '12' : '08'}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (scene === 'brand') {
    return (
      <div className="cd-brand">
        <div className="cd-swatches">
          <i style={{ background: '#E91120' }} />
          <i style={{ background: '#F4EDE4' }} />
          <i style={{ background: '#1C140F' }} />
          <i style={{ background: '#C4A574' }} />
        </div>
        <h3>Sua marca na tela.</h3>
        <p>Cores, nome e tom do salão — o cardápio deixa de parecer um modelo pronto.</p>
      </div>
    );
  }

  if (scene === 'flow') {
    return (
      <div className="cd-menu">
        <div className="cd-menu-top">
          <strong>Casa Lume</strong>
          <span>ao vivo</span>
        </div>
        {venues.slice(0, 4).map((venue) => (
          <div className="cd-row" key={venue.id}>
            <img src={venue.image} alt="" />
            <span>
              <b>{venue.dish}</b>
              {venue.name}
            </span>
            <span>{venue.price}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="cd-menu">
      <div className="cd-menu-top">
        <strong>Casa Lume</strong>
        <span>Mesa 04</span>
      </div>
      <img className="cd-menu-banner" src={homeVenue.image} alt="" />
      <div className="cd-chips">
        <span className="is-on">Burgers</span>
        <span>Bebidas</span>
        <span>Doces</span>
      </div>
      <div className="cd-row">
        <img src={venues[0].image} alt="" />
        <span>
          <b>{venues[0].dish}</b>
          pão brioche
        </span>
        <span>{venues[0].price}</span>
      </div>
      <div className="cd-row">
        <img src={venues[1].image} alt="" />
        <span>
          <b>{venues[1].dish}</b>
          forno a lenha
        </span>
        <span>{venues[1].price}</span>
      </div>
    </div>
  );
}

export function PhoneFrame({
  scene,
  className = '',
  showScan = false,
}: {
  scene: MenuScene;
  className?: string;
  showScan?: boolean;
}) {
  return (
    <div className={`cd-phone ${className}`.trim()}>
      <div className="cd-phone-bezel">
        <div className="cd-notch" />
        {showScan && <div className="cd-scan" />}
        <div className="cd-phone-screen">
          <MenuScreen scene={scene} />
        </div>
      </div>
    </div>
  );
}

export function StackedPhone({ scene }: { scene: MenuScene }) {
  const scenes: MenuScene[] = ['home', 'categories', 'product', 'brand', 'flow'];
  return (
    <div className="cd-phone cd-phone-lg">
      <div className="cd-phone-bezel">
        <div className="cd-notch" />
        <div className="cd-phone-screen">
          <div className="cd-screen-stack">
            {scenes.map((item) => (
              <div key={item} className={`cd-screen-layer${item === scene ? ' is-on' : ''}`}>
                <MenuScreen scene={item} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function QrMark() {
  const cells = [
    1, 1, 1, 0, 1, 0, 1, 1, 1,
    1, 0, 1, 0, 0, 1, 1, 0, 1,
    1, 1, 1, 0, 1, 0, 1, 1, 1,
    0, 0, 0, 1, 0, 1, 0, 0, 0,
    1, 0, 1, 1, 1, 0, 1, 0, 1,
    0, 1, 0, 1, 0, 1, 0, 1, 0,
    1, 1, 1, 0, 1, 0, 1, 1, 1,
    1, 0, 1, 1, 0, 1, 1, 0, 1,
    1, 1, 1, 0, 1, 0, 1, 1, 1,
  ];
  return (
    <svg viewBox="0 0 9 9" aria-hidden="true">
      {cells.map((on, index) =>
        on ? (
          <rect key={index} x={index % 9} y={Math.floor(index / 9)} width="1" height="1" fill="#111" />
        ) : null
      )}
    </svg>
  );
}
