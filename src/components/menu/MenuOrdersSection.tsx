import { ShoppingBag, Clock, Check } from 'lucide-react';
import type { FirestoreOrder } from '../../services/orderService';

interface MenuOrdersSectionProps {
  orders: FirestoreOrder[];
}

function getStatusLabel(status: FirestoreOrder['status']): string {
  if (status === 'novo') return 'Na fila';
  if (status === 'preparando') return 'Em preparo';
  return 'Pronto';
}

function getStatusClasses(status: FirestoreOrder['status']): string {
  if (status === 'novo') return 'bg-amber-100 text-amber-800';
  if (status === 'preparando') return 'bg-blue-100 text-blue-800';
  return 'bg-emerald-100 text-emerald-800';
}

export default function MenuOrdersSection({ orders }: MenuOrdersSectionProps) {
  if (orders.length === 0) return null;

  return (
    <section className="px-4 -mt-2 mb-6 max-w-lg mx-auto">
      <div className="menu-orders-card rounded-3xl p-5 shadow-sm">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-800/10">
            <ShoppingBag className="h-5 w-5 text-primary-800" strokeWidth={2.25} />
          </div>
          <h2 className="font-serif text-lg font-bold text-primary-900">Seus pedidos</h2>
        </div>

        <ul className="space-y-3">
          {orders.map((order) => (
            <li
              key={order.id}
              className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3.5 shadow-[0_2px_12px_rgba(75,0,130,0.08)]"
            >
              <span className="text-sm font-medium text-primary-900 leading-snug">
                {order.itens?.join(' · ') ?? order.timestamp}
              </span>
              <span
                className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClasses(order.status)}`}
              >
                {order.status === 'pronto' && <Check className="h-3.5 w-3.5" strokeWidth={2.5} />}
                {getStatusLabel(order.status)}
              </span>
            </li>
          ))}
        </ul>

        <p className="mt-4 flex items-center gap-1.5 text-xs text-primary-700/60">
          <Clock className="h-3.5 w-3.5 shrink-0" />
          Atualizado automaticamente a cada 5 minutos.
        </p>
      </div>
    </section>
  );
}
