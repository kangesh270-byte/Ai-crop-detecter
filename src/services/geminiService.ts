import { GoogleGenAI, Type, Modality } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface AnalysisResult {
  cropName: string;
  diseaseName: string;
  confidence: number;
  severity: 'Low' | 'Medium' | 'High';
  solutions: {
    organic: string[];
    chemical: string[];
    prevention: string[];
  };
  explanation: string;
}

export const analyzeCropImage = async (base64Image: string, language: string = 'English'): Promise<AnalysisResult> => {
  const model = "gemini-3-flash-preview";
  
  const prompt = `Analyze this crop leaf image. Detect the crop type, identify any disease or deficiency, and provide solutions. 
  Respond in ${language}. 
  If no disease is found, state it is healthy.
  Return the response in JSON format.`;

  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image.split(',')[1] || base64Image
            }
          }
        ]
      }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          cropName: { type: Type.STRING },
          diseaseName: { type: Type.STRING },
          confidence: { type: Type.NUMBER },
          severity: { type: Type.STRING, enum: ['Low', 'Medium', 'High'] },
          solutions: {
            type: Type.OBJECT,
            properties: {
              organic: { type: Type.ARRAY, items: { type: Type.STRING } },
              chemical: { type: Type.ARRAY, items: { type: Type.STRING } },
              prevention: { type: Type.ARRAY, items: { type: Type.STRING } }
            }
          },
          explanation: { type: Type.STRING }
        },
        required: ['cropName', 'diseaseName', 'confidence', 'severity', 'solutions', 'explanation']
      }
    }
  });

  return JSON.parse(response.text || "{}");
};

export const chatWithAssistant = async (message: string, context: string, language: string = 'English') => {
  const model = "gemini-3-flash-preview";
  const response = await ai.models.generateContent({
    model,
    contents: `You are an expert agricultural assistant. Help the farmer with their query. 
    Current Context: ${context}
    Farmer's Question: ${message}
    Respond in ${language} using simple, practical language.`,
  });
  return response.text;
};

export const generateVoiceExplanation = async (text: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Explain this to a farmer clearly: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const part = response.candidates?.[0]?.content?.parts?.[0];
    if (part?.inlineData) {
      return {
        data: part.inlineData.data,
        mimeType: part.inlineData.mimeType
      };
    }
    return null;
  } catch (error) {
    console.error("TTS Error:", error);
    return null;
  }
};
