import { GoogleGenAI, Type, Schema, Modality } from "@google/genai";
import { DictionaryEntry } from "../types";

const apiKey = process.env.API_KEY;

// Helper for Base64 decoding
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

const ai = new GoogleGenAI({ apiKey: apiKey });

// 1. Dictionary Lookup
export const lookupWord = async (
  text: string,
  targetLang: string,
  nativeLang: string
): Promise<Omit<DictionaryEntry, 'id' | 'timestamp' | 'imageUrl'>> => {

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      explanation: { type: Type.STRING, description: `Definition in ${nativeLang}` },
      examples: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            target: { type: Type.STRING },
            native: { type: Type.STRING }
          }
        }
      },
      usageNote: { type: Type.STRING, description: "Casual, witty, like a friend explaining slang/culture/tone" },
      imagePrompt: { type: Type.STRING, description: "A simple visual description to generate an image for this concept" }
    },
    required: ["explanation", "examples", "usageNote", "imagePrompt"]
  };

  const prompt = `
    Act as a cool, modern dictionary.
    User Input: "${text}"
    Target Language: ${targetLang}
    Native Language: ${nativeLang}

    Provide:
    1. Natural explanation in ${nativeLang}.
    2. Two example sentences (target & native).
    3. A "usageNote": Explain it like a friend. Mention cultural context, slang, if it's rude/polite, or common mix-ups. Be brief, witty, and direct. NO textbook style.
    4. An "imagePrompt" to visualize this concept effectively.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: schema
    }
  });

  const json = JSON.parse(response.text || "{}");
  return {
    word: text,
    targetLanguage: targetLang,
    nativeLanguage: nativeLang,
    explanation: json.explanation,
    examples: json.examples,
    usageNote: json.usageNote,
    imagePrompt: json.imagePrompt
  };
};

// 2. Image Generation
export const generateConceptImage = async (prompt: string): Promise<string | null> => {
  try {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: prompt,
        config: {
           imageConfig: { aspectRatio: '1:1' }
        }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
            return `data:image/png;base64,${part.inlineData.data}`;
        }
    }
    return null;
  } catch (e) {
    console.error("Image generation failed", e);
    return null;
  }
};

// 3. Text to Speech
export const playTTS = async (text: string, voiceName: string = 'Puck') => {
  try {
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: text }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: voiceName },
              },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) throw new Error("No audio data received");

      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
      const audioBuffer = await decodeAudioData(
        decode(base64Audio),
        audioContext,
        24000,
        1
      );

      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      source.start();

  } catch (e) {
    console.error("TTS failed", e);
    // Fallback to browser TTS if Gemini fails (robustness)
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utterance);
  }
};

// 4. Chat with Word Context
export const chatWithWord = async (
  history: { role: string, parts: { text: string }[] }[],
  newMessage: string,
  wordContext: DictionaryEntry
) => {
    const chat = ai.chats.create({
        model: 'gemini-2.5-flash',
        history: [
            {
                role: 'user',
                parts: [{ text: `We are discussing the word/phrase: "${wordContext.word}" (Target: ${wordContext.targetLanguage}).
                Here is the definition I have: ${wordContext.explanation}.
                Usage note: ${wordContext.usageNote}.
                Answer my future questions briefly and fun, like a language tutor buddy.` }]
            },
            {
                role: 'model',
                parts: [{ text: "Got it! I'm ready to chat about this word. What's up?" }]
            },
            ...history
        ]
    });

    const response = await chat.sendMessage({ message: newMessage });
    return response.text;
};

// 5. Generate Story from Notebook
export const generateStory = async (words: DictionaryEntry[], targetLang: string, nativeLang: string): Promise<string> => {
    const wordList = words.map(w => w.word).join(", ");
    const prompt = `
      Create a short, funny, and coherent story in ${targetLang} using these words: ${wordList}.
      Also provide the translation in ${nativeLang} after the story.
      Keep it simple, suitable for a language learner.
      Highlight the key words in the text if possible (using markdown bold).
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
    });

    return response.text || "Could not generate story.";
}
