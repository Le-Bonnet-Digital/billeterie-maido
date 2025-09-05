import { useEffect } from 'react';
import { clearCart } from '../lib/cart';

export default function Success() {
  useEffect(() => {
    clearCart();
  }, []);
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <h1 className="text-2xl font-bold mb-4">Paiement confirmé</h1>
      <p className="text-gray-700">
        Un email de confirmation vous a été envoyé.
      </p>
    </div>
  );
}
