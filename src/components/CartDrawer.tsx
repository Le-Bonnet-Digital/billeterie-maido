import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getCartItems, calculateCartTotal, type CartItem } from '../lib/cart';
import { ShoppingCart } from 'lucide-react';

export default function CartDrawer() {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    const load = async () => {
      const data = await getCartItems();
      setItems(data);
    };
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, []);

  const total = calculateCartTotal(items);
  const count = items.length;
  if (count === 0) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40">
      <div className="bg-white border border-gray-200 shadow-xl rounded-full px-4 py-2 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5 text-blue-600" />
          <span className="text-sm text-gray-700">{count} article(s)</span>
        </div>
        <div className="font-semibold text-gray-900">{total.toFixed(2)}€</div>
        <Link
          to="/cart"
          className="bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2 rounded-full font-medium transition-colors"
        >
          Voir le panier
        </Link>
      </div>
    </div>
  );
}

