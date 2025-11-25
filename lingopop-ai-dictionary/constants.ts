import { Language } from './types';

export const LANGUAGES: Language[] = [
  { code: 'en', name: 'English', flag: '🇬🇧', voiceName: 'Puck' },
  { code: 'zh', name: 'Chinese', flag: '🇨🇳', voiceName: 'Kore' }, // Fallback logic will handle language support
  { code: 'es', name: 'Spanish', flag: '🇪🇸', voiceName: 'Fenrir' },
  { code: 'fr', name: 'French', flag: '🇫🇷', voiceName: 'Charon' },
  { code: 'de', name: 'German', flag: '🇩🇪', voiceName: 'Puck' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵', voiceName: 'Kore' },
  { code: 'ko', name: 'Korean', flag: '🇰🇷', voiceName: 'Kore' },
  { code: 'it', name: 'Italian', flag: '🇮🇹', voiceName: 'Fenrir' },
  { code: 'pt', name: 'Portuguese', flag: '🇧🇷', voiceName: 'Fenrir' },
  { code: 'ru', name: 'Russian', flag: '🇷🇺', voiceName: 'Charon' },
];

export const MOCK_IMAGE = "https://picsum.photos/400/400";
