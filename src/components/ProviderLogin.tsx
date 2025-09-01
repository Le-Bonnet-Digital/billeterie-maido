import { useState, type FormEvent } from 'react';
import { Lock, Mail, Eye, EyeOff } from 'lucide-react';
import { signInWithEmail } from '../lib/auth';
import type { User } from '../lib/auth';
import { toast } from 'react-hot-toast';

interface ProviderLoginProps {
  onLogin: (user: User) => void;
}

const ALLOWED: User['role'][] = [
  'pony_provider',
  'archery_provider',
  'luge_provider',
  'atlm_collaborator',
  'admin',
];

export default function ProviderLogin({ onLogin }: ProviderLoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    try {
      const user = await signInWithEmail(email, password);
      if (user && ALLOWED.includes(user.role)) {
        onLogin(user);
      } else {
        toast.error('Accès refusé');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="bg-blue-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <Lock className="h-8 w-8 text-blue-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Espace Prestataire
          </h2>
          <p className="text-gray-600">
            Connectez-vous pour valider les inscriptions
          </p>
        </div>
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-lg shadow-sm p-8 space-y-6"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Adresse email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="prestataire@exemple.com"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mot de passe
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Votre mot de passe"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-3 rounded-md font-medium"
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  );
}
