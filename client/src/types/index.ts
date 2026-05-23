export interface JiraConfig {
  id: number;
  base_url: string;
  email: string;
  created_at: string;
}

export interface MondayConfig {
  id: number;
  created_at: string;
}

export interface Project {
  id: number;
  name: string;
  description: string;
  jira_project_key?: string;
  monday_board_id?: string;
  start_date: string;
  end_date: string;
  status: 'active' | 'completed' | 'on_hold';
  created_at: string;
  // Aggregated
  total_teams?: number;
  total_tasks?: number;
  done_tasks?: number;
  total_points?: number;
  done_points?: number;
  remaining_points?: number;
  time_spent_total?: number;
  time_remaining_total?: number;
  active_sprint_name?: string;
  active_sprint_start?: string;
  active_sprint_end?: string;
  // Analysis
  time_progress?: number;
  task_progress?: number;
  point_progress?: number;
  health?: 'on-track' | 'warning' | 'at-risk' | 'overdue';
  health_label?: string;
  flags?: string[];
  days_remaining?: number;
}

export interface Team {
  id: number;
  project_id: number;
  name: string;
  velocity: number;
  member_count?: number;
  members?: TeamMember[];
}

export interface TeamMember {
  id: number;
  team_id: number;
  name: string;
  email: string;
  jira_account_id: string;
  role: string;
}

export interface Sprint {
  id: number;
  team_id?: number;
  project_id: number;
  jira_sprint_id?: number;
  name: string;
  start_date?: string;
  end_date?: string;
  status: 'active' | 'future' | 'closed';
  goal?: string;
  task_count?: number;
  done_count?: number;
  total_points?: number;
  done_points?: number;
}

export interface Task {
  id: number;
  sprint_id?: number;
  project_id: number;
  team_id?: number;
  jira_key?: string;
  title: string;
  description: string;
  status: string;
  issue_type: string;
  assignee: string;
  story_points?: number;
  time_estimate: number;
  time_remaining: number;
  time_spent: number;
  priority: string;
  due_date?: string;
  time_estimation?: string;
  remaining_hours?: number;
  qa_owner?: string;
  created_at: string;
  updated_at: string;
}

export interface DailySnapshot {
  snapshot_date: string;
  snapshot_time: string;
  total_remaining: number;
  done_count: number;
  total_count: number;
}

export interface SyncLog {
  id: number;
  project_id?: number;
  sync_type: string;
  status: string;
  message: string;
  items_synced: number;
  synced_at: string;
}

export interface ProjectDetail {
  project: Project;
  teams: Team[];
  sprints: Sprint[];
  tasksByStatus: { status: string; count: number; points: number }[];
  tasks: Task[];
  snapshots: DailySnapshot[];
  recentLogs: SyncLog[];
}
