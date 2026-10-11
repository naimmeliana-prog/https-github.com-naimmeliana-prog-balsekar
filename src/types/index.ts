export type ThemeMode = 'paper' | 'sepia' | 'night';

export interface Teaching {
  id: string;
  title: string;
  subtitle: string;
  summary: string;
  content: string[];
  keyInsight: string;
  practicalExample: string;
  category: 'no-hacedor' | 'voluntad-total' | 'paz-mental' | 'naturaleza-mente' | 'sufrimiento';
  quote: string;
}

export interface QuoteItem {
  id: string;
  text: string;
  source: string;
  category: 'no-hacedor' | 'ego-mente' | 'paz-cotidiana' | 'totalidad' | 'busqueda';
  contextNote?: string;
}

export interface BookItem {
  id: string;
  title: string;
  originalTitle: string;
  year: number;
  description: string;
  centralThesis: string;
  keyThemes: string[];
  excerpt: string;
  significance: string;
}

export interface InquiryScenario {
  id: string;
  title: string;
  dilemma: string;
  egoPerspective: string;
  balsekarPointer: string;
  mechanismExplanation: string;
  actionGuidance: string;
}

export interface SatsangDialogue {
  id: string;
  seekerQuestion: string;
  seekerBackground: string;
  rameshAnswer: string;
  corePrinciple: string;
}

export interface MediaItem {
  id: string;
  title: string;
  type: 'video' | 'audio';
  duration: string;
  description: string;
  youtubeId?: string;
  audioUrl?: string;
  topic: string;
  recordedIn: string;
  transcriptExcerpt: string;
}

export interface GlossaryTerm {
  term: string;
  sanskrit: string;
  meaning: string;
  rameshInterpretation: string;
}
