import { GoogleGenAI } from '@google/genai';

let genAI: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI {
  if (typeof window !== 'undefined') {
    throw new Error('Gemini client can only be used server-side');
  }

  if (!genAI) {
    const apiKey = process.env.GOOGLE_API_KEY;

    if (!apiKey) {
      throw new Error('GOOGLE_API_KEY is not set');
    }

    genAI = new GoogleGenAI({ apiKey });
  }

  return genAI;
}

export type EmbeddingTextParts = {
  name: string;
  jobTypes: string[];
  bio: string;
  tags: string[];
  cities: string[];
};

export function buildEmbeddingText(parts: EmbeddingTextParts): string {
  const { name, jobTypes, bio, tags, cities } = parts;
  
  const jobTypesStr = jobTypes.join(', ');
  const tagsStr = tags.join(', ');
  const citiesStr = cities.join(', ');

  return [
    `Name: ${name}`,
    `Job Types: ${jobTypesStr}`,
    `Bio: ${bio}`,
    `Tags: ${tagsStr}`,
    `Serviceable Cities: ${citiesStr}`,
  ].join('\n\n');
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const genAI = getGenAI();
  
  const response = await genAI.models.embedContent({
    model: 'text-embedding-004',
    contents: [text],
  });

  const embedding = response.embeddings?.[0]?.values;

  if (!embedding || embedding.length === 0) {
    throw new Error('Failed to generate embedding');
  }

  return Array.from(embedding);
}
