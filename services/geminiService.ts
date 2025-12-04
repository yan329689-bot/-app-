import { GoogleGenAI, Type, Modality } from "@google/genai";
import { WordDefinition, ImageLabel } from "../types";

const apiKey = process.env.API_KEY;

// Helper to get a fresh instance (useful for Veo key selection updates)
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const lookupWordInGemini = async (word: string): Promise<WordDefinition> => {
  const ai = getAI();
  const model = "gemini-2.5-flash";
  
  const response = await ai.models.generateContent({
    model,
    contents: `You are an expert English teacher. Explain the English word "${word}" for a Chinese student. 
    Provide the phonetic transcription (IPA), part of speech, English definition, Chinese definition, and a good example sentence with its translation.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          word: { type: Type.STRING },
          phonetic: { type: Type.STRING },
          partOfSpeech: { type: Type.STRING },
          definitionEn: { type: Type.STRING },
          definitionCn: { type: Type.STRING },
          exampleSentence: { type: Type.STRING },
          exampleTranslation: { type: Type.STRING },
        },
        required: ["word", "phonetic", "partOfSpeech", "definitionEn", "definitionCn", "exampleSentence", "exampleTranslation"],
      },
    },
  });

  if (response.text) {
      return JSON.parse(response.text) as WordDefinition;
  }
  throw new Error("Failed to generate definition");
};

export const generateTTS = async (text: string): Promise<string | null> => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: 'Kore' },
              },
          },
        },
      });
      
      return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
  } catch (error) {
      console.error("TTS Error", error);
      return null;
  }
};

export const generateWordImage = async (word: string, definition: string): Promise<string | null> => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { text: `Create a creative, pictographic mnemonic illustration for the English word "${word}". The image should visually represent the meaning "${definition}" in a concrete way to help memorize the word. Focus on creating a strong visual association between the concept and the image. Style: colorful, clear, educational art. No text in the image.` }
        ]
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (e) {
    console.error("Image Generation Error", e);
    throw e;
  }
};

export const generateWordVideo = async (word: string, context: string): Promise<string | null> => {
  // Create a new instance to ensure we use the latest selected key for Veo
  const ai = getAI(); 
  try {
    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: `A vivid, cinematic video clip that brings the English word "${word}" to life. The video should clearly demonstrate the concept: "${context}" in a memorable way to help a student learn the word.`,
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: '16:9'
      }
    });

    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) return null;

    const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch (e) {
    console.error("Video Generation Error", e);
    throw e;
  }
};

export const analyzeImageForVocabulary = async (base64Image: string): Promise<ImageLabel[]> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: {
      parts: [
        { inlineData: { mimeType: "image/jpeg", data: base64Image } },
        { text: `Identify the 5 most distinct and prominent physical objects in this image. 
          For each object, provide the English label (single word or short phrase) and its phonetic transcription. 
          Also estimate the center position of the object in the image as X and Y percentages (0 to 100, where x=0 is left, y=0 is top).
          Return a JSON array.` }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                label: { type: Type.STRING },
                phonetic: { type: Type.STRING },
                x: { type: Type.NUMBER, description: "X percentage coordinate (0-100)" },
                y: { type: Type.NUMBER, description: "Y percentage coordinate (0-100)" }
            },
            required: ["label", "phonetic", "x", "y"]
        }
      }
    }
  });

  if (response.text) {
      return JSON.parse(response.text) as ImageLabel[];
  }
  return [];
};