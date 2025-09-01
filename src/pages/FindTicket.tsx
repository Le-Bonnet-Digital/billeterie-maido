import { useState, type FormEvent } from 'react';
import { Search, Mail, Shield, CheckCircle } from 'lucide-react';
import { requestReservationEmail } from '../lib/requestReservationEmail';
import { toast } from 'react-hot-toast';
import { logger } from '../lib/logger';

export default function FindTicket() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [found, setFound] = useState(false);
  const [captchaVerified, setCaptchaVerified] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!email) {
      toast.error('Veuillez saisir votre adresse e-mail');
      return;
    }

    if (!captchaVerified) {
      toast.error('Veuillez vérifier le CAPTCHA');
      return;
    }

    try {
      setLoading(true);

      // Demander au serveur d'envoyer l'e-mail (sans exposer la table)
      const res = await requestReservationEmail({ email });

      if (res.found && res.sent) {
        setFound(true);
        toast.success('E-mail de confirmation renvoyé !');
      } else {
        toast.error('Aucune réservation trouvée pour cette adresse e-mail');
      }
    } catch (err) {
      logger.error('Erreur recherche billet', { error: err });
      toast.error(
        err instanceof Error
          ? err.message
          : 'Une erreur est survenue lors de la recherche',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCaptchaClick = () => {
    // Simuler la vérification du CAPTCHA
    setCaptchaVerified(!captchaVerified);
    if (!captchaVerified) {
      toast.success('CAPTCHA vérifié');
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="bg-blue-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
          <Search className="h-8 w-8 text-blue-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Retrouver mon Billet
        </h1>
        <p className="text-gray-600">
          Saisissez votre adresse e-mail pour recevoir à nouveau votre
          confirmation de réservation.
        </p>
      </div>

      {!found ? (
        /* Formulaire de recherche */
        <div className="bg-white rounded-lg shadow-sm p-8">
          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-6">
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Adresse e-mail
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="votre.email@exemple.com"
                  required
                />
              </div>
            </div>

            {/* Protection CAPTCHA placeholder */}
            <div className="bg-gray-50 border border-gray-200 rounded-md p-4 mb-6">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-gray-500" />
                <div className="flex-1">
                  <button
                    type="button"
                    onClick={handleCaptchaClick}
                    className="flex items-center gap-2 hover:bg-gray-100 p-1 rounded transition-colors"
                  >
                    <div
                      className={`w-6 h-6 border-2 rounded-sm flex items-center justify-center transition-colors ${
                        captchaVerified
                          ? 'border-green-500 bg-green-500'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      {captchaVerified && (
                        <svg
                          className="w-4 h-4 text-white"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </div>
                    <span className="text-sm text-gray-700">
                      Je ne suis pas un robot
                    </span>
                  </button>
                </div>
                <div className="text-xs text-gray-500">reCAPTCHA</div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !captchaVerified}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white px-6 py-3 rounded-md font-medium transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Recherche en cours...
                </>
              ) : (
                <>
                  <Search className="h-5 w-5" />
                  Rechercher mes billets
                </>
              )}
            </button>
          </form>

          {/* Informations de sécurité */}
          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-blue-900 mb-1">
                  Sécurité et Confidentialité
                </h3>
                <p className="text-sm text-blue-800">
                  Votre adresse e-mail est utilisée uniquement pour retrouver
                  vos réservations. Aucune donnée personnelle n'est stockée ou
                  partagée.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Confirmation d'envoi */
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <div className="bg-green-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>

          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            E-mail envoyé avec succès !
          </h2>

          <p className="text-gray-600 mb-6">
            Votre confirmation de réservation a été renvoyée à l'adresse :<br />
            <strong>{email}</strong>
          </p>

          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-700">
              <strong>Vérifiez votre boîte de réception</strong> ainsi que votre
              dossier spam/courriers indésirables. L'e-mail peut mettre quelques
              minutes à arriver.
            </p>
          </div>

          <button
            onClick={() => {
              setFound(false);
              setEmail('');
            }}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Faire une nouvelle recherche
          </button>
        </div>
      )}

      {/* Aide */}
      <div className="mt-8 text-center">
        <h3 className="text-sm font-medium text-gray-900 mb-2">
          Vous rencontrez des difficultés ?
        </h3>
        <p className="text-sm text-gray-600">
          Contactez notre support à{' '}
          <a
            href="mailto:support@billetevent.com"
            className="text-blue-600 hover:text-blue-700"
          >
            support@billetevent.com
          </a>
        </p>
      </div>
    </div>
  );
}
