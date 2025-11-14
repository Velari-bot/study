export interface Question {
  id: number;
  question: string;
  correctAnswer: string;
  hint: string;
  explanation: string;
  multipleChoiceOptions: string[];
}

export interface QuestionStats {
  questionId: number;
  correctCount: number;
  incorrectCount: number;
  lastSeen: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface GameStats {
  currentStreak: number;
  bestStreak: number;
  totalCorrect: number;
  totalIncorrect: number;
}

export type GameMode = 
  | 'menu'
  | 'multipleChoice'
  | 'flashcards'
  | 'speedMode'
  | 'typeAnswer'
  | 'matching'
  | 'weakSpot'
  | 'jumpGame'
  | 'dinosaurGame'
  | 'flappyBird';

