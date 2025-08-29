import React from 'react';
import { CheckCircle, X, Download, Mail } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  reservationNumber: string;
  email: string;
  eventName: string;
  passName: string;
  price: number;
  timeSlot?: {
    slot_time: string;
  };
  activityName?: string;
}

export default function ConfirmationModal({
  isOpen,
  onClose,
  reservationNumber,
  email,
  eventName,
  passName,
  price,
  timeSlot,
  activityName
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  const handleDownloadTicket = () => {
    // Simuler le téléchargement du billet
    const ticketContent = `
BILLET ÉLECTRONIQUE
===================

Événement: ${eventName}
Pass: ${passName}
Prix: ${price}€
Réservation: ${reservationNumber}
Email: ${email}
${activityName ? `Activité: ${activityName}` : ''}
${timeSlot ? `Horaire: ${new Date(timeSlot.slot_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}` : ''}

Présentez ce billet à l'entrée de l'événement.
    `;

    const blob = new Blob([ticketContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `billet-${reservationNumber}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-green-100 rounded-full p-2">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">
                Réservation Confirmée !
              </h2>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="space-y-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Numéro de réservation</div>
              <div className="font-mono text-lg font-semibold text-gray-900">
                {reservationNumber}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Événement:</span>
                <span className="font-medium">{eventName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Pass:</span>
                <span className="font-medium">{passName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Prix:</span>
                <span className="font-medium">{price}€</span>
              </div>
              {activityName && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Activité:</span>
                    <span className="font-medium">{activityName}</span>
                  </div>
                </>
              )}
              {timeSlot && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Horaire:</span>
                    <span className="font-medium">
                      {new Date(timeSlot.slot_time).toLocaleTimeString('fr-FR', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleDownloadTicket}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Download className="h-4 w-4" />
              Télécharger le Billet
            </button>
            
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-sm text-gray-600 mb-2">
                <Mail className="h-4 w-4" />
                <span>Confirmation envoyée à {email}</span>
              </div>
              <p className="text-xs text-gray-500">
                Vérifiez votre boîte de réception et vos spams
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
