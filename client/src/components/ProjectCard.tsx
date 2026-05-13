import { useState } from 'react';
import { RefreshCw, Users, ListTodo, AlertTriangle, CheckCircle, Clock, Trash2, ChevronRight, Flag, Zap } from 'lucide-react';
import type { Project } from '../types';
import { projectsApi } from '../api';

interface Props {
  project: Project;
  onOpen: () => void;
  onSync: () => void;
  onManageTeams: () => void;
  syncing: boolean;
  onDeleted: () => void;
}

const healthConfig = {
  'on-track': { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/20', bar: 'bg-emerald-500' },
  'warning':  { icon: Clock,        color: 'text-yellow-400',  bg: 'bg-yellow-400/10  border-yellow-400/20',  bar: 'bg-yellow-500' },
  'at-risk':  { icon: AlertTriangle, color: 'text-orange-400', bg: 'bg-orange-400/10 border-orange-400/20',  bar: 'bg-orange-500' },
  'overdue':  { icon: AlertTriangle, color: 'text-red-400',    bg: 'bg-red-400/10    border-red-400/20',    bar: 'bg-red-500'    }
};

function ProgressBar({ value, colorClass }: { value: number; colorClass: string }) {
  return (
    <div className="h-1.5 w-full bg-dark-600 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-500 ${colorClass}`} style={{ width: `${Math.min(100, value)}%` }} />
    </div>
  );
}

export default function ProjectCard({ project, onOpen, onSync, onManageTeams, syncing, onDeleted }: Props) {
  const [deleting, setDeleting] = useState(false);
  const health = project.health || 'on-track';
  const cfg = healthConfig[health];
  const HealthIcon = cfg.icon;

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`האם למחוק את הפרויקט "${project.name}"? פעולה זו לא ניתנת לביטול.`)) return;
    setDeleting(true);
    try {
      await projectsApi.delete(project.id);
      onDeleted();
    } finally {
      setDeleting(false);
    }
  };

  const progressValue = project.total_points && project.total_points > 0
    ? (project.point_progress ?? 0)
    : (project.task_progress ?? 0);

  function workDaysUntil(dateStr: string) {
    const end = new Date(dateStr); end.setHours(23, 59, 59, 0);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (end < today) return 0;
    let count = 0;
    const cur = new Date(today);
    while (cur <= end) { const d = cur.getDay(); if (d !== 5 && d !== 6) count++; cur.setDate(cur.getDate() + 1); }
    return count;
  }

  const sprintDaysLeft = project.active_sprint_end ? workDaysUntil(project.active_sprint_end) : null;

  return (
    <div className={`bg-dark-800 border rounded-xl overflow-hidden hover:border-blue-500/50 transition-all duration-200 cursor-pointer group ${cfg.bg}`}>
      {/* Header */}
      <div className="p-4 pb-3" onClick={onOpen}>
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-white text-base truncate">{project.name}</h3>
            {project.jira_project_key && (
              <span className="text-xs text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded mt-1 inline-block">
                Jira: {project.jira_project_key}
              </span>
            )}
          </div>
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${cfg.color} ${cfg.bg} border`}>
            <HealthIcon size={12} />
            {project.health_label}
          </div>
        </div>

        {project.description && (
          <p className="text-gray-400 text-sm mb-3 line-clamp-2">{project.description}</p>
        )}

        {/* Active sprint */}
        {project.active_sprint_name && (
          <div className="flex items-center gap-2 text-xs bg-blue-500/10 border border-blue-500/20 rounded-lg px-2.5 py-1.5 mb-3">
            <Zap size={11} className="text-blue-400 flex-shrink-0" />
            <span className="text-blue-300 font-medium truncate">{project.active_sprint_name}</span>
            {project.active_sprint_start && project.active_sprint_end && (
              <span className="text-blue-400/70 flex-shrink-0" dir="ltr">
                {new Date(project.active_sprint_start).toLocaleDateString('he-IL')} – {new Date(project.active_sprint_end).toLocaleDateString('he-IL')}
              </span>
            )}
            {sprintDaysLeft !== null && (
              <span className={`mr-auto flex-shrink-0 font-medium ${sprintDaysLeft <= 2 ? 'text-red-400' : sprintDaysLeft <= 4 ? 'text-orange-400' : 'text-blue-300'}`}>
                {sprintDaysLeft}י׳
              </span>
            )}
          </div>
        )}

        {/* Progress bars */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>התקדמות</span>
            <span>{progressValue}%</span>
          </div>
          <ProgressBar value={progressValue} colorClass={cfg.bar} />
          <div className="flex justify-between text-xs text-gray-500">
            <span>זמן חלף: {project.time_progress}%</span>
            {sprintDaysLeft !== null ? (
              <span className={sprintDaysLeft <= 2 ? 'text-red-400' : sprintDaysLeft <= 4 ? 'text-orange-400' : ''}>
                {sprintDaysLeft > 0 ? `נותרו ${sprintDaysLeft} י״ע` : 'ספרינט מסתיים היום'}
              </span>
            ) : project.days_remaining !== undefined && (
              <span className={project.days_remaining === 0 ? 'text-red-400' : ''}>
                {project.days_remaining > 0 ? `נותרו ${project.days_remaining} י״ע` : 'עבר המועד'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="px-4 py-2 border-t border-dark-600/50 grid grid-cols-4 gap-2">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-gray-400">
            <Users size={13} />
            <span className="text-sm font-medium text-white">{project.total_teams ?? 0}</span>
          </div>
          <p className="text-xs text-gray-600">צוותים</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-gray-400">
            <ListTodo size={13} />
            <span className="text-sm font-medium text-white">{project.done_tasks ?? 0}/{project.total_tasks ?? 0}</span>
          </div>
          <p className="text-xs text-gray-600">משימות</p>
        </div>
        <div className="text-center">
          <span className="text-sm font-medium text-white">
            {project.total_points && project.total_points > 0
              ? `${Math.round(project.done_points ?? 0)}/${Math.round(project.total_points)}`
              : '—'}
          </span>
          <p className="text-xs text-gray-600">נקודות</p>
        </div>
        <div className="text-center">
          <div className="text-sm font-medium">
            {project.time_spent_total ? (
              <span className="text-emerald-400">{Math.round((project.time_spent_total as number) / 3600)}ש'</span>
            ) : <span className="text-gray-600">—</span>}
            {project.time_remaining_total ? (
              <span className="text-yellow-400 text-xs"> /{Math.round((project.time_remaining_total as number) / 3600)}ש'</span>
            ) : null}
          </div>
          <p className="text-xs text-gray-600">שעות</p>
        </div>
      </div>

      {/* Flags */}
      {project.flags && project.flags.length > 0 && (
        <div className="px-4 py-2 border-t border-dark-600/50">
          {project.flags.slice(0, 2).map((flag, i) => (
            <div key={i} className="flex items-start gap-1.5 text-xs text-orange-300 mb-1">
              <Flag size={11} className="mt-0.5 flex-shrink-0" />
              <span>{flag}</span>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="px-4 py-3 border-t border-dark-600/50 flex items-center gap-2">
        <button
          onClick={onOpen}
          className="flex-1 flex items-center justify-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors"
        >
          פרטים מלאים <ChevronRight size={13} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onManageTeams(); }}
          className="px-3 py-1.5 text-xs text-gray-400 hover:text-white bg-dark-600 hover:bg-dark-500 rounded-lg transition-colors"
        >
          <Users size={13} />
        </button>
        {project.jira_project_key && (
          <button
            onClick={(e) => { e.stopPropagation(); onSync(); }}
            disabled={syncing}
            className="px-3 py-1.5 text-xs text-blue-400 hover:text-blue-300 bg-dark-600 hover:bg-dark-500 rounded-lg transition-colors disabled:opacity-40"
            title="עדכן מ-Jira"
          >
            <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />
          </button>
        )}
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="px-3 py-1.5 text-xs text-red-400 hover:text-red-300 bg-dark-600 hover:bg-dark-500 rounded-lg transition-colors disabled:opacity-40"
          title="מחק פרויקט"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}
