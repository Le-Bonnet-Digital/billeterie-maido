import React from 'react';
import { Disclosure } from '@headlessui/react';
import { ChevronUp } from 'lucide-react';
import MarkdownRenderer from './MarkdownRenderer';

export interface FAQItem {
  question: string;
  answer: string;
}

interface FAQAccordionProps {
  faqs: FAQItem[];
}

export default function FAQAccordion({ faqs }: FAQAccordionProps) {
  if (!faqs || faqs.length === 0) {
    return (
      <p className="text-gray-600">Aucune question n'est disponible pour cet événement.</p>
    );
  }

  return (
    <div className="space-y-4">
      {faqs.map((faq, index) => (
        <Disclosure key={index}>
          {({ open }) => (
            <div className="border border-gray-200 rounded-lg bg-white">
              <Disclosure.Button className="flex items-center w-full justify-between p-4 text-left text-gray-900 font-medium hover:bg-gray-50 transition-colors">
                <span>{faq.question}</span>
                <ChevronUp
                  className={`${open ? 'rotate-180 transform' : ''} h-5 w-5 text-blue-600`}
                />
              </Disclosure.Button>
              <Disclosure.Panel className="p-4 border-t border-gray-200 bg-gray-50 text-gray-600">
                <MarkdownRenderer content={faq.answer} />
              </Disclosure.Panel>
            </div>
          )}
        </Disclosure>
      ))}
    </div>
  );
}
