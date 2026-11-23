export interface GeminiModelInfo {
  name: string;
  version?: string;
  displayName?: string;
  description?: string;
  supportedGenerationMethods?: string[];
}

export const FALLBACK_CASCADE = [
  'gemini-3.8-flash',
  'gemini-2.5-flash',
  'gemini-1.5-flash',
];

export const FALLBACK_MODEL = FALLBACK_CASCADE[0];

export function selectFlashModelCascade(models: GeminiModelInfo[]): string[] {
  if (!Array.isArray(models) || models.length === 0) {
    return [...FALLBACK_CASCADE];
  }

  // Filter models that support content generation and contain 'flash'
  const flashModels = models
    .filter((m) => {
      const name = m.name?.toLowerCase() || '';
      const supportsGen = Array.isArray(m.supportedGenerationMethods)
        ? m.supportedGenerationMethods.includes('generateContent')
        : true;
      return (
        name.includes('flash') &&
        supportsGen &&
        !name.includes('embedding') &&
        !name.includes('vision-preview')
      );
    })
    .map((m) => {
      const cleanName = m.name.replace(/^models\//, '');
      // Extract numeric version, e.g. gemini-3.8-flash -> 3.8
      const match = cleanName.match(/gemini-(\d+(?:\.\d+)?)-flash/i);
      const versionNum = match ? parseFloat(match[1]) : 0;
      return { cleanName, versionNum };
    });

  if (flashModels.length === 0) {
    return [...FALLBACK_CASCADE];
  }

  // Sort descending by version number
  flashModels.sort((a, b) => b.versionNum - a.versionNum);

  const uniqueNames = Array.from(new Set(flashModels.map((m) => m.cleanName)));
  return uniqueNames;
}

export function selectBestFlashModel(models: GeminiModelInfo[]): string {
  const cascade = selectFlashModelCascade(models);
  return cascade[0] || FALLBACK_MODEL;
}

export async function getGeminiFlashModelCascade(apiKey: string): Promise<string[]> {
  if (!apiKey || apiKey.trim() === '') {
    return [...FALLBACK_CASCADE];
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) {
      return [...FALLBACK_CASCADE];
    }
    const data = await res.json();
    return selectFlashModelCascade(data.models || []);
  } catch (err) {
    console.warn('Failed to dynamically query Gemini models, falling back to static cascade:', err);
    return [...FALLBACK_CASCADE];
  }
}

export async function discoverLatestGeminiModel(apiKey: string): Promise<string> {
  const cascade = await getGeminiFlashModelCascade(apiKey);
  return cascade[0] || FALLBACK_MODEL;
}
