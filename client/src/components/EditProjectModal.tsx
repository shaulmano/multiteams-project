import { useState } from 'react';
import { projectsApi } from '../api';
import type { Project } from '../types';
import { X, Pencil } from 'lucide-react';

interface Props {
  project: Project;
  onClose: () => void;
  onSaved: (p: Project) => void;
}

export default function EditProjectModal({ project, onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    name: project.name,
    description: project.description || '',
    jira_project_key: project.jira_project_key || '',
    monday_board_id: project.monday_board_id || '',
    start_date: project.start_date,
    end_date: project.end_date,
    status: project.status
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
      const updated = await projectsApi.update(project.id, {
        ...form,
        jira_project_key: form.jira_project_key.trim().toUpperCase() || undefined,
        monday_board_id: form.monday_board_id.trim() || undefined
      });
      onSaved(updated);
    } catch (e: any) {
      setError(e.response?.data?.error || 'שגיאה בשמירה');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-dark-800 rounded-2xl border border-dark-600 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-dark-600">
          <div className="flex items-center gap-3">
            <Pencil size={18} className="text-blue-400" />
            <h2 className="text-white font-semibold">עריכת פרויקט</h2>
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
              className="w-full bg-dark-700 border border-dark-500 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              value={form.name}
              onChange={e => set('name', e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5">תיאור</label>
            <textarea
              className="w-full bg-dark-700 border border-dark-500 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
              rows={2}
              value={form.description}
              onChange={e => set('description', e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5">מפתח פרויקט ב-Jira</label>
            <input
              className="w-full bg-dark-700 border border-dark-500 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 uppercase"
              placeholder="לדוגמה: QA או TEST"
              value={form.jira_project_key}
              onChange={e => set('jira_project_key', e.target.value.toUpperCase())}
            />
            <p className="text-xs text-gray-600 mt-1">מהרשימה שהופיעה בהגדרות Jira</p>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Monday Board ID</label>
            <input
              className="w-full bg-dark-700 border border-dark-500 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              placeholder="לדוגמה: 1234567890"
              value={form.monday_board_id}
              onChange={e => set('monday_board_id', e.target.value)}
            />
            <p className="text-xs text-gray-600 mt-1">ה-ID מופיע בהגדרות → Monday.com → בדוק חיבור</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">תאריך התחלה *</label>
              <input type="date"
                className="w-full bg-dark-700 border border-dark-500 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                value={form.start_date}
                onChange={e => set('start_date', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">תאריך סיום *</label>
              <input type="date"
                className="w-full bg-dark-700 border border-dark-500 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                value={form.end_date}
                onChange={e => set('end_date', e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5">סטטוס פרויקט</label>
            <select
              className="w-full bg-dark-700 border border-dark-500 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
              value={form.status}
              onChange={e => set('status', e.target.value)}
            >
              <option value="active">פעיל</option>
              <option value="on_hold">מוקפא</option>
              <option value="completed">הושלם</option>
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving}
              className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-medium transition-colors">
              {saving ? 'שומר...' : 'שמור שינויים'}
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
