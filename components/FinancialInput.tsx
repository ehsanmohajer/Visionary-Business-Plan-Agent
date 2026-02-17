
import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { ExpenseItem, Language } from '../types';
import { translations } from '../translations';

interface FinancialInputProps {
  label: string;
  items: ExpenseItem[];
  onChange: (items: ExpenseItem[]) => void;
  lang: Language;
}

const FinancialInput: React.FC<FinancialInputProps> = ({ label, items, onChange, lang }) => {
  const t = translations[lang];

  const addItem = () => {
    onChange([...items, { id: Math.random().toString(36).substr(2, 9), name: '', amount: 0 }]);
  };

  const removeItem = (id: string) => {
    onChange(items.filter(i => i.id !== id));
  };

  const updateItem = (id: string, field: 'name' | 'amount', value: string | number) => {
    onChange(items.map(i => i.id === id ? { ...i, [field]: value } : i));
  };

  return (
    <div className="mb-6">
      <label className="block text-sm font-semibold mb-2 text-slate-700 dark:text-slate-300">{label}</label>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="flex gap-2">
            <input
              type="text"
              placeholder="Expense name"
              value={item.name}
              onChange={(e) => updateItem(item.id, 'name', e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-brand-500 outline-none"
            />
            <input
              type="number"
              placeholder="0"
              value={item.amount || ''}
              onChange={(e) => updateItem(item.id, 'amount', parseFloat(e.target.value) || 0)}
              className="w-24 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-brand-500 outline-none"
            />
            <button
              onClick={() => removeItem(item.id)}
              className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
      <button
        onClick={addItem}
        className="mt-2 flex items-center text-sm text-brand-600 dark:text-brand-400 font-medium hover:underline"
      >
        <Plus className="w-4 h-4 mr-1" /> {t.add_item}
      </button>
    </div>
  );
};

export default FinancialInput;
