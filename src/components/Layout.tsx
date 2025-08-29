import React, { useState, useEffect, useMemo } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { ShoppingCart, Calendar } from 'lucide-react';
import { getCartItems } from '../lib/cart';
import { getCurrentUser } from '../lib/auth';

export default function Layout() {
  const location = useLocation();
  const [cartCount, setCartCount] = useState(0);
  const brandName = useMemo(() => (import.meta.env.VITE_BRAND_NAME ?? ''), []);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  
  useEffect(() => {
    const updateCartCount = async () => {
      try {
        const items = await getCartItems();
        setCartCount(items.length);
      } catch (error) {
        console.warn('Could not update cart count:', error);
        setCartCount(0);
      }
    };
    
    updateCartCount();
    
    // Mettre à jour le compteur toutes les 5 secondes
    const interval = setInterval(updateCartCount, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const user = await getCurrentUser();
        const isUser = !!user;
        setIsAdmin(isUser && user!.role === 'admin');
        setIsLoggedIn(isUser);
      } catch {
        setIsAdmin(false);
        setIsLoggedIn(false);
      }
    };
    checkAdmin();
  }, []);
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2" aria-label={brandName ? undefined : 'Accueil'}>
              <Calendar className="h-8 w-8 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">
                {brandName}
              </span>
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
                Billetterie
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
              {isLoggedIn && (
                <Link
                  to="/profile"
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Profil
                </Link>
              )}
              <Link
                to="/cart"
                aria-label="Panier"
                className="relative p-2 text-gray-400 hover:text-gray-500 transition-colors group"
              >
                <ShoppingCart className="h-6 w-6 group-hover:text-blue-600 transition-colors" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                    {cartCount}
                  </span>
                )}
                <span className="sr-only">Panier</span>
              </Link>
              
              {isAdmin && (
                <Link 
                  to="/admin" 
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Admin
                </Link>
              )}
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
                <span className="text-xl font-bold">{brandName}</span>
              </div>
              <p className="text-gray-300 max-w-md">
                Billetterie officielle du Parc de la Luge. Achetez vos billets en ligne en toute simplicité.
              </p>
            </div>
            
            <div>
              <h3 className="text-sm font-semibold text-gray-200 uppercase tracking-wider mb-4">
                Navigation
              </h3>
              <ul className="space-y-2">
                <li>
                  <Link to="/" className="text-gray-300 hover:text-white transition-colors">
                    Billetterie
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
              © 2025 {(brandName || import.meta.env.VITE_BRAND_NAME || '').trim()}.
              {' '}Tous droits réservés.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

