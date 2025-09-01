import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, Plus } from 'lucide-react';
import MarkdownEditor from './MarkdownEditor';

export interface FAQFormItem {
  id: string;
  question: string;
  answer: string;
}

interface FAQEditorProps {
  value: FAQFormItem[];
  onChange: (items: FAQFormItem[]) => void;
}

function SortableFAQItem({
  item,
  onChange,
  onRemove,
}: {
  item: FAQFormItem;
  onChange: (item: FAQFormItem) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  const questionError = !item.question.trim();
  const answerError = item.answer.trim().length < 20;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="border rounded-md p-4 bg-white"
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-move pt-2 text-gray-400"
        >
          <GripVertical className="h-5 w-5" />
        </button>
        <div className="flex-1 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Question
            </label>
            <input
              type="text"
              value={item.question}
              onChange={(e) => onChange({ ...item, question: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
            {questionError && (
              <p className="mt-1 text-sm text-red-600">
                La question ne peut pas être vide
              </p>
            )}
          </div>
          <MarkdownEditor
            label="Réponse"
            value={item.answer}
            onChange={(val) => onChange({ ...item, answer: val })}
            rows={4}
          />
          {answerError && (
            <p className="mt-1 text-sm text-red-600">
              La réponse doit contenir au moins 20 caractères
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="text-red-600 hover:text-red-800 ml-2"
        >
          <Trash2 className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

export default function FAQEditor({ value, onChange }: FAQEditorProps) {
  const sensors = useSensors(useSensor(PointerSensor));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = value.findIndex((i) => i.id === active.id);
      const newIndex = value.findIndex((i) => i.id === over.id);
      onChange(arrayMove(value, oldIndex, newIndex));
    }
  };

  const updateItem = (id: string, newItem: FAQFormItem) => {
    onChange(value.map((item) => (item.id === id ? newItem : item)));
  };

  const addItem = () => {
    onChange([...value, { id: crypto.randomUUID(), question: '', answer: '' }]);
  };

  const removeItem = (id: string) => {
    onChange(value.filter((item) => item.id !== id));
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        FAQ
      </label>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={value.map((i) => i.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-4">
            {value.map((item) => (
              <SortableFAQItem
                key={item.id}
                item={item}
                onChange={(updated) => updateItem(item.id, updated)}
                onRemove={() => removeItem(item.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <button
        type="button"
        onClick={addItem}
        className="mt-4 inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
      >
        <Plus className="h-4 w-4 mr-1" />
        Ajouter une question
      </button>
    </div>
  );
}
