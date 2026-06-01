export type TaskStatus = 'Todo' | 'In Progress' | 'Done';

export interface Project {
  id: number;
  name: string;
  description: string;
  user_id?: number;
  creator_name: string;
  team_name?: string;
  team_id?: number;
  teamMembers?: Member[];
  created_at: string;
}

export interface Task {
  id: number;
  project_id: number;
  title: string;
  description: string;
  status: TaskStatus;
  assigned_to: number | null;
  assignee_name: string | null;
  started_by: number | null;
  started_by_name: string | null;
  due_date: string | null;
  assignees?: { id: number; username: string }[];
  comments?: TaskComment[];
  subtasks?: Subtask[];
  created_at: string;
  updated_at: string;
}

export interface TaskComment {
  id: number;
  task_id: number;
  user_id: number;
  username: string;
  comment: string;
  created_at: string;
}

export interface Subtask {
  id: number;
  task_id: number;
  title: string;
  assigned_to: number | null;
  assignee_name: string | null;
  is_done: boolean | number;
}

export interface Member {
  id: number;
  username: string;
  email: string;
  role?: 'admin' | 'leader' | 'member';
}

export interface ChangeLog {
  id: number;
  task_id: number;
  user_id: number;
  old_status: TaskStatus;
  new_status: TaskStatus;
  remark: string | null;
  created_at: string;
  task_title: string;
  project_name: string;
  operator_username: string;
}

export interface AssignableTeam {
  id: number;
  name: string;
}
