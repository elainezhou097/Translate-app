export interface Language {
  code: string;
  name: string;
  flag: string;
  voiceName: string; // Internal mapping for TTS
}

export interface ExampleSentence {
  target: string;
  native: string;
}

export interface DictionaryEntry {
  id: string; // Unique ID for key
  word: string; // The input word/phrase
  targetLanguage: string;
  nativeLanguage: string;
  explanation: string;
  examples: ExampleSentence[];
  usageNote: string; // The fun, casual explanation
  imagePrompt: string; // Used to generate the image
  imageUrl?: string; // Filled after image generation
  timestamp: number;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export enum AppView {
  SETUP = 'SETUP',
  SEARCH = 'SEARCH',
  RESULT = 'RESULT',
  NOTEBOOK = 'NOTEBOOK',
  STORY = 'STORY',
  FLASHCARDS = 'FLASHCARDS'
}
