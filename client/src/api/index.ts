import axios from 'axios';
import type { Project, Team, Task, JiraConfig, ProjectDetail } from '../types';

const api = axios.create({ baseURL: '/api' });

export const configApi = {
  get: () => api.get<JiraConfig | null>('/config').then(r => r.data),
  save: (data: { base_url: string; email: string; api_token: string }) =>
    api.post<JiraConfig>('/config', data).then(r => r.data),
  delete: () => api.delete('/config')
};

export const projectsApi = {
  list: () => api.get<Project[]>('/projects').then(r => r.data),
  get: (id: number) => api.get<Project>(`/projects/${id}`).then(r => r.data),
  create: (data: Partial<Project>) => api.post<Project>('/projects', data).then(r => r.data),
  update: (id: number, data: Partial<Project>) => api.put<Project>(`/projects/${id}`, data).then(r => r.data),
  delete: (id: number) => api.delete(`/projects/${id}`)
};

export const teamsApi = {
  byProject: (projectId: number) => api.get<Team[]>(`/teams/project/${projectId}`).then(r => r.data),
  create: (data: Partial<Team> & { members?: { name: string; email?: string; role?: string }[] }) =>
    api.post<Team>('/teams', data).then(r => r.data),
  update: (id: number, data: { name: string; velocity?: number }) =>
    api.put<Team>(`/teams/${id}`, data).then(r => r.data),
  delete: (id: number) => api.delete(`/teams/${id}`),
  addMember: (teamId: number, data: { name: string; email?: string; role?: string; jira_account_id?: string }) =>
    api.post(`/teams/${teamId}/members`, data).then(r => r.data),
  removeMember: (teamId: number, memberId: number) =>
    api.delete(`/teams/${teamId}/members/${memberId}`)
};

export const tasksApi = {
  byProject: (projectId: number) => api.get<Task[]>(`/tasks/project/${projectId}`).then(r => r.data),
  bySprint: (sprintId: number) => api.get<Task[]>(`/tasks/sprint/${sprintId}`).then(r => r.data),
  create: (data: Partial<Task>) => api.post<Task>('/tasks', data).then(r => r.data),
  update: (id: number, data: Partial<Task>) => api.put<Task>(`/tasks/${id}`, data).then(r => r.data),
  delete: (id: number) => api.delete(`/tasks/${id}`)
};

export const jiraApi = {
  syncProject: (projectId: number) =>
    api.post<{ success: boolean; itemsSynced: number }>(`/jira/sync/${projectId}`).then(r => r.data),
  syncAll: () => api.post('/jira/sync-all').then(r => r.data)
};

export const dashboardApi = {
  overview: () => api.get<Project[]>('/dashboard/overview').then(r => r.data),
  project: (id: number) => api.get<ProjectDetail>(`/dashboard/project/${id}`).then(r => r.data)
};
