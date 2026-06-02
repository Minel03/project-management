export interface TeamSummary {
  id: number;
  name: string;
  leader_id?: number;
  leader_name?: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  role?: "admin" | "leader" | "member";
  leaderOf?: TeamSummary[];
  memberOf?: TeamSummary[];
  created_at?: string;
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (emailOrUsername: string, password: string) => Promise<void>;
  register: (
    username: string,
    email: string,
    password: string,
  ) => Promise<void>;
  logout: () => void;
  triggerDbInit: (
    reset: boolean,
  ) => Promise<{ success: boolean; message: string; seeded?: unknown }>;
}
