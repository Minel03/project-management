export interface ChangeLog {
  id: number;
  task_id: number;
  user_id: number;
  old_status: "Todo" | "In Progress" | "Done";
  new_status: "Todo" | "In Progress" | "Done";
  remark: string | null;
  created_at: string;
  task_title: string;
  project_name: string;
  operator_username: string;
  isAudit?: boolean;
}

export interface Project {
  id: number;
  name: string;
}
