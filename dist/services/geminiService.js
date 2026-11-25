export const FALLBACK_MODEL = 'gemini-3.8-flash';
export function formatTokenLimit(tokens) {
    if (!tokens || tokens <= 0)
        return '';
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
export function getDetailedFlashModels(models) {
    if (!Array.isArray(models) || models.length === 0) {
        return [];
    }
    const flashModels = models
        .filter((m) => {
        const name = m.name?.toLowerCase() || '';
        const supportsGen = Array.isArray(m.supportedGenerationMethods)
            ? m.supportedGenerationMethods.includes('generateContent')
            : true;
        return (name.includes('flash') &&
            supportsGen &&
            !name.includes('tts') &&
            !name.includes('audio') &&
            !name.includes('image') &&
            !name.includes('imagen') &&
            !name.includes('live') &&
            !name.includes('realtime') &&
            !name.includes('embedding') &&
            !name.includes('vision-preview'));
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
    const seen = new Set();
    const results = [];
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
export function selectFlashModelCascade(models) {
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
        return (name.includes('flash') &&
            supportsGen &&
            !name.includes('tts') &&
            !name.includes('audio') &&
            !name.includes('image') &&
            !name.includes('imagen') &&
            !name.includes('live') &&
            !name.includes('realtime') &&
            !name.includes('embedding') &&
            !name.includes('vision-preview'));
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
export function selectBestFlashModel(models) {
    const cascade = selectFlashModelCascade(models);
    return cascade[0] || FALLBACK_MODEL;
}
export async function getGeminiFlashModelCascade(apiKey) {
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
    }
    catch (err) {
        console.warn('Failed to dynamically query Gemini models from Google API:', err);
        return [FALLBACK_MODEL];
    }
}
export async function discoverLatestGeminiModel(apiKey) {
    const cascade = await getGeminiFlashModelCascade(apiKey);
    return cascade[0] || FALLBACK_MODEL;
}
export async function fetchLiveGeminiModels(apiKey) {
    if (!apiKey || apiKey.trim() === '') {
        return [];
    }
    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
        const res = await fetch(url);
        if (!res.ok)
            return [];
        const data = await res.json();
        return getDetailedFlashModels(data.models || []);
    }
    catch (err) {
        console.warn('Failed to dynamically query Gemini models from Google API:', err);
        return [];
    }
}
