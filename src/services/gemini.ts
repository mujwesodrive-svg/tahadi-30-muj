import { GoogleGenAI, Type } from "@google/genai";
import { Question } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function getDailyQuestions(): Promise<Question[]> {
  const today = new Date().toDateString();
  
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Generate 3 Islamic questions for a competition today (${today}). 
    One easy, one medium, and one hard.
    Return them in JSON format as an array of objects with:
    - id: string
    - text: string (Arabic)
    - options: string[] (4 options in Arabic)
    - correctAnswer: number (index 0-3)
    - difficulty: 'easy' | 'medium' | 'hard'
    
    Make sure the questions are authentic and diverse.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            text: { type: Type.STRING },
            options: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            correctAnswer: { type: Type.NUMBER },
            difficulty: { type: Type.STRING }
          },
          required: ["id", "text", "options", "correctAnswer", "difficulty"]
        }
      }
    }
  });

  try {
    return JSON.parse(response.text || "[]");
  } catch (e) {
    console.error("Failed to parse Gemini response", e);
    return [];
  }
}
