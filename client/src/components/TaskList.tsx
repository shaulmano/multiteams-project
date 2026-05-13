import { useState } from 'react';
import type { Task } from '../types';
import { tasksApi } from '../api';
import { Plus, Trash2, ExternalLink, Clock, ChevronDown, ChevronUp } from 'lucide-react';

const STATUS_OPTIONS = ['To Do', 'In Progress', 'In Review', 'Testing', 'Done', 'Blocked'];
const PRIORITY_OPTIONS = ['Critical', 'High', 'Medium', 'Low'];
const PRIORITY_COLORS: Record<string, string> = {
  Critical: 'text-red-400 bg-red-400/10',
  High: 'text-orange-400 bg-orange-400/10',
  Medium: 'text-yellow-400 bg-yellow-400/10',
  Low: 'text-gray-400 bg-gray-400/10'
};
const STATUS_COLORS: Record<string, string> = {
  'Done': 'text-emerald-400 bg-emerald-400/10',
  'Closed': 'text-emerald-400 bg-emerald-400/10',
  'In Progress': 'text-blue-400 bg-blue-400/10',
  'In Review': 'text-purple-400 bg-purple-400/10',
  'Blocked': 'text-red-400 bg-red-400/10',
  'To Do': 'text-gray-400 bg-gray-400/10',
  'Testing': 'text-yellow-400 bg-yellow-400/10'
};

function formatSeconds(sec: number) {
  if (!sec) return '—';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `${h}ש ${m}ד` : `${m}ד`;
}

interface Props {
  tasks: Task[];
  projectId: number;
  onUpdated: () => void;
}

