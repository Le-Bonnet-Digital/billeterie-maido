import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface EventCardProps {
  event: {
    id: string;
    name: string;
    event_date: string;
    sales_opening_date: string;
    sales_closing_date: string;
    key_info_content: string;
  };
}

export default function EventCard({ event }: EventCardProps) {
  const eventDate = new Date(event.event_date);
  const now = new Date();
  const salesEnd = new Date(event.sales_closing_date);
  const isOnSale = now <= salesEnd;
  
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
      {/* Image placeholder */}
      <div className="h-48 bg-gradient-to-br from-green-500 via-blue-500 to-purple-600 flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-black bg-opacity-20"></div>
        <div className="relative z-10 text-center">
          <Calendar className="h-12 w-12 text-white opacity-90 mx-auto mb-2" />
          <div className="text-white font-semibold text-lg">
            {format(eventDate, 'd MMM', { locale: fr })}
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-6">
        <div className="flex items-center gap-2 mb-2">
          <Calendar className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-medium text-blue-600">
            {format(eventDate, 'EEEE d MMMM yyyy', { locale: fr })}
          </span>
        </div>
        
        <h3 className="text-xl font-bold text-gray-900 mb-3">
          {event.name}
        </h3>
        
        <p className="text-gray-600 text-sm mb-4 line-clamp-3">
          {event.key_info_content}
        </p>
        
        {/* Status */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-400" />
            <span className="text-xs text-gray-500">
              Vente jusqu'au {format(salesEnd, 'dd/MM à HH:mm')}
            </span>
          </div>
          
          {isOnSale ? (
            <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full">
              En vente
            </span>
          ) : (
            <span className="bg-red-100 text-red-800 text-xs font-medium px-2 py-1 rounded-full">
              Terminé
            </span>
          )}
        </div>
        
        {/* Actions */}
        <div className="flex gap-2">
          <Link
            to={`/event/${event.id}`}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium text-center transition-colors"
          >
            Voir les Billets
          </Link>
          <div className="flex gap-1">
            <Link
              to={`/event/${event.id}/faq`}
              className="px-3 py-2 border border-gray-300 hover:border-gray-400 text-gray-700 rounded-md text-sm font-medium transition-colors"
              title="FAQ"
            >
              FAQ
            </Link>
            <Link
              to={`/event/${event.id}/cgv`}
              className="px-3 py-2 border border-gray-300 hover:border-gray-400 text-gray-700 rounded-md text-sm font-medium transition-colors"
              title="CGV"
            >
              CGV
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}