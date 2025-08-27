import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Mail, Send, Users, FileText, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { logger } from '../../lib/logger';
import { wait } from '../../lib/wait';

interface Event {
  id: string;
  name: string;
  event_date: string;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
}

export default function Communication() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string>('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailContent, setEmailContent] = useState('');
  const [recipientCount, setRecipientCount] = useState(0);
  const [sending, setSending] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  const emailTemplates: EmailTemplate[] = [
    {
      id: '1',
      name: 'Rappel événement',
      subject: 'Rappel : Votre événement approche !',
      content: `Bonjour,

Nous espérons que vous allez bien !

Nous vous rappelons que votre événement "{EVENT_NAME}" aura lieu le {EVENT_DATE}.

N'oubliez pas d'apporter votre billet (numéro de réservation : {RESERVATION_NUMBER}).

Informations pratiques :
- Heure d'ouverture : 9h00
- Lieu : Parc des Palmistes, Saint-Benoit
- Parking gratuit disponible

Nous avons hâte de vous accueillir !

L'équipe BilletEvent`
    },
    {
      id: '2',
      name: 'Confirmation de réservation',
      subject: 'Confirmation de votre réservation',
      content: `Bonjour,

Votre réservation pour l'événement "{EVENT_NAME}" a bien été confirmée !

Détails de votre réservation :
- Numéro : {RESERVATION_NUMBER}
- Événement : {EVENT_NAME}
- Date : {EVENT_DATE}
- Pass : {PASS_NAME}

Votre billet est en pièce jointe de cet email.

Merci pour votre confiance !

L'équipe BilletEvent`
    },
    {
      id: '3',
      name: 'Information importante',
      subject: 'Information importante concernant votre événement',
      content: `Bonjour,

Nous vous contactons concernant l'événement "{EVENT_NAME}" pour lequel vous avez une réservation.

[Insérez ici votre message important]

Si vous avez des questions, n'hésitez pas à nous contacter.

Cordialement,
L'équipe BilletEvent`
    }
  ];

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    if (selectedEvent) {
      loadRecipientCount();
    }
  }, [selectedEvent]);

  const loadEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('id, name, event_date')
        .order('event_date', { ascending: false });

      if (error) throw error;
      setEvents(data || []);
    } catch (err) {
      logger.error('Erreur chargement événements', { error: err });
      toast.error('Erreur lors du chargement des événements');
    }
  };

  const loadRecipientCount = async () => {
    try {
      const { data, error } = await supabase
        .from('reservations')
        .select(`
          client_email,
          passes!inner (
            event_id
          )
        `)
        .eq('passes.event_id', selectedEvent)
        .eq('payment_status', 'paid');

      if (error) throw error;
      
      // Compter les emails uniques
      const uniqueEmails = new Set((data || []).map(r => r.client_email));
      setRecipientCount(uniqueEmails.size);
    } catch (err) {
      logger.error('Erreur comptage destinataires', { error: err });
      toast.error('Erreur lors du comptage des destinataires');
      setRecipientCount(0);
    }
  };

  const handleSendEmail = async () => {
    if (!selectedEvent || !emailSubject || !emailContent) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    if (recipientCount === 0) {
      toast.error('Aucun destinataire trouvé pour cet événement');
      return;
    }

    try {
      setSending(true);
      
      // Simuler l'envoi d'email
      const sendDelay = 2000;
      await wait(sendDelay);
      
      toast.success(`Email envoyé à ${recipientCount} destinataire(s)`);
      
      // Réinitialiser le formulaire
      setEmailSubject('');
      setEmailContent('');
      setSelectedEvent('');
      setRecipientCount(0);
    } catch (err) {
      logger.error('Erreur envoi email', { error: err });
      toast.error('Erreur lors de l\'envoi');
    } finally {
      setSending(false);
    }
  };

  const applyTemplate = (template: EmailTemplate) => {
    setEmailSubject(template.subject);
    setEmailContent(template.content);
    setShowTemplateModal(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Communication</h1>
          <p className="text-gray-600">Envoyez des emails aux participants de vos événements</p>
        </div>
        <button
          onClick={() => setShowTemplateModal(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          <FileText className="h-4 w-4" />
          Modèles
        </button>
      </div>

      {/* Formulaire d'envoi */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Nouvel Email</h2>
        
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Événement cible *
            </label>
            <select
              value={selectedEvent}
              onChange={(e) => setSelectedEvent(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">Sélectionner un événement</option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name} - {new Date(event.event_date).toLocaleDateString('fr-FR')}
                </option>
              ))}
            </select>
            {selectedEvent && (
              <p className="text-sm text-gray-500 mt-1">
                {recipientCount} destinataire(s) trouvé(s)
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Objet de l'email *
            </label>
            <input
              type="text"
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Objet de votre email..."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contenu de l'email *
            </label>
            <textarea
              value={emailContent}
              onChange={(e) => setEmailContent(e.target.value)}
              rows={12}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Rédigez votre message..."
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Variables disponibles : {'{EVENT_NAME}'}, {'{EVENT_DATE}'}, {'{RESERVATION_NUMBER}'}, {'{PASS_NAME}'}
            </p>
          </div>

          <div className="flex items-center justify-between pt-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Users className="h-4 w-4" />
              <span>
                {recipientCount > 0 
                  ? `Prêt à envoyer à ${recipientCount} destinataire(s)`
                  : 'Sélectionnez un événement pour voir les destinataires'
                }
              </span>
            </div>
            
            <button
              onClick={handleSendEmail}
              disabled={!selectedEvent || !emailSubject || !emailContent || recipientCount === 0 || sending}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              {sending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Envoi en cours...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Envoyer l'Email
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Historique des envois */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Historique des Envois</h2>
        <div className="text-center py-8 text-gray-500">
          <Mail className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>Aucun email envoyé pour le moment</p>
          <p className="text-sm">L'historique des envois apparaîtra ici</p>
        </div>
      </div>

      {/* Modal des modèles */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Modèles d'Email</h2>
                <button onClick={() => setShowTemplateModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-140px)]">
              <div className="grid grid-cols-1 gap-4">
                {emailTemplates.map((template) => (
                  <div key={template.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-900">{template.name}</h3>
                        <p className="text-sm text-gray-600">{template.subject}</p>
                      </div>
                      <button
                        onClick={() => applyTemplate(template)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
                      >
                        Utiliser
                      </button>
                    </div>
                    <div className="text-sm text-gray-700 bg-gray-50 rounded p-3 max-h-32 overflow-y-auto">
                      <pre className="whitespace-pre-wrap font-sans">{template.content}</pre>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}