export interface GeminiModelInfo {
  name: string;
  version?: string;
  displayName?: string;
  description?: string;
  inputTokenLimit?: number;
  outputTokenLimit?: number;
  supportedGenerationMethods?: string[];
}

export interface DetailedModelItem {
  id: string;
  displayName: string;
  inputTokenLimit?: number;
  tokenLimitFormatted: string;
  label: string;
}

export const DEFAULT_AUTO_MODEL_LABEL = 'Auto-Detect (Recommended)';
export const CUSTOM_MODEL_LABEL = 'Custom Model...';

export const GEMINI_DEFAULT_MODELS: DetailedModelItem[] = [
  { id: 'auto', displayName: 'Auto-Detect (Recommended)', tokenLimitFormatted: '', label: DEFAULT_AUTO_MODEL_LABEL },
  { id: 'gemini-2.5-flash', displayName: 'Gemini 2.5 Flash', tokenLimitFormatted: '1M tokens', label: 'Gemini 2.5 Flash [1M tokens]' },
  { id: 'gemini-2.0-flash', displayName: 'Gemini 2.0 Flash', tokenLimitFormatted: '1M tokens', label: 'Gemini 2.0 Flash [1M tokens]' },
  { id: 'gemini-1.5-flash', displayName: 'Gemini 1.5 Flash', tokenLimitFormatted: '1M tokens', label: 'Gemini 1.5 Flash [1M tokens]' },
  { id: 'gemini-1.5-pro', displayName: 'Gemini 1.5 Pro', tokenLimitFormatted: '2M tokens', label: 'Gemini 1.5 Pro [2M tokens]' },
];

export const GROQ_DEFAULT_MODELS = [
  { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B Versatile [128k tokens]' },
  { id: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B Instant [128k tokens]' },
  { id: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B [32k tokens]' },
];

export const FALLBACK_MODEL = 'gemini-3.8-flash';

export function formatTokenLimit(tokens?: number): string {
  if (!tokens || tokens <= 0) return '';
  if (tokens >= 1_000_000 || tokens >= 1024 * 1024) {
    const m = tokens >= 1024 * 1024 ? Math.round(tokens / (1024 * 1024)) : Math.round(tokens / 1_000_000);
    return `${m}M tokens`;
  }
  if (tokens >= 1000) {
    const k = tokens % 1024 === 0 ? Math.round(tokens / 1024) : Math.round(tokens / 1000);
    return `${k}k tokens`;
  }
  return `${tokens} tokens`;
}

export function getDetailedFlashModels(models: GeminiModelInfo[]): DetailedModelItem[] {
  if (!Array.isArray(models) || models.length === 0) {
    return [];
  }

  const flashModels = models
    .filter((m) => {
      const name = m.name?.toLowerCase() || '';
      const supportsGen = Array.isArray(m.supportedGenerationMethods)
        ? m.supportedGenerationMethods.includes('generateContent')
        : true;
      return (
        name.includes('flash') &&
        supportsGen &&
        !name.includes('tts') &&
        !name.includes('audio') &&
        !name.includes('image') &&
        !name.includes('imagen') &&
        !name.includes('live') &&
        !name.includes('realtime') &&
        !name.includes('embedding') &&
        !name.includes('vision-preview')
      );
    })
    .map((m) => {
      const cleanName = m.name.replace(/^models\//, '');
      const match = cleanName.match(/gemini-(\d+(?:\.\d+)?)-flash/i);
      const versionNum = match ? parseFloat(match[1]) : 0;
      const formattedLimit = formatTokenLimit(m.inputTokenLimit);
      const display = m.displayName || cleanName;
      const label = formattedLimit ? `${display} [${formattedLimit}]` : display;

      return {
        id: cleanName,
        displayName: display,
        inputTokenLimit: m.inputTokenLimit,
        tokenLimitFormatted: formattedLimit,
        label,
        versionNum,
      };
    });

  flashModels.sort((a, b) => b.versionNum - a.versionNum);

  const seen = new Set<string>();
  const results: DetailedModelItem[] = [];
  for (const item of flashModels) {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      results.push({
        id: item.id,
        displayName: item.displayName,
        inputTokenLimit: item.inputTokenLimit,
        tokenLimitFormatted: item.tokenLimitFormatted,
        label: item.label,
      });
    }
  }

  return results;
}

export function selectFlashModelCascade(models: GeminiModelInfo[]): string[] {
  if (!Array.isArray(models) || models.length === 0) {
    return [FALLBACK_MODEL];
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
        !name.includes('tts') &&
        !name.includes('audio') &&
        !name.includes('image') &&
        !name.includes('imagen') &&
        !name.includes('live') &&
        !name.includes('realtime') &&
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
    return [FALLBACK_MODEL];
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
    return [FALLBACK_MODEL];
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) {
      return [FALLBACK_MODEL];
    }
    const data = await res.json();
    return selectFlashModelCascade(data.models || []);
  } catch (err) {
    console.warn('Failed to dynamically query Gemini models from Google API:', err);
    return [FALLBACK_MODEL];
  }
}

export async function discoverLatestGeminiModel(apiKey: string): Promise<string> {
  const cascade = await getGeminiFlashModelCascade(apiKey);
  return cascade[0] || FALLBACK_MODEL;
}

export async function fetchLiveGeminiModels(apiKey: string): Promise<DetailedModelItem[]> {
  if (!apiKey || apiKey.trim() === '') {
    return [];
  }
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return getDetailedFlashModels(data.models || []);
  } catch (err) {
    console.warn('Failed to dynamically query Gemini models from Google API:', err);
    return [];
  }
}
