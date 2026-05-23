import { useEffect, useState } from 'react';
import { dashboardApi } from '../api';
import type { ProjectDetail as PD, Task } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import { CheckCircle, Clock, AlertCircle, ListTodo, Users, Zap, RefreshCw, Flag, CalendarDays } from 'lucide-react';
import TaskList from './TaskList';

const STATUS_COLORS: Record<string, string> = {
  'Done': '#10b981', 'Closed': '#10b981', 'Resolved': '#10b981',
  'In Progress': '#3b82f6', 'In Review': '#8b5cf6',
  'To Do': '#6b7280', 'Blocked': '#ef4444', 'Testing': '#f59e0b'
};

function StatCard({ icon: Icon, label, value, sub, color = 'text-white' }: { icon: any; label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="bg-dark-700 rounded-xl p-4 border border-dark-600">
      <div className="flex items-center gap-2 text-gray-400 mb-2">
        <Icon size={15} />
        <span className="text-xs">{label}</span>
      </div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      {sub && <div className="text-xs text-gray-500 mt-1">{sub}</div>}
    </div>
  );
}

export default function ProjectDetail({ projectId }: { projectId: number }) {
  const [data, setData] = useState<PD | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'sprints' | 'tasks'>('overview');

  const load = async () => {
    try {
      const d = await dashboardApi.project(projectId);
      setData(d);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [projectId]);

  // SSE — instant refresh when webhook fires
  useEffect(() => {
    const es = new EventSource('/api/events');
    es.addEventListener('sync', () => load());
    return () => es.close();
  }, [projectId]);

  // Fallback polling every 2 min
  useEffect(() => {
    const id = setInterval(load, 2 * 60_000);
    return () => clearInterval(id);
  }, [projectId]);

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-500">
      <RefreshCw size={20} className="animate-spin ml-2" /> טוען נתונים...
    </div>
  );
  if (!data) return <div className="text-red-400 p-4">שגיאה בטעינת הנתונים</div>;

  const { project, teams, sprints, tasksByStatus, tasks, snapshots, recentLogs } = data;

  const isDone = (s: string) => ['done','closed','resolved','complete','completed','fixed'].includes(s.toLowerCase());
  const totalTasks = tasksByStatus.reduce((s, x) => s + x.count, 0);
  const doneTasks = tasksByStatus.filter(x => isDone(x.status)).reduce((s, x) => s + x.count, 0);
  const totalPoints = tasksByStatus.reduce((s, x) => s + (x.points || 0), 0);
  const donePoints = tasksByStatus.filter(x => isDone(x.status)).reduce((s, x) => s + (x.points || 0), 0);

  const totalSpent = tasks.reduce((s, t) => s + (t.time_spent || 0), 0);
  const totalRemaining = tasks.filter(t => !isDone(t.status)).reduce((s, t) => s + (t.time_remaining || 0), 0);

  const today = new Date();
  const end = new Date(project.end_date);
  let daysRemaining = 0;
  if (end > today) {
    const cur = new Date(today); cur.setHours(0, 0, 0, 0);
    const endDay = new Date(end); endDay.setHours(23, 59, 59, 0);
    while (cur <= endDay) { const d = cur.getDay(); if (d !== 5 && d !== 6) daysRemaining++; cur.setDate(cur.getDate() + 1); }
  }

  function fmtHours(sec: number) {
    if (!sec) return '—';
    const h = Math.round(sec / 3600);
    return h > 0 ? `${h}ש'` : `<1ש'`;
  }

  // Burndown data from snapshots
  const burndownData = snapshots.reduce((acc: Record<string, any>, s) => {
    const key = s.snapshot_date;
    if (!acc[key]) acc[key] = { date: key };
    acc[key][s.snapshot_time === 'morning' ? 'בוקר' : 'ערב'] = s.done_count;
    return acc;
  }, {});
  const burndownArr = Object.values(burndownData).slice(-14);

  const statusChartData = tasksByStatus.map(s => ({
    name: s.status,
    כמות: s.count,
    fill: STATUS_COLORS[s.status] || '#6b7280'
  }));

  const tabs = [
    { id: 'overview', label: 'סקירה כללית' },
    { id: 'sprints',  label: `ספרינטים (${sprints.length})` },
    { id: 'tasks',    label: `משימות (${totalTasks})` }
  ] as const;

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard icon={ListTodo} label="משימות הושלמו" value={`${doneTasks}/${totalTasks}`}
          sub={`${totalTasks > 0 ? Math.round(doneTasks/totalTasks*100) : 0}% הושלם`}
          color={doneTasks === totalTasks && totalTasks > 0 ? 'text-emerald-400' : 'text-white'} />
        <StatCard icon={Zap} label="נקודות הושלמו" value={`${Math.round(donePoints)}/${Math.round(totalPoints)}`}
          sub={`${totalPoints > 0 ? Math.round(donePoints/totalPoints*100) : 0}% נקודות`} />
        <StatCard icon={Clock} label="שעות בוצעו" value={fmtHours(totalSpent)}
          sub="מ-Jira time tracking"
          color="text-emerald-400" />
        <StatCard icon={Clock} label="שעות נותרות" value={fmtHours(totalRemaining)}
          sub="במשימות פתוחות"
          color={totalRemaining > 0 ? 'text-yellow-400' : 'text-white'} />
        <StatCard icon={Users} label="צוותים" value={teams.length} sub={`${teams.reduce((s,t) => s + (t.member_count||0), 0)} חברים`} />
        <StatCard icon={Clock} label="ימים נותרים" value={daysRemaining}
          sub={`מתוך ${Math.round((end.getTime() - new Date(project.start_date).getTime()) / 86400000)} ימים`}
          color={daysRemaining === 0 ? 'text-red-400' : daysRemaining < 7 ? 'text-orange-400' : 'text-white'} />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-dark-800 p-1 rounded-xl border border-dark-600 w-fit">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.id ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
        {/* Active sprint banner */}
        {(() => {
          const activeSprint = sprints.find(s => s.status === 'active');
          if (!activeSprint) return null;
          const sprintDaysLeft = activeSprint.end_date ? (() => {
            const end = new Date(activeSprint.end_date);
            const today = new Date(); today.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 0);
            let count = 0;
            const cur = new Date(today);
            while (cur <= end) {
              const d = cur.getDay();
              if (d !== 5 && d !== 6) count++; // exclude Fri=5, Sat=6
              cur.setDate(cur.getDate() + 1);
            }
            return count;
          })() : null;
          return (
            <div className="flex items-center gap-4 bg-blue-500/10 border border-blue-500/30 rounded-xl px-4 py-3">
              <CalendarDays size={18} className="text-blue-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-blue-300 font-medium text-sm">{activeSprint.name}</p>
                {activeSprint.start_date && activeSprint.end_date && (
                  <p className="text-blue-400/70 text-xs mt-0.5">
                    {new Date(activeSprint.start_date).toLocaleDateString('he-IL')} – {new Date(activeSprint.end_date).toLocaleDateString('he-IL')}
                  </p>
                )}
              </div>
              {sprintDaysLeft !== null && (
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0 ${sprintDaysLeft === 0 ? 'bg-red-500/20 text-red-400' : sprintDaysLeft <= 2 ? 'bg-red-500/20 text-red-400' : sprintDaysLeft <= 4 ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-300'}`}>
                  {sprintDaysLeft === 0 ? 'מסתיים היום' : `${sprintDaysLeft} ימי עבודה נותרו`}
                </span>
              )}
            </div>
          );
        })()}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Status breakdown chart */}
          <div className="bg-dark-800 rounded-xl p-5 border border-dark-600">
            <h3 className="text-sm font-medium text-gray-300 mb-4">פירוט לפי סטטוס</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={statusChartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#2d3654" />
                <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#9ca3af', fontSize: 11 }} width={90} />
                <Tooltip contentStyle={{ background: '#1e2537', border: '1px solid #2d3654', borderRadius: 8 }} />
                <Bar dataKey="כמות" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Burndown / Progress over time */}
          {burndownArr.length > 1 && (
            <div className="bg-dark-800 rounded-xl p-5 border border-dark-600">
              <h3 className="text-sm font-medium text-gray-300 mb-4">התקדמות יומית</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={burndownArr}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2d3654" />
                  <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 10 }} />
                  <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: '#1e2537', border: '1px solid #2d3654', borderRadius: 8 }} />
                  <Legend />
                  <Line type="monotone" dataKey="בוקר" stroke="#3b82f6" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="ערב"  stroke="#10b981" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Teams */}
          <div className="bg-dark-800 rounded-xl p-5 border border-dark-600">
            <h3 className="text-sm font-medium text-gray-300 mb-4">צוותים</h3>
            {teams.length === 0 ? (
              <p className="text-gray-500 text-sm">אין צוותים. הוסף צוות בלחיצה על "ניהול צוותים".</p>
            ) : (
              <div className="space-y-3">
                {teams.map(t => (
                  <div key={t.id} className="flex items-center justify-between bg-dark-700 rounded-lg px-3 py-2.5">
                    <div>
                      <p className="text-white text-sm font-medium">{t.name}</p>
                      <p className="text-gray-500 text-xs">{t.member_count ?? 0} חברים</p>
                    </div>
                    {t.velocity > 0 && (
                      <span className="text-xs text-blue-400 bg-blue-400/10 px-2 py-1 rounded">
                        {t.velocity} sp/sprint
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sync logs */}
          <div className="bg-dark-800 rounded-xl p-5 border border-dark-600">
            <h3 className="text-sm font-medium text-gray-300 mb-4">היסטוריית סנכרון</h3>
            {recentLogs.length === 0 ? (
              <p className="text-gray-500 text-sm">לא בוצע סנכרון עדיין.</p>
            ) : (
              <div className="space-y-2">
                {recentLogs.map(log => (
                  <div key={log.id} className={`flex items-start gap-2 text-xs p-2 rounded ${log.status === 'success' ? 'bg-emerald-400/5' : 'bg-red-400/5'}`}>
                    {log.status === 'success'
                      ? <CheckCircle size={13} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                      : <AlertCircle size={13} className="text-red-400 mt-0.5 flex-shrink-0" />}
                    <div>
                      <p className={log.status === 'success' ? 'text-emerald-300' : 'text-red-300'}>{log.message}</p>
                      <p className="text-gray-600">{new Date(log.synced_at).toLocaleString('he-IL')}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        </div>
      )}

      {/* Sprints Tab */}
      {activeTab === 'sprints' && (
        <div className="space-y-3">
          {sprints.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Clock size={36} className="mx-auto mb-3 opacity-30" />
              <p>אין ספרינטים. בצע סנכרון מ-Jira או הוסף ספרינטים ידנית.</p>
            </div>
          ) : sprints.map(sp => {
            const spDone = sp.done_count ?? 0;
            const spTotal = sp.task_count ?? 0;
            const spProg = spTotal > 0 ? Math.round(spDone / spTotal * 100) : 0;
            const isActive = sp.status === 'active';
            const isLate = sp.end_date && new Date(sp.end_date) < new Date() && sp.status !== 'closed';
            return (
              <div key={sp.id} className={`bg-dark-800 rounded-xl p-4 border ${isLate ? 'border-red-500/30' : isActive ? 'border-blue-500/30' : 'border-dark-600'}`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-white">{sp.name}</h4>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${isActive ? 'bg-blue-500/20 text-blue-400' : sp.status === 'future' ? 'bg-gray-500/20 text-gray-400' : 'bg-green-500/20 text-green-400'}`}>
                        {isActive ? 'פעיל' : sp.status === 'future' ? 'עתידי' : 'הסתיים'}
                      </span>
                      {isLate && <span className="text-xs text-red-400 flex items-center gap-1"><Flag size={10} /> מאחר</span>}
                    </div>
                    {sp.start_date && (
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(sp.start_date).toLocaleDateString('he-IL')} — {sp.end_date ? new Date(sp.end_date).toLocaleDateString('he-IL') : '?'}
                      </p>
                    )}
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-white">{spDone}/{spTotal} משימות</p>
                    {(sp.total_points ?? 0) > 0 && (
                      <p className="text-xs text-gray-500">{Math.round(sp.done_points ?? 0)}/{Math.round(sp.total_points ?? 0)} נקודות</p>
                    )}
                  </div>
                </div>
                <div className="h-1.5 w-full bg-dark-600 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${isLate ? 'bg-red-500' : isActive ? 'bg-blue-500' : 'bg-emerald-500'}`}
                    style={{ width: `${spProg}%` }} />
                </div>
                <p className="text-xs text-gray-500 mt-1">{spProg}% הושלם</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Tasks Tab */}
      {activeTab === 'tasks' && (
        <TaskList tasks={tasks} projectId={projectId} onUpdated={load} />
      )}
    </div>
  );
}
