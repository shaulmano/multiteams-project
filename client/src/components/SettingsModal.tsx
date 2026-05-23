import { useState, useEffect } from 'react';
import { configApi, mondayApi } from '../api';
import axios from 'axios';
import type { JiraConfig, MondayConfig } from '../types';
import { X, Settings, CheckCircle, AlertCircle, Eye, EyeOff, Trash2, Wifi, Loader } from 'lucide-react';

interface Props {
  onClose: () => void;
}

export default function SettingsModal({ onClose }: Props) {
  const [tab, setTab] = useState<'jira' | 'monday'>('jira');

  // Jira state
  const [jiraConfig, setJiraConfig] = useState<JiraConfig | null>(null);
  const [jiraForm, setJiraForm] = useState({ base_url: '', email: '', api_token: '' });
  const [showToken, setShowToken] = useState(false);
  const [jiraSaving, setJiraSaving] = useState(false);
  const [jiraTesting, setJiraTesting] = useState(false);
  const [jiraMessage, setJiraMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [jiraTestResult, setJiraTestResult] = useState<{ success: boolean; user?: string; error?: string; detail?: string } | null>(null);
  const [jiraProjects, setJiraProjects] = useState<{ key: string; name: string }[]>([]);

  // Monday state
  const [mondayConfig, setMondayConfig] = useState<MondayConfig | null>(null);
  const [mondayToken, setMondayToken] = useState('');
  const [showMondayToken, setShowMondayToken] = useState(false);
  const [mondaySaving, setMondaySaving] = useState(false);
  const [mondayTesting, setMondayTesting] = useState(false);
  const [mondayMessage, setMondayMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [mondayTestResult, setMondayTestResult] = useState<{ success: boolean; user?: { name: string }; error?: string; boards?: { id: string; name: string }[] } | null>(null);

  useEffect(() => {
    configApi.get().then(cfg => {
      setJiraConfig(cfg);
      if (cfg) setJiraForm(f => ({ ...f, base_url: cfg.base_url, email: cfg.email }));
    });
    mondayApi.getConfig().then(cfg => setMondayConfig(cfg));
  }, []);

  // ── Jira handlers ──
  const handleJiraSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jiraForm.base_url || !jiraForm.email) { setJiraMessage({ type: 'error', text: 'URL ואימייל הם שדות חובה' }); return; }
    if (!jiraForm.api_token && !jiraConfig) { setJiraMessage({ type: 'error', text: 'API Token הוא שדה חובה בחיבור ראשון' }); return; }
    setJiraSaving(true);
    setJiraMessage(null);
    try {
      const payload: { base_url: string; email: string; api_token?: string } = {
        base_url: jiraForm.base_url.replace(/\/$/, ''),
        email: jiraForm.email,
      };
      if (jiraForm.api_token) payload.api_token = jiraForm.api_token;
      const saved = await configApi.save(payload as any);
      setJiraConfig(saved as any);
      setJiraMessage({ type: 'success', text: 'הגדרות נשמרו — לחץ "בדוק חיבור" לאימות' });
      setJiraForm(f => ({ ...f, api_token: '' }));
      setJiraTestResult(null);
    } catch (e: any) {
      setJiraMessage({ type: 'error', text: e.response?.data?.error || 'שגיאה בשמירה' });
    } finally {
      setJiraSaving(false);
    }
  };

  const handleJiraTest = async () => {
    setJiraTesting(true);
    setJiraTestResult(null);
    setJiraProjects([]);
    try {
      const resp = await axios.get('/api/jira/test');
      setJiraTestResult({ success: true, user: resp.data.user });
      try {
        const pResp = await axios.get('/api/jira/projects');
        setJiraProjects(pResp.data);
      } catch {}
    } catch (e: any) {
      setJiraTestResult({ success: false, error: e.response?.data?.error || e.message, detail: e.response?.data?.details });
    } finally {
      setJiraTesting(false);
    }
  };

  const handleJiraDelete = async () => {
    if (!confirm('למחוק את הגדרות ה-Jira?')) return;
    await configApi.delete();
    setJiraConfig(null);
    setJiraForm({ base_url: '', email: '', api_token: '' });
    setJiraTestResult(null);
    setJiraProjects([]);
    setJiraMessage({ type: 'success', text: 'הגדרות נמחקו' });
  };

  // ── Monday handlers ──
  const handleMondaySave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mondayToken.trim() && !mondayConfig) { setMondayMessage({ type: 'error', text: 'API Token הוא שדה חובה' }); return; }
    if (!mondayToken.trim()) { setMondayMessage({ type: 'error', text: 'הזן טוקן חדש לעדכון' }); return; }
    setMondaySaving(true);
    setMondayMessage(null);
    try {
      await mondayApi.saveConfig(mondayToken.trim());
      const cfg = await mondayApi.getConfig();
      setMondayConfig(cfg);
      setMondayToken('');
      setMondayTestResult(null);
      setMondayMessage({ type: 'success', text: 'הגדרות נשמרו — לחץ "בדוק חיבור" לאימות' });
    } catch (e: any) {
      setMondayMessage({ type: 'error', text: e.response?.data?.error || 'שגיאה בשמירה' });
    } finally {
      setMondaySaving(false);
    }
  };

  const handleMondayTest = async () => {
    setMondayTesting(true);
    setMondayTestResult(null);
    try {
      const result = await mondayApi.test();
      setMondayTestResult(result);
    } catch (e: any) {
      setMondayTestResult({ success: false, error: e.response?.data?.error || e.message });
    } finally {
      setMondayTesting(false);
    }
  };

  const handleMondayDelete = async () => {
    if (!confirm('למחוק את הגדרות Monday.com?')) return;
    await mondayApi.deleteConfig();
    setMondayConfig(null);
    setMondayToken('');
    setMondayTestResult(null);
    setMondayMessage({ type: 'success', text: 'הגדרות נמחקו' });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-dark-800 rounded-2xl border border-dark-600 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-dark-600 sticky top-0 bg-dark-800 z-10">
          <div className="flex items-center gap-3">
            <Settings size={20} className="text-blue-400" />
            <h2 className="text-white font-semibold">הגדרות</h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-500 hover:text-white hover:bg-dark-600 rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-dark-600 px-5">
          <button
            onClick={() => setTab('jira')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${tab === 'jira' ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
          >
            Jira
          </button>
          <button
            onClick={() => setTab('monday')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${tab === 'monday' ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
          >
            Monday.com
          </button>
        </div>

        <div className="p-5">
          {/* ── JIRA TAB ── */}
          {tab === 'jira' && (
            <>
              <div className={`flex items-center gap-2 p-3 rounded-lg mb-4 ${jiraConfig ? 'bg-emerald-400/10 border border-emerald-400/20' : 'bg-dark-700 border border-dark-500'}`}>
                {jiraConfig
                  ? <><CheckCircle size={16} className="text-emerald-400 flex-shrink-0" /><span className="text-sm text-emerald-300 truncate">{jiraConfig.base_url}</span></>
                  : <><AlertCircle size={16} className="text-gray-500" /><span className="text-sm text-gray-400">Jira לא מחובר</span></>
                }
              </div>

              <form onSubmit={handleJiraSave} className="space-y-4">
                {jiraMessage && (
                  <div className={`flex items-start gap-2 p-3 rounded-lg text-sm ${jiraMessage.type === 'success' ? 'bg-emerald-400/10 text-emerald-300 border border-emerald-400/20' : 'bg-red-400/10 text-red-300 border border-red-400/20'}`}>
                    {jiraMessage.type === 'success' ? <CheckCircle size={14} className="mt-0.5 flex-shrink-0" /> : <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />}
                    <span>{jiraMessage.text}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Jira Base URL</label>
                  <input type="url"
                    className="w-full bg-dark-700 border border-dark-500 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder="https://your-company.atlassian.net"
                    value={jiraForm.base_url}
                    onChange={e => setJiraForm(f => ({ ...f, base_url: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">אימייל</label>
                  <input type="email"
                    className="w-full bg-dark-700 border border-dark-500 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder="you@company.com"
                    value={jiraForm.email}
                    onChange={e => setJiraForm(f => ({ ...f, email: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">
                    API Token {jiraConfig && <span className="text-gray-600">(השאר ריק לשמירת הקיים)</span>}
                  </label>
                  <div className="relative">
                    <input
                      type={showToken ? 'text' : 'password'}
                      className="w-full bg-dark-700 border border-dark-500 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors pl-10"
                      placeholder={jiraConfig ? '••••••••• (לא ישתנה)' : 'הדבק את ה-API Token כאן'}
                      value={jiraForm.api_token}
                      onChange={e => setJiraForm(f => ({ ...f, api_token: e.target.value }))}
                    />
                    <button type="button" onClick={() => setShowToken(!showToken)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                      {showToken ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button type="submit" disabled={jiraSaving}
                    className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-medium transition-colors">
                    {jiraSaving ? 'שומר...' : 'שמור'}
                  </button>
                  {jiraConfig && (
                    <>
                      <button type="button" onClick={handleJiraTest} disabled={jiraTesting}
                        className="flex items-center gap-1.5 px-4 py-2.5 bg-dark-600 hover:bg-dark-500 disabled:opacity-50 text-gray-200 rounded-lg text-sm font-medium transition-colors">
                        {jiraTesting ? <Loader size={14} className="animate-spin" /> : <Wifi size={14} />}
                        בדוק חיבור
                      </button>
                      <button type="button" onClick={handleJiraDelete}
                        className="p-2.5 text-red-400 hover:text-red-300 bg-dark-700 hover:bg-dark-600 rounded-lg transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                </div>
              </form>

              {jiraTestResult && (
                <div className={`mt-4 p-3 rounded-lg border text-sm ${jiraTestResult.success ? 'bg-emerald-400/10 border-emerald-400/20' : 'bg-red-400/10 border-red-400/20'}`}>
                  {jiraTestResult.success ? (
                    <div className="flex items-center gap-2 text-emerald-300">
                      <CheckCircle size={15} />
                      <span>חיבור תקין! מחובר כ: <strong>{jiraTestResult.user}</strong></span>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-start gap-2 text-red-300">
                        <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
                        <span>{jiraTestResult.error}</span>
                      </div>
                      {jiraTestResult.detail && <p className="text-red-400/70 text-xs mt-1 mr-5">{jiraTestResult.detail}</p>}
                      <div className="mt-2 text-xs text-red-300/70 space-y-0.5 mr-5">
                        <p>• URL: <code className="bg-dark-700 px-1 rounded">https://company.atlassian.net</code></p>
                        <p>• האימייל הוא כתובת Atlassian שלך</p>
                        <p>• הטוקן מ: Atlassian account → Security → API tokens</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

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
                </div>
              )}

              <div className="mt-5 p-3 bg-dark-700 rounded-lg border border-dark-500">
                <p className="text-xs text-gray-400 font-medium mb-2">כיצד ליצור API Token:</p>
                <ol className="text-xs text-gray-500 space-y-1 list-decimal list-inside">
                  <li>כנס ל: <span className="text-blue-400">id.atlassian.com/manage-profile/security/api-tokens</span></li>
                  <li>לחץ <strong className="text-gray-300">"Create API token"</strong></li>
                  <li>תן שם → צור</li>
                  <li>העתק מיד (לא יוצג שוב)</li>
                </ol>
              </div>
            </>
          )}

          {/* ── MONDAY TAB ── */}
          {tab === 'monday' && (
            <>
              <div className={`flex items-center gap-2 p-3 rounded-lg mb-4 ${mondayConfig ? 'bg-emerald-400/10 border border-emerald-400/20' : 'bg-dark-700 border border-dark-500'}`}>
                {mondayConfig
                  ? <><CheckCircle size={16} className="text-emerald-400 flex-shrink-0" /><span className="text-sm text-emerald-300">Monday.com מחובר</span></>
                  : <><AlertCircle size={16} className="text-gray-500" /><span className="text-sm text-gray-400">Monday.com לא מחובר</span></>
                }
              </div>

              <form onSubmit={handleMondaySave} className="space-y-4">
                {mondayMessage && (
                  <div className={`flex items-start gap-2 p-3 rounded-lg text-sm ${mondayMessage.type === 'success' ? 'bg-emerald-400/10 text-emerald-300 border border-emerald-400/20' : 'bg-red-400/10 text-red-300 border border-red-400/20'}`}>
                    {mondayMessage.type === 'success' ? <CheckCircle size={14} className="mt-0.5 flex-shrink-0" /> : <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />}
                    <span>{mondayMessage.text}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">
                    API Token {mondayConfig && <span className="text-gray-600">(הזן טוקן חדש לעדכון)</span>}
                  </label>
                  <div className="relative">
                    <input
                      type={showMondayToken ? 'text' : 'password'}
                      className="w-full bg-dark-700 border border-dark-500 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors pl-10"
                      placeholder={mondayConfig ? '••••••••• (לא ישתנה)' : 'הדבק את ה-API Token של Monday כאן'}
                      value={mondayToken}
                      onChange={e => setMondayToken(e.target.value)}
                    />
                    <button type="button" onClick={() => setShowMondayToken(!showMondayToken)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                      {showMondayToken ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button type="submit" disabled={mondaySaving}
                    className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-medium transition-colors">
                    {mondaySaving ? 'שומר...' : 'שמור'}
                  </button>
                  {mondayConfig && (
                    <>
                      <button type="button" onClick={handleMondayTest} disabled={mondayTesting}
                        className="flex items-center gap-1.5 px-4 py-2.5 bg-dark-600 hover:bg-dark-500 disabled:opacity-50 text-gray-200 rounded-lg text-sm font-medium transition-colors">
                        {mondayTesting ? <Loader size={14} className="animate-spin" /> : <Wifi size={14} />}
                        בדוק חיבור
                      </button>
                      <button type="button" onClick={handleMondayDelete}
                        className="p-2.5 text-red-400 hover:text-red-300 bg-dark-700 hover:bg-dark-600 rounded-lg transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                </div>
              </form>

              {mondayTestResult && (
                <div className={`mt-4 p-3 rounded-lg border text-sm ${mondayTestResult.success ? 'bg-emerald-400/10 border-emerald-400/20' : 'bg-red-400/10 border-red-400/20'}`}>
                  {mondayTestResult.success ? (
                    <>
                      <div className="flex items-center gap-2 text-emerald-300 mb-2">
                        <CheckCircle size={15} />
                        <span>חיבור תקין! מחובר כ: <strong>{mondayTestResult.user?.name}</strong></span>
                      </div>
                      {mondayTestResult.boards && mondayTestResult.boards.length > 0 && (
                        <div>
                          <p className="text-xs text-gray-400 mb-1.5">לוחות זמינים:</p>
                          <div className="bg-dark-800 rounded-lg border border-dark-600 divide-y divide-dark-700 max-h-40 overflow-y-auto">
                            {mondayTestResult.boards.map(b => (
                              <div key={b.id} className="flex items-center justify-between px-3 py-1.5">
                                <span className="text-sm text-white">{b.name}</span>
                                <code className="text-xs text-purple-400 bg-purple-400/10 px-2 py-0.5 rounded">{b.id}</code>
                              </div>
                            ))}
                          </div>
                          <p className="text-xs text-gray-600 mt-1">השתמש ב-ID כשמקשרים פרויקט ל-Monday board</p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex items-start gap-2 text-red-300">
                      <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
                      <span>{mondayTestResult.error}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-5 p-3 bg-dark-700 rounded-lg border border-dark-500">
                <p className="text-xs text-gray-400 font-medium mb-2">כיצד ליצור API Token ב-Monday:</p>
                <ol className="text-xs text-gray-500 space-y-1 list-decimal list-inside">
                  <li>כנס ל-Monday.com → לחץ על התמונה שלך (למעלה שמאל)</li>
                  <li>בחר <strong className="text-gray-300">Administration → Connections → API</strong></li>
                  <li>לחץ <strong className="text-gray-300">"Copy"</strong> ליד Personal API Token v2</li>
                  <li>הדבק כאן</li>
                </ol>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
