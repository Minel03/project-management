export interface UserSummary {
  id: number;
  username: string;
  email: string;
  role: "admin" | "leader" | "member";
  created_at?: string;
}

export interface TeamSummary {
  id: number;
  name: string;
  leader_id: number;
  leader_name: string;
}

export interface TeamDetails extends TeamSummary {
  members: UserSummary[];
}
