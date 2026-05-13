import { useState, useEffect } from 'react';
import { teamsApi } from '../api';
import type { Project, Team } from '../types';
import { Plus, Trash2, UserPlus, Users, ChevronDown, ChevronUp } from 'lucide-react';

const ROLES = ['Product Owner', 'Scrum Master', 'Developer', 'QA', 'Designer', 'Tech Lead', 'DevOps'];

interface Props {
  project: Project;
  onBack: () => void;
}

export default function TeamManager({ project, onBack }: Props) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTeam, setExpandedTeam] = useState<number | null>(null);
  const [showAddTeam, setShowAddTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [addingTeam, setAddingTeam] = useState(false);
  const [showAddMember, setShowAddMember] = useState<number | null>(null);
  const [newMember, setNewMember] = useState({ name: '', email: '', role: 'Developer', jira_account_id: '' });

  const load = async () => {
    try {
      const data = await teamsApi.byProject(project.id);
      setTeams(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [project.id]);

  const handleAddTeam = async () => {
    if (!newTeamName.trim()) return;
    setAddingTeam(true);
    try {
      await teamsApi.create({ project_id: project.id, name: newTeamName });
      setNewTeamName('');
      setShowAddTeam(false);
      load();
    } finally {
      setAddingTeam(false);
    }
  };

  const handleDeleteTeam = async (id: number) => {
    if (!confirm('למחוק את הצוות וכל חבריו?')) return;
    await teamsApi.delete(id);
    load();
  };

  const handleAddMember = async (teamId: number) => {
    if (!newMember.name.trim()) return;
    await teamsApi.addMember(teamId, newMember);
    setNewMember({ name: '', email: '', role: 'Developer', jira_account_id: '' });
    setShowAddMember(null);
    load();
  };

  const handleRemoveMember = async (teamId: number, memberId: number) => {
    if (!confirm('להסיר חבר זה מהצוות?')) return;
    await teamsApi.removeMember(teamId, memberId);
    load();
  };

  if (loading) return <div className="text-gray-500 p-4">טוען צוותים...</div>;

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3 text-gray-400">
          <Users size={18} />
          <span className="text-sm">{teams.length} צוותים — {teams.reduce((s, t) => s + (t.members?.length ?? 0), 0)} חברים</span>
        </div>
        <button
          onClick={() => setShowAddTeam(!showAddTeam)}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={14} /> הוסף צוות
        </button>
      </div>

      {/* Add team form */}
      {showAddTeam && (
        <div className="bg-dark-700 rounded-xl p-4 mb-4 border border-dark-500 flex gap-3">
          <input
            className="flex-1 bg-dark-800 border border-dark-500 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
            placeholder="שם הצוות (לדוגמה: Team Alpha)"
            value={newTeamName}
            onChange={e => setNewTeamName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddTeam()}
          />
          <button onClick={handleAddTeam} disabled={addingTeam || !newTeamName.trim()}
            className="px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 rounded-lg text-white transition-colors">
            {addingTeam ? 'יוצר...' : 'צור'}
          </button>
          <button onClick={() => setShowAddTeam(false)}
            className="px-4 py-2 text-sm bg-dark-600 hover:bg-dark-500 rounded-lg text-gray-300 transition-colors">
            ביטול
          </button>
        </div>
      )}

      {teams.length === 0 && !showAddTeam && (
        <div className="text-center py-12 text-gray-500">
          <Users size={40} className="mx-auto mb-3 opacity-30" />
          <p>אין צוותים בפרויקט זה.</p>
          <p className="text-sm mt-1">לחץ "הוסף צוות" כדי להתחיל.</p>
        </div>
      )}

      <div className="space-y-3">
        {teams.map(team => (
          <div key={team.id} className="bg-dark-800 rounded-xl border border-dark-600 overflow-hidden">
            {/* Team header */}
            <div
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-dark-700/50 transition-colors"
              onClick={() => setExpandedTeam(expandedTeam === team.id ? null : team.id)}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-blue-600/20 rounded-lg flex items-center justify-center">
                  <Users size={16} className="text-blue-400" />
                </div>
                <div>
                  <h3 className="font-medium text-white">{team.name}</h3>
                  <p className="text-xs text-gray-500">{team.members?.length ?? 0} חברים</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={e => { e.stopPropagation(); handleDeleteTeam(team.id); }}
                  className="p-1.5 text-gray-600 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                >
                  <Trash2 size={14} />
                </button>
                {expandedTeam === team.id ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
              </div>
            </div>

            {/* Members */}
            {expandedTeam === team.id && (
              <div className="border-t border-dark-600 p-4 space-y-3">
                {(team.members ?? []).length === 0 && (
                  <p className="text-gray-500 text-sm text-center py-2">אין חברים. הוסף חבר צוות.</p>
                )}
                {(team.members ?? []).map(member => (
                  <div key={member.id} className="flex items-center justify-between bg-dark-700 rounded-lg px-3 py-2.5">
                    <div>
                      <p className="text-white text-sm">{member.name}</p>
                      <div className="flex gap-3 text-xs text-gray-500 mt-0.5">
                        <span className="text-blue-400">{member.role}</span>
                        {member.email && <span>{member.email}</span>}
                        {member.jira_account_id && <span className="text-gray-600">Jira: {member.jira_account_id}</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveMember(team.id, member.id)}
                      className="p-1.5 text-gray-600 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}

                {/* Add member */}
                {showAddMember === team.id ? (
                  <div className="bg-dark-700 rounded-lg p-3 space-y-2 border border-dark-500">
                    <input
                      className="w-full bg-dark-800 border border-dark-500 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none"
                      placeholder="שם מלא *"
                      value={newMember.name}
                      onChange={e => setNewMember(p => ({ ...p, name: e.target.value }))}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        className="bg-dark-800 border border-dark-500 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none"
                        placeholder="אימייל"
                        value={newMember.email}
                        onChange={e => setNewMember(p => ({ ...p, email: e.target.value }))}
                      />
                      <select
                        className="bg-dark-800 border border-dark-500 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none"
                        value={newMember.role}
                        onChange={e => setNewMember(p => ({ ...p, role: e.target.value }))}
                      >
                        {ROLES.map(r => <option key={r}>{r}</option>)}
                      </select>
                    </div>
                    <input
                      className="w-full bg-dark-800 border border-dark-500 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none"
                      placeholder="Jira Account ID (אופציונלי)"
                      value={newMember.jira_account_id}
                      onChange={e => setNewMember(p => ({ ...p, jira_account_id: e.target.value }))}
                    />
                    <div className="flex gap-2">
                      <button onClick={() => handleAddMember(team.id)}
                        className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-500 rounded-lg text-white transition-colors">
                        הוסף
                      </button>
                      <button onClick={() => setShowAddMember(null)}
                        className="px-3 py-1.5 text-xs bg-dark-600 hover:bg-dark-500 rounded-lg text-gray-300 transition-colors">
                        ביטול
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowAddMember(team.id)}
                    className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    <UserPlus size={13} /> הוסף חבר צוות
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
