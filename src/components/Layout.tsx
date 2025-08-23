import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { ShoppingCart, Calendar, HelpCircle, Search } from 'lucide-react';
import { getCartItems } from '../lib/cart';

export default function Layout() {
  const location = useLocation();
  const [cartCount, setCartCount] = useState(0);
  
  useEffect(() => {
    const updateCartCount = async () => {
      const items = await getCartItems();
      setCartCount(items.length);
    };
    
    updateCartCount();
    
    // Mettre à jour le compteur toutes les 5 secondes
    const interval = setInterval(updateCartCount, 5000);
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2">
              <Calendar className="h-8 w-8 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">BilletEvent</span>
            </Link>
            
            {/* Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              <Link 
                to="/" 
                className={`text-sm font-medium transition-colors ${
                  location.pathname === '/' 
                    ? 'text-blue-600' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Événements
              </Link>
              <Link 
                to="/find-ticket" 
                className={`text-sm font-medium transition-colors ${
                  location.pathname === '/find-ticket' 
                    ? 'text-blue-600' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Retrouver mon Billet
              </Link>
            </nav>
            
            {/* Actions */}
            <div className="flex items-center space-x-4">
              <Link 
                to="/cart" 
                className="relative p-2 text-gray-400 hover:text-gray-500 transition-colors group"
              >
                <ShoppingCart className="h-6 w-6 group-hover:text-blue-600 transition-colors" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                    {cartCount}
                  </span>
                )}
              </Link>
              
              <Link 
                to="/admin" 
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Admin
              </Link>
            </div>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main>
        <Outlet />
      </main>
      
      {/* Footer */}
      <footer className="bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center space-x-2 mb-4">
                <Calendar className="h-8 w-8 text-blue-400" />
                <span className="text-xl font-bold">BilletEvent</span>
              </div>
              <p className="text-gray-300 max-w-md">
                Votre plateforme de billetterie événementielle. 
                Organisez et vendez vos billets en toute simplicité.
              </p>
            </div>
            
            <div>
              <h3 className="text-sm font-semibold text-gray-200 uppercase tracking-wider mb-4">
                Navigation
              </h3>
              <ul className="space-y-2">
                <li>
                  <Link to="/" className="text-gray-300 hover:text-white transition-colors">
                    Événements
                  </Link>
                </li>
                <li>
                  <Link to="/find-ticket" className="text-gray-300 hover:text-white transition-colors">
                    Retrouver mon Billet
                  </Link>
                </li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-sm font-semibold text-gray-200 uppercase tracking-wider mb-4">
                Support
              </h3>
              <ul className="space-y-2">
                <li>
                  <a href="#" className="text-gray-300 hover:text-white transition-colors">
                    Conditions Générales
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-300 hover:text-white transition-colors">
                    Politique de Confidentialité
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-300 hover:text-white transition-colors">
                    Contact
                  </a>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 pt-8 mt-8">
            <p className="text-gray-400 text-sm text-center">
              © 2025 BilletEvent. Tous droits réservés.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}