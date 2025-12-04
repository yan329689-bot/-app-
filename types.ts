export interface WordDefinition {
  word: string;
  phonetic: string;
  partOfSpeech: string;
  definitionEn: string;
  definitionCn: string;
  exampleSentence: string;
  exampleTranslation: string;
}

export enum AppTab {
  SEARCH = 'search',
  NOTEBOOK = 'notebook',
  PRACTICE = 'practice',
  FLASHCARDS = 'flashcards',
}

export interface SavedWord extends WordDefinition {
  id: string;
  addedAt: number;
  imageUrl?: string;
  videoUrl?: string;
}

export interface ImageLabel {
  label: string;
  phonetic: string;
  x: number; // Percentage 0-100
  y: number; // Percentage 0-100
}