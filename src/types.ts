export interface Task {
  id: string;
  task: string;
  details: string;
  imp: boolean;
  deadline: string;
  aiReasoning?: string;
  priorityOrder?: number;
  completed: boolean;
  createdAt: string;
}

export interface PlannerBlock {
  hourIndex: number;
  title: string;
  description: string;
}

export interface Goal {
  id: string;
  name: string;
  category: 'Study' | 'Work' | 'Health' | 'Personal';
  target: number;
  current: number;
  unit: string;
  completed: boolean;
  date: string;
}

export interface Quote {
  quote: string;
  author: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'coach';
  text: string;
  timestamp: string;
  suggestedTasks?: Array<{ name: string, details: string, imp: boolean }>;
  suggestedPlannerBlocks?: Array<{ hourSlotIndex: number, title: string }>;
}

export interface StreakData {
  current: number;
  best: number;
  lastDate: string;
}

export interface HistoryRecord {
  completed: number;
  total: number;
}

export interface VoiceNote {
  id: string;
  audioUrl: string;      // Base64 data URL
  duration: number;      // Seconds
  createdAt: string;     // ISO timestamp
  title: string;         // Descriptive title
}

