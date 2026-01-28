
export enum AppMode {
  STUDY = 'পড়াশোনা',
  VIVA = 'ভাইভা',
  EXAM = 'পরীক্ষা প্রস্তুতি',
  NOTICE = 'নোটিশ'
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

export interface ArchitectureDetail {
  title: string;
  description: string;
  items: string[];
}
