export interface GeminiModelInfo {
  name: string;
  version?: string;
  displayName?: string;
  description?: string;
  supportedGenerationMethods?: string[];
}

const FALLBACK_MODEL = 'gemini-3.8-flash';

export function selectBestFlashModel(models: GeminiModelInfo[]): string {
  if (!Array.isArray(models) || models.length === 0) {
    return FALLBACK_MODEL;
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
    return FALLBACK_MODEL;
  }

  // Sort descending by version number
  flashModels.sort((a, b) => b.versionNum - a.versionNum);

  return flashModels[0].cleanName || FALLBACK_MODEL;
}

export async function discoverLatestGeminiModel(apiKey: string): Promise<string> {
  if (!apiKey || apiKey.trim() === '') {
    return FALLBACK_MODEL;
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) {
      return FALLBACK_MODEL;
    }
    const data = await res.json();
    return selectBestFlashModel(data.models || []);
  } catch (err) {
    console.warn('Failed to dynamically query Gemini models, falling back:', err);
    return FALLBACK_MODEL;
  }
}
