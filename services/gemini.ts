import { GoogleGenAI, Type } from "@google/genai";
import { GestureType } from "../types";

// Initialize the Gemini API client
const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export const detectHandGesture = async (base64Image: string): Promise<GestureType> => {
  if (!apiKey) {
    console.warn("No API Key provided");
    return GestureType.NONE;
  }

  try {
    // Remove the data URL prefix if present
    const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|webp);base64,/, "");

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: cleanBase64
            }
          },
          {
            text: `You are a computer vision assistant analyzing a webcam frame.
            Identify the user's hand gesture. The user might be close to the camera.
            
            - Return "FIST" if you see a closed fist (fingers curled in).
            - Return "OPEN" if you see an open hand, palm, or fingers spread out.
            - Return "NONE" if no hand is clearly visible, or the gesture is ambiguous.
            
            Be tolerant of lighting and angles.`
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            gesture: {
              type: Type.STRING,
              enum: ["FIST", "OPEN", "NONE"],
              description: "The detected hand gesture."
            }
          }
        },
        maxOutputTokens: 50,
      }
    });

    let jsonText = response.text || "{}";
    
    // Sanitize Markdown if present (Gemini sometimes adds ```json ... ```)
    if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/^```json\s*/, "").replace(/^```\s*/, "").replace(/\s*```$/, "");
    }

    const result = JSON.parse(jsonText);
    const gesture = result.gesture as GestureType;
    
    console.log("Gemini Vision Result:", gesture); // Debug log
    return gesture;

  } catch (error) {
    console.error("Gemini API Error:", error);
    return GestureType.NONE;
  }
};