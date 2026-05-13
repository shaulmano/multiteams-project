import { useState } from 'react';
import { projectsApi } from '../api';
import type { Project } from '../types';
import { X, FolderPlus } from 'lucide-react';

interface Props {
  onClose: () => void;
  onCreated: (p: Project) => void;
}

export default function AddProjectModal({ onClose, onCreated }: Props) {
  const today = new Date().toISOString().split('T')[0];
  const inThreeMonths = new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0];

  const [form, setForm] = useState({
    name: '',
    description: '',
    jira_project_key: '',
    start_date: today,
    end_date: inThreeMonths
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (key: string, val: string) => setForm(p => ({ ...p, [key]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('שם הפרויקט הוא שדה חובה'); return; }
    if (form.start_date >= form.end_date) { setError('תאריך סיום חייב להיות אחרי תאריך התחלה'); return; }

    setSaving(true);
    setError('');
    try {
      const project = await projectsApi.create({
        name: form.name.trim(),
        description: form.description.trim(),
        jira_project_key: form.jira_project_key.trim().toUpperCase() || undefined,
        start_date: form.start_date,
        end_date: form.end_date
      });
      onCreated(project);
    } catch (e: any) {
      setError(e.response?.data?.error || 'שגיאה ביצירת הפרויקט');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-dark-800 rounded-2xl border border-dark-600 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-dark-600">
          <div className="flex items-center gap-3">
            <FolderPlus size={20} className="text-emerald-400" />
            <h2 className="text-white font-semibold">פרויקט חדש</h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-500 hover:text-white hover:bg-dark-600 rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="bg-red-400/10 border border-red-400/30 rounded-lg px-3 py-2 text-sm text-red-400">{error}</div>
          )}

          <div>
            <label className="block text-xs text-gray-400 mb-1.5">שם הפרויקט *</label>
            <input
              required
              className="w-full bg-dark-700 border border-dark-500 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="לדוגמה: מערכת CRM חדשה"
              value={form.name}
              onChange={e => set('name', e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5">תיאור (אופציונלי)</label>
            <textarea
              className="w-full bg-dark-700 border border-dark-500 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors resize-none"
              placeholder="תיאור קצר של הפרויקט..."
              rows={2}
              value={form.description}
              onChange={e => set('description', e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5">מפתח פרויקט ב-Jira (אופציונלי)</label>
            <input
              className="w-full bg-dark-700 border border-dark-500 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors uppercase"
              placeholder="לדוגמה: PROJ או CRM"
              value={form.jira_project_key}
              onChange={e => set('jira_project_key', e.target.value.toUpperCase())}
            />
            <p className="text-xs text-gray-600 mt-1">השאר ריק אם לא משתמש ב-Jira</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">תאריך התחלה *</label>
              <input
                required type="date"
                className="w-full bg-dark-700 border border-dark-500 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                value={form.start_date}
                onChange={e => set('start_date', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">תאריך סיום *</label>
              <input
                required type="date"
                className="w-full bg-dark-700 border border-dark-500 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                value={form.end_date}
                onChange={e => set('end_date', e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-medium transition-colors">
              {saving ? 'יוצר...' : 'צור פרויקט'}
            </button>
            <button type="button" onClick={onClose}
              className="flex-1 bg-dark-600 hover:bg-dark-500 text-gray-300 py-2.5 rounded-lg text-sm font-medium transition-colors">
              ביטול
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