export default function TaskList({ tasks, projectId, onUpdated }: Props) {
  const [showAdd, setShowAdd] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', status: 'To Do', priority: 'Medium', story_points: '', assignee: '' });
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('all');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const filteredTasks = filter === 'all' ? tasks
    : filter === 'open' ? tasks.filter(t => !['Done', 'Closed', 'Resolved'].includes(t.status))
    : filter === 'blocked' ? tasks.filter(t => t.status === 'Blocked')
    : tasks.filter(t => ['Done', 'Closed', 'Resolved'].includes(t.status));

  const handleAdd = async () => {
    if (!newTask.title.trim()) return;
    setSaving(true);
    try {
      await tasksApi.create({
        project_id: projectId,
        title: newTask.title,
        status: newTask.status,
        priority: newTask.priority,
        story_points: newTask.story_points ? parseFloat(newTask.story_points) : undefined,
        assignee: newTask.assignee
      });
      setNewTask({ title: '', status: 'To Do', priority: 'Medium', story_points: '', assignee: '' });
      setShowAdd(false);
      onUpdated();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('למחוק משימה זו?')) return;
    await tasksApi.delete(id);
    onUpdated();
  };

  const handleStatusChange = async (task: Task, status: string) => {
    await tasksApi.update(task.id, { ...task, status });
    onUpdated();
  };

  return (
    <div>
      {/* Filters */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          {[['all', 'הכל'], ['open', 'פתוחות'], ['blocked', 'חסומות'], ['done', 'הושלמו']].map(([val, label]) => (
            <button key={val} onClick={() => setFilter(val)}
              className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${filter === val ? 'bg-blue-600 text-white' : 'bg-dark-700 text-gray-400 hover:text-white'}`}>
              {label}
            </button>
          ))}
        </div>
        <button onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 rounded-lg transition-colors">
          <Plus size={13} /> משימה חדשה
        </button>
      </div>

      {/* Add task form */}
      {showAdd && (
        <div className="bg-dark-700 rounded-xl p-4 mb-4 border border-dark-500 space-y-3">
          <input
            className="w-full bg-dark-800 border border-dark-500 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            placeholder="כותרת המשימה..."
            value={newTask.title}
            onChange={e => setNewTask(p => ({ ...p, title: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <select className="bg-dark-800 border border-dark-500 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none"
              value={newTask.status} onChange={e => setNewTask(p => ({ ...p, status: e.target.value }))}>
              {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
            </select>
            <select className="bg-dark-800 border border-dark-500 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none"
              value={newTask.priority} onChange={e => setNewTask(p => ({ ...p, priority: e.target.value }))}>
              {PRIORITY_OPTIONS.map(p => <option key={p}>{p}</option>)}
            </select>
            <input
              className="bg-dark-800 border border-dark-500 rounded-lg px-2 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none"
              placeholder="נקודות"
              type="number" min="0" step="0.5"
              value={newTask.story_points}
              onChange={e => setNewTask(p => ({ ...p, story_points: e.target.value }))}
            />
            <input
              className="bg-dark-800 border border-dark-500 rounded-lg px-2 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none"
              placeholder="אחראי"
              value={newTask.assignee}
              onChange={e => setNewTask(p => ({ ...p, assignee: e.target.value }))}
            />
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd} disabled={saving || !newTask.title}
              className="px-4 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 rounded-lg text-white transition-colors">
              {saving ? 'שומר...' : 'הוסף'}
            </button>
            <button onClick={() => setShowAdd(false)} className="px-4 py-1.5 text-xs bg-dark-600 hover:bg-dark-500 rounded-lg text-gray-300 transition-colors">
              ביטול
            </button>
          </div>
        </div>
      )}

      {/* Task list */}
      <div className="space-y-2">
        {filteredTasks.length === 0 && (
          <div className="text-center py-10 text-gray-500 text-sm">אין משימות בקטגוריה זו</div>
        )}
        {filteredTasks.map(task => {
          const isExpanded = expandedId === task.id;
          const isDoneStatus = ['done','closed','resolved','complete','completed','fixed'].includes(task.status.toLowerCase());
          const isDelayed = task.due_date && new Date(task.due_date) < new Date() && !isDoneStatus;
          return (
            <div key={task.id} className={`bg-dark-800 rounded-xl border transition-colors ${isDelayed ? 'border-red-500/40' : 'border-dark-600 hover:border-dark-500'}`}>
              <div className="flex items-center gap-3 p-3 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : task.id)}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-white truncate">{task.title}</span>
                    {task.jira_key && (
                      <a href="#" onClick={e => e.stopPropagation()} className="text-xs text-blue-400 flex items-center gap-0.5">
                        {task.jira_key} <ExternalLink size={10} />
                      </a>
                    )}
                    {isDelayed && <span className="text-xs text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded">⚠ מאחר</span>}
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {task.assignee && <span className="text-xs text-gray-500">{task.assignee}</span>}
                    {task.story_points != null && (
                      <span className="text-xs text-gray-500 bg-dark-600 px-1.5 py-0.5 rounded">{task.story_points} sp</span>
                    )}
                    {(task.time_spent > 0 || task.time_remaining > 0) && (
                      <span className="flex items-center gap-1 text-xs">
                        {task.time_spent > 0 && (
                          <span className="text-emerald-500/80">בוצע: {formatSeconds(task.time_spent)}</span>
                        )}
                        {task.time_spent > 0 && task.time_remaining > 0 && (
                          <span className="text-gray-600">|</span>
                        )}
                        {task.time_remaining > 0 && (
                          <span className={`flex items-center gap-0.5 ${isDelayed ? 'text-red-400' : 'text-yellow-500/80'}`}>
                            <Clock size={10} />נותר: {formatSeconds(task.time_remaining)}
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${PRIORITY_COLORS[task.priority] || 'text-gray-400 bg-gray-400/10'}`}>
                    {task.priority}
                  </span>
                  <select
                    className={`text-xs px-2 py-0.5 rounded-full border-0 focus:outline-none cursor-pointer ${STATUS_COLORS[task.status] || 'text-gray-400 bg-gray-400/10'}`}
                    value={task.status}
                    onClick={e => e.stopPropagation()}
                    onChange={e => handleStatusChange(task, e.target.value)}
                  >
                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <button onClick={e => { e.stopPropagation(); handleDelete(task.id); }}
                    className="p-1 text-gray-600 hover:text-red-400 transition-colors">
                    <Trash2 size={13} />
                  </button>
                  {isExpanded ? <ChevronUp size={14} className="text-gray-500" /> : <ChevronDown size={14} className="text-gray-500" />}
                </div>
              </div>
              {isExpanded && (
                <div className="px-4 pb-3 pt-0 border-t border-dark-600 text-xs text-gray-400 space-y-1">
                  {task.description && <p>{task.description}</p>}
                  <div className="flex gap-4 flex-wrap">
                    <span>הוערך: {formatSeconds(task.time_estimate)}</span>
                    <span>בוצע: {formatSeconds(task.time_spent)}</span>
                    <span>נותר: {formatSeconds(task.time_remaining)}</span>
                    {task.time_estimation && <span>הערכת זמן: {task.time_estimation}</span>}
                    {task.remaining_hours != null && <span>שעות נותרות: {task.remaining_hours}ש'</span>}
                    {task.qa_owner && <span>QA: {task.qa_owner}</span>}
                  </div>
                  {task.due_date && <p>תאריך יעד: {new Date(task.due_date).toLocaleDateString('he-IL')}</p>}
                  <p className="text-gray-600">עדכון אחרון: {new Date(task.updated_at).toLocaleString('he-IL')}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
