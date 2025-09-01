import { useState, type ChangeEvent } from 'react';
import MarkdownRenderer from '../MarkdownRenderer';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  rows?: number;
  id?: string;
}

export default function MarkdownEditor({
  value,
  onChange,
  label,
  rows = 6,
  id,
}: MarkdownEditorProps) {
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    if (!newValue.trim()) {
      setError('Le contenu ne peut pas être vide.');
    } else {
      setError(null);
    }
  };

  return (
    <div>
      <label
        htmlFor={id}
        className="block text-sm font-medium text-gray-700 mb-1"
      >
        {label}
      </label>
      <textarea
        id={id}
        value={value}
        onChange={handleChange}
        rows={rows}
        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
      />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      <div className="mt-4">
        <p className="text-sm font-medium text-gray-700 mb-1">
          Prévisualisation
        </p>
        <div className="border border-gray-200 rounded-md p-3">
          <MarkdownRenderer content={value} />
        </div>
      </div>
    </div>
  );
}
