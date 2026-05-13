import { useState, useEffect } from 'react';
import { configApi } from '../api';
import axios from 'axios';
import type { JiraConfig } from '../types';
import { X, Settings, CheckCircle, AlertCircle, Eye, EyeOff, Trash2, Wifi, Loader } from 'lucide-react';

interface Props {
  onClose: () => void;
}

export default function SettingsModal({ onClose }: Props) {
  const [config, setConfig] = useState<JiraConfig | null>(null);
  const [form, setForm] = useState({ base_url: '', email: '', api_token: '' });
  const [showToken, setShowToken] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string; detail?: string } | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; user?: string; error?: string; detail?: string } | null>(null);
  const [jiraProjects, setJiraProjects] = useState<{ key: string; name: string }[]>([]);

  useEffect(() => {
    configApi.get().then(cfg => {
      setConfig(cfg);
      if (cfg) setForm(f => ({ ...f, base_url: cfg.base_url, email: cfg.email }));
    });
  }, []);

  const set = (key: string, val: string) => setForm(p => ({ ...p, [key]: val }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.base_url || !form.email) { setMessage({ type: 'error', text: 'URL ואימייל הם שדות חובה' }); return; }
    if (!form.api_token && !config) { setMessage({ type: 'error', text: 'API Token הוא שדה חובה בחיבור ראשון' }); return; }

    setSaving(true);
    setMessage(null);
    try {
      const payload: { base_url: string; email: string; api_token?: string } = {
        base_url: form.base_url.replace(/\/$/, ''),
        email: form.email,
      };
      if (form.api_token) payload.api_token = form.api_token;
      const saved = await configApi.save(payload as any);
      setConfig(saved as any);
      setMessage({ type: 'success', text: 'הגדרות נשמרו — לחץ "בדוק חיבור" לאימות' });
      setForm(f => ({ ...f, api_token: '' }));
      setTestResult(null);
    } catch (e: any) {
      setMessage({ type: 'error', text: e.response?.data?.error || 'שגיאה בשמירה' });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    setJiraProjects([]);
    try {
      const resp = await axios.get('/api/jira/test');
      setTestResult({ success: true, user: resp.data.user });
      // Load available projects
      try {
        const pResp = await axios.get('/api/jira/projects');
        setJiraProjects(pResp.data);
      } catch {}
    } catch (e: any) {
      setTestResult({
        success: false,
        error: e.response?.data?.error || e.message,
        detail: e.response?.data?.details
      });
    } finally {
      setTesting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('למחוק את הגדרות ה-Jira?')) return;
    await configApi.delete();
    setConfig(null);
    setForm({ base_url: '', email: '', api_token: '' });
    setTestResult(null);
    setJiraProjects([]);
    setMessage({ type: 'success', text: 'הגדרות נמחקו' });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-dark-800 rounded-2xl border border-dark-600 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-dark-600 sticky top-0 bg-dark-800 z-10">
          <div className="flex items-center gap-3">
            <Settings size={20} className="text-blue-400" />
            <h2 className="text-white font-semibold">הגדרות Jira</h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-500 hover:text-white hover:bg-dark-600 rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-5">
          {/* Connection status */}
          <div className={`flex items-center gap-2 p-3 rounded-lg mb-4 ${config ? 'bg-emerald-400/10 border border-emerald-400/20' : 'bg-dark-700 border border-dark-500'}`}>
            {config
              ? <><CheckCircle size={16} className="text-emerald-400 flex-shrink-0" /><span className="text-sm text-emerald-300 truncate">{config.base_url}</span></>
              : <><AlertCircle size={16} className="text-gray-500" /><span className="text-sm text-gray-400">Jira לא מחובר</span></>
            }
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            {message && (
              <div className={`flex items-start gap-2 p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-emerald-400/10 text-emerald-300 border border-emerald-400/20' : 'bg-red-400/10 text-red-300 border border-red-400/20'}`}>
                {message.type === 'success' ? <CheckCircle size={14} className="mt-0.5 flex-shrink-0" /> : <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />}
                <span>{message.text}</span>
              </div>
            )}

            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Jira Base URL</label>
              <input type="url"
                className="w-full bg-dark-700 border border-dark-500 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="https://your-company.atlassian.net"
                value={form.base_url}
                onChange={e => set('base_url', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1.5">אימייל</label>
              <input type="email"
                className="w-full bg-dark-700 border border-dark-500 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="you@company.com"
                value={form.email}
                onChange={e => set('email', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1.5">
                API Token {config && <span className="text-gray-600">(השאר ריק לשמירת הקיים)</span>}
              </label>
              <div className="relative">
                <input
                  type={showToken ? 'text' : 'password'}
                  className="w-full bg-dark-700 border border-dark-500 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors pl-10"
                  placeholder={config ? '••••••••••••• (לא ישתנה)' : 'הדבק את ה-API Token כאן'}
                  value={form.api_token}
                  onChange={e => set('api_token', e.target.value)}
                />
                <button type="button" onClick={() => setShowToken(!showToken)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                  {showToken ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div className="flex gap-3">
              <button type="submit" disabled={saving}
                className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-medium transition-colors">
                {saving ? 'שומר...' : 'שמור'}
              </button>
              {config && (
                <>
                  <button type="button" onClick={handleTest} disabled={testing}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-dark-600 hover:bg-dark-500 disabled:opacity-50 text-gray-200 rounded-lg text-sm font-medium transition-colors">
                    {testing ? <Loader size={14} className="animate-spin" /> : <Wifi size={14} />}
                    בדוק חיבור
                  </button>
                  <button type="button" onClick={handleDelete}
                    className="p-2.5 text-red-400 hover:text-red-300 bg-dark-700 hover:bg-dark-600 rounded-lg transition-colors">
                    <Trash2 size={16} />
                  </button>
                </>
              )}
            </div>
          </form>

          {/* Test result */}
          {testResult && (
            <div className={`mt-4 p-3 rounded-lg border text-sm ${testResult.success ? 'bg-emerald-400/10 border-emerald-400/20' : 'bg-red-400/10 border-red-400/20'}`}>
              {testResult.success ? (
                <div className="flex items-center gap-2 text-emerald-300">
                  <CheckCircle size={15} />
                  <span>חיבור תקין! מחובר כ: <strong>{testResult.user}</strong></span>
                </div>
              ) : (
                <div>
                  <div className="flex items-start gap-2 text-red-300">
                    <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
                    <span>{testResult.error}</span>
                  </div>
                  {testResult.detail && <p className="text-red-400/70 text-xs mt-1 mr-5">{testResult.detail}</p>}
                  <div className="mt-2 text-xs text-red-300/70 space-y-0.5 mr-5">
                    <p>בדוק:</p>
                    <p>• URL: <code className="bg-dark-700 px-1 rounded">https://company.atlassian.net</code> (ללא / בסוף)</p>
                    <p>• האימייל הוא כתובת Atlassian שלך</p>
                    <p>• הטוקן נוצר מ-Atlassian account settings → API tokens</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Available Jira projects */}
          {jiraProjects.length > 0 && (
            <div className="mt-4">
              <p className="text-xs text-gray-400 mb-2">פרויקטים זמינים ב-Jira שלך:</p>
              <div className="bg-dark-700 rounded-lg border border-dark-500 divide-y divide-dark-600 max-h-48 overflow-y-auto">
                {jiraProjects.map(p => (
                  <div key={p.key} className="flex items-center justify-between px-3 py-2">
                    <span className="text-sm text-white">{p.name}</span>
                    <code className="text-xs text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded">{p.key}</code>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-600 mt-1">השתמש ב-Key כשיוצרים פרויקט חדש</p>
            </div>
          )}

          {/* Instructions */}
          <div className="mt-5 p-3 bg-dark-700 rounded-lg border border-dark-500">
            <p className="text-xs text-gray-400 font-medium mb-2">כיצד ליצור API Token:</p>
            <ol className="text-xs text-gray-500 space-y-1 list-decimal list-inside">
              <li>כנס ל: <span className="text-blue-400">id.atlassian.com/manage-profile/security/api-tokens</span></li>
              <li>לחץ <strong className="text-gray-300">"Create API token"</strong></li>
              <li>תן שם (לדוגמה: "Scrum Dashboard") → צור</li>
              <li>העתק את הטוקן מיד (לא יוצג שוב!)</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
