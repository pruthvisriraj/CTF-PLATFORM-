export interface LearnerInject {
  id: string;
  order: number;
  title: string;
  body: string;
  evidence_url: string | null;
  type: "text" | "mcq";
  options: string[] | null;
  points: number;
  hint_penalty: number;
  hint: string | null;
  solved: boolean;
  is_current: boolean;
}

export interface Standing {
  teamId: string;
  name: string;
  score: number;
  currentInjectOrder: number;
  completedAt: string | null;
}

export interface Announcement {
  id: string;
  message: string;
  created_at: string;
}
