export interface User {
  id: number;
  name: string;
  totalScore: number;
}

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface DailyStatus {
  hasParticipated: boolean;
  score?: number;
  withinTimeWindow: boolean;
  nextStartTime: string;
}

export interface LeaderboardEntry {
  name: string;
  totalScore: number;
}
