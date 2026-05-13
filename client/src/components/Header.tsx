import { Settings, RefreshCw, LayoutDashboard } from 'lucide-react';

interface Props {
  onSettings: () => void;
  onSyncAll: () => void;
  syncing: boolean;
}

export default function Header({ onSettings, onSyncAll, syncing }: Props) {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString('he-IL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <header className="bg-dark-800 border-b border-dark-600 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <LayoutDashboard size={16} className="text-white" />
          </div>
          <div>
            <h1 className="text-white font-bold text-base leading-none">Scrum Dashboard</h1>
            <p className="text-gray-500 text-xs mt-0.5">ניהול פרויקטים אג'ילי</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-left hidden sm:block">
            <p className="text-gray-400 text-xs">{dateStr}</p>
            <p className="text-gray-300 text-sm font-mono">{timeStr}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onSyncAll}
              disabled={syncing}
              title="עדכן כל הפרויקטים"
              className="p-2 text-gray-400 hover:text-white hover:bg-dark-600 rounded-lg transition-colors disabled:opacity-40"
            >
              <RefreshCw size={18} className={syncing ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={onSettings}
              title="הגדרות"
              className="p-2 text-gray-400 hover:text-white hover:bg-dark-600 rounded-lg transition-colors"
            >
              <Settings size={18} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
