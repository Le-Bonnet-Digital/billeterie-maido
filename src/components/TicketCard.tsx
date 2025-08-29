import { useState } from 'react';
import { Plus, Minus } from 'lucide-react';
import { addToCart } from '../lib/cart';
import { formatPrice } from '../lib/money';
import type { Pass as EventPass } from '../services/eventService';

interface TicketCardProps {
  pass: EventPass;
  onAdd?: (quantity: number) => Promise<void | boolean>;
  imageUrl?: string;
  fallbackEmoji?: string;
  disabled?: boolean;
  layout?: 'vertical' | 'horizontal';
}

export default function TicketCard({ pass, onAdd, imageUrl, fallbackEmoji, disabled, layout = 'vertical' }: TicketCardProps) {
  const [qty, setQty] = useState(1);
  const remaining = pass.remaining_stock ?? null;
  const isUnlimited =
    (remaining === null && pass.initial_stock === null) ||
    (typeof remaining === 'number' && remaining >= 999999);
  const outOfStock = remaining !== null && remaining <= 0;
  const isDisabled = !!disabled || outOfStock;
  const maxQty = remaining !== null && !isUnlimited ? Math.max(0, remaining) : 99;

  const handleAdd = async () => {
    if (outOfStock || qty <= 0) return;
    const quantity = Math.min(qty, maxQty || qty);
    if (onAdd) {
      await onAdd(quantity);
      return;
    }
    await addToCart(pass.id, undefined, undefined, quantity);
  };

  if (layout === 'horizontal') {
    return (
      <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
        <div className="flex items-stretch gap-4 p-4">
          <div className="w-24 h-24 rounded-md overflow-hidden bg-gray-100 flex-shrink-0">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={pass.name || 'Image produit'}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-2xl">
                {fallbackEmoji && <span className="drop-shadow-sm" aria-hidden="true">{fallbackEmoji}</span>}
              </div>
            )}
          </div>
          <div className="flex-1 flex flex-col">
            <div className="flex justify-between items-start mb-1">
              <h3 className="text-base font-semibold text-gray-900">{pass.name}</h3>
              <div className="text-right">
                <div className="text-lg font-bold text-blue-600">{formatPrice(pass.price)}</div>
                {!isUnlimited && (
                  <div className="text-[11px] text-gray-500">
                    {remaining !== null ? (remaining <= 0 ? 'Épuisé' : `${remaining} restant(s)`) : ''}
                  </div>
                )}
              </div>
            </div>
            <p className="text-gray-600 text-sm mb-2 line-clamp-2">{pass.description}</p>
            <div className="mt-auto flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="p-2 border border-gray-300 rounded-md hover:bg-gray-50"
                  aria-label="Diminuer la quantité"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="text-lg font-semibold w-10 text-center">{qty}</span>
                <button
                  onClick={() => setQty((q) => (maxQty ? Math.min(maxQty, q + 1) : q + 1))}
                  disabled={maxQty !== null && qty >= maxQty}
                  className="p-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                  aria-label="Augmenter la quantité"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              <button
                onClick={handleAdd}
                disabled={isDisabled}
                className={`px-4 py-2 rounded-md font-medium transition-colors text-white ${isDisabled ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                {outOfStock ? 'Épuisé' : disabled ? 'Indisponible' : 'Ajouter au panier'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg p-0 hover:border-blue-300 transition-colors bg-white h-full flex flex-col justify-between overflow-hidden">
      {imageUrl ? (
        <div className="w-full overflow-hidden aspect-16-9">
          <img
            src={imageUrl}
            alt={pass.name || 'Image produit'}
            loading="lazy"
            decoding="async"
            className="img-cover"
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          />
        </div>
      ) : (
        <div className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-3xl aspect-16-9">
          {fallbackEmoji && <span className="drop-shadow-sm" aria-hidden="true">{fallbackEmoji}</span>}
        </div>
      )}
      <div className="p-6 flex-1 flex flex-col">
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-xl font-semibold text-gray-900">{pass.name}</h3>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600">{formatPrice(pass.price)}</div>
            {!isUnlimited && (
              <div className="text-xs text-gray-500">
                {remaining !== null
                  ? remaining <= 0
                    ? 'Épuisé'
                    : `${remaining} restant(s)`
                  : ''}
              </div>
            )}
          </div>
        </div>

        <p className="text-gray-600 text-sm mb-4 line-clamp-2">{pass.description}</p>

        <div className="flex items-center justify-between mt-auto">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="p-2 border border-gray-300 rounded-md hover:bg-gray-50"
              aria-label="Diminuer la quantité"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="text-lg font-semibold w-10 text-center">{qty}</span>
            <button
              onClick={() => setQty((q) => (maxQty ? Math.min(maxQty, q + 1) : q + 1))}
              disabled={maxQty !== null && qty >= maxQty}
              className="p-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              aria-label="Augmenter la quantité"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <button
            onClick={handleAdd}
            disabled={isDisabled}
            className={`px-4 py-2 rounded-md font-medium transition-colors text-white ${isDisabled ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            {outOfStock ? 'Épuisé' : disabled ? 'Indisponible' : 'Ajouter au panier'}
          </button>
        </div>
      </div>
    </div>
  );
}


