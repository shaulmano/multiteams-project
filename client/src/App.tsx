import { useState, useEffect, useCallback } from 'react';
import { dashboardApi, jiraApi, mondayApi } from './api';
import type { Project } from './types';
import Header from './components/Header';
import ProjectCard from './components/ProjectCard';
import ProjectDetail from './components/ProjectDetail';
import AddProjectModal from './components/AddProjectModal';
import EditProjectModal from './components/EditProjectModal';
import SettingsModal from './components/SettingsModal';
import TeamManager from './components/TeamManager';
import { RefreshCw, Plus, FolderOpen, Pencil } from 'lucide-react';

export default function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [view, setView] = useState<'dashboard' | 'detail' | 'teams'>('dashboard');
  const [showAddProject, setShowAddProject] = useState(false);
  const [showEditProject, setShowEditProject] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [loading, setLoading] = useState(true);

  const loadProjects = useCallback(async () => {
    try {
      const data = await dashboardApi.overview();
      setProjects(data);
    } catch (e) {
      console.error('Failed to load projects:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadProjects(); }, [loadProjects]);

  // SSE — instant refresh when server detects a Jira/Monday change via webhook
  useEffect(() => {
    const es = new EventSource('/api/events');
    es.addEventListener('sync', () => loadProjects());
    return () => es.close();
  }, [loadProjects]);

  // Fallback polling every 2 min (when no webhook is configured)
  useEffect(() => {
    const id = setInterval(() => { if (!syncing) loadProjects(); }, 2 * 60_000);
    return () => clearInterval(id);
  }, [loadProjects, syncing]);

  const handleSyncAll = async () => {
    setSyncing(true);
    setSyncMessage('');
    try {
      await jiraApi.syncAll();
      setSyncMessage('✓ כל הפרויקטים עודכנו בהצלחה');
      await loadProjects();
    } catch (e: any) {
      setSyncMessage(`✗ ${e.response?.data?.error || e.message}`);
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMessage(''), 5000);
    }
  };

  const handleSyncProject = async (projectId: number) => {
    setSyncing(true);
    setSyncMessage('');
    try {
      const res = await jiraApi.syncProject(projectId);
      setSyncMessage(`✓ עודכנו ${res.itemsSynced} משימות`);
      await loadProjects();
    } catch (e: any) {
      setSyncMessage(`✗ ${e.response?.data?.error || e.message}`);
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMessage(''), 5000);
    }
  };

  const handleSyncMonday = async (projectId: number) => {
    setSyncing(true);
    setSyncMessage('');
    try {
      const res = await mondayApi.syncProject(projectId);
      setSyncMessage(`✓ עודכנו ${res.itemsSynced} פריטים ממנדיי`);
      await loadProjects();
    } catch (e: any) {
      setSyncMessage(`✗ ${e.response?.data?.error || e.message}`);
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMessage(''), 5000);
    }
  };

  const openDetail = (project: Project) => {
    setSelectedProject(project);
    setView('detail');
  };

  const openTeams = (project: Project) => {
    setSelectedProject(project);
    setView('teams');
  };

  return (
    <div className="min-h-screen bg-dark-900 text-gray-100">
      <Header
        onSettings={() => setShowSettings(true)}
        onSyncAll={handleSyncAll}
        syncing={syncing}
      />

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            {view !== 'dashboard' && (
              <button
                onClick={() => setView('dashboard')}
                className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                ← חזרה לדשבורד
              </button>
            )}
            {view === 'dashboard' && (
              <h2 className="text-xl font-semibold text-white">
                {projects.length === 0 ? 'אין פרויקטים' : `${projects.length} פרויקטים פעילים`}
              </h2>
            )}
            {view === 'detail' && selectedProject && (
              <h2 className="text-xl font-semibold text-white">{selectedProject.name}</h2>
            )}
            {view === 'teams' && selectedProject && (
              <h2 className="text-xl font-semibold text-white">
                ניהול צוותים — {selectedProject.name}
              </h2>
            )}
          </div>

          <div className="flex items-center gap-3">
            {syncMessage && (
              <span className={`text-sm px-3 py-1 rounded-full ${syncMessage.startsWith('✓') ? 'text-emerald-400 bg-emerald-400/10' : 'text-red-400 bg-red-400/10'}`}>
                {syncMessage}
              </span>
            )}
            {view === 'dashboard' && (
              <>
                <button
                  onClick={handleSyncAll}
                  disabled={syncing}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  <RefreshCw size={15} className={syncing ? 'animate-spin' : ''} />
                  עדכן סטטוס כל הפרויקטים
                </button>
                <button
                  onClick={() => setShowAddProject(true)}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  <Plus size={15} />
                  פרויקט חדש
                </button>
              </>
            )}
            {view === 'detail' && selectedProject && (
              <>
                <button
                  onClick={() => setShowEditProject(true)}
                  className="flex items-center gap-2 bg-dark-600 hover:bg-dark-500 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  <Pencil size={15} />
                  ערוך פרויקט
                </button>
                <button
                  onClick={() => openTeams(selectedProject)}
                  className="flex items-center gap-2 bg-dark-600 hover:bg-dark-500 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  <FolderOpen size={15} />
                  ניהול צוותים
                </button>
                {selectedProject.jira_project_key && (
                  <button
                    onClick={() => handleSyncProject(selectedProject.id)}
                    disabled={syncing}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    <RefreshCw size={15} className={syncing ? 'animate-spin' : ''} />
                    עדכן מ-Jira
                  </button>
                )}
                {selectedProject.monday_board_id && (
                  <button
                    onClick={() => handleSyncMonday(selectedProject.id)}
                    disabled={syncing}
                    className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    <RefreshCw size={15} className={syncing ? 'animate-spin' : ''} />
                    עדכן מ-Monday
                  </button>
                )}
                {!selectedProject.jira_project_key && !selectedProject.monday_board_id && (
                  <button
                    onClick={() => handleSyncProject(selectedProject.id)}
                    disabled={syncing}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    <RefreshCw size={15} className={syncing ? 'animate-spin' : ''} />
                    עדכן מ-Jira
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Dashboard View */}
        {view === 'dashboard' && (
          <>
            {loading ? (
              <div className="flex items-center justify-center h-64 text-gray-500">
                <RefreshCw size={24} className="animate-spin ml-3" />
                טוען פרויקטים...
              </div>
            ) : projects.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <FolderOpen size={48} className="mb-4 opacity-30" />
                <p className="text-lg mb-2">אין פרויקטים עדיין</p>
                <p className="text-sm mb-4">צור פרויקט ראשון כדי להתחיל</p>
                <button
                  onClick={() => setShowAddProject(true)}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  <Plus size={15} /> יצירת פרויקט ראשון
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {projects.map(p => (
                  <ProjectCard
                    key={p.id}
                    project={p}
                    onOpen={() => openDetail(p)}
                    onSync={() => handleSyncProject(p.id)}
                    onManageTeams={() => openTeams(p)}
                    syncing={syncing}
                    onDeleted={loadProjects}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* Detail View */}
        {view === 'detail' && selectedProject && (
          <ProjectDetail projectId={selectedProject.id} />
        )}

        {/* Teams View */}
        {view === 'teams' && selectedProject && (
          <TeamManager project={selectedProject} onBack={() => setView('detail')} />
        )}
      </main>

      {showAddProject && (
        <AddProjectModal
          onClose={() => setShowAddProject(false)}
          onCreated={(p) => { loadProjects(); setShowAddProject(false); openDetail(p); }}
        />
      )}

      {showEditProject && selectedProject && (
        <EditProjectModal
          project={selectedProject}
          onClose={() => setShowEditProject(false)}
          onSaved={(updated) => {
            setSelectedProject(updated);
            setShowEditProject(false);
            loadProjects();
          }}
        />
      )}

      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
}
