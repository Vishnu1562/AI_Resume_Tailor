import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  discoverLatestGeminiModel,
  selectBestFlashModel,
  selectFlashModelCascade,
  getGeminiFlashModelCascade,
  formatTokenLimit,
  getDetailedFlashModels,
  DEFAULT_AUTO_MODEL_LABEL,
  CUSTOM_MODEL_LABEL,
  GEMINI_DEFAULT_MODELS,
  GROQ_DEFAULT_MODELS,
} from '../src/services/geminiService';

describe('Gemini Model Discovery & Auto-Resolution (HF-009, NF-006, NF-007)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const mockModelsList = {
    models: [
      {
        name: 'models/gemini-1.0-pro',
        supportedGenerationMethods: ['generateContent'],
      },
      {
        name: 'models/gemini-1.5-flash',
        supportedGenerationMethods: ['generateContent'],
      },
      {
        name: 'models/gemini-1.5-pro',
        supportedGenerationMethods: ['generateContent'],
      },
      {
        name: 'models/gemini-2.5-flash',
        supportedGenerationMethods: ['generateContent'],
      },
      {
        name: 'models/gemini-3.8-flash',
        supportedGenerationMethods: ['generateContent'],
      },
      {
        name: 'models/text-embedding-004',
        supportedGenerationMethods: ['embedContent'],
      },
    ],
  };

  it('selectBestFlashModel identifies the newest flash model from API response', () => {
    const best = selectBestFlashModel(mockModelsList.models);
    expect(best).toBe('gemini-3.8-flash');
  });

  it('selectBestFlashModel falls back to gemini-3.8-flash if list is empty or invalid', () => {
    expect(selectBestFlashModel([])).toBe('gemini-3.8-flash');
    expect(selectBestFlashModel(null as any)).toBe('gemini-3.8-flash');
  });

  it('selectFlashModelCascade returns descending ordered list of all active flash models', () => {
    const cascade = selectFlashModelCascade(mockModelsList.models);
    expect(cascade).toEqual(['gemini-3.8-flash', 'gemini-2.5-flash', 'gemini-1.5-flash']);
  });

  it('selectFlashModelCascade never injects unreturned or hardcoded models', () => {
    const liveGoogleModels = [
      { name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] },
      { name: 'models/gemini-2.0-flash-exp', supportedGenerationMethods: ['generateContent'] },
    ];
    const cascade = selectFlashModelCascade(liveGoogleModels);
    expect(cascade).toEqual(['gemini-2.5-flash', 'gemini-2.0-flash-exp']);
    expect(cascade).not.toContain('gemini-1.5-flash');
    expect(cascade).not.toContain('gemini-3.8-flash');
  });

  it('HF-011: selectFlashModelCascade strictly filters out audio, TTS, image, and realtime models', () => {
    const mixedModels = [
      { name: 'models/gemini-3.8-flash-lite-tts', supportedGenerationMethods: ['generateContent'] },
      { name: 'models/gemini-3.8-flash', supportedGenerationMethods: ['generateContent'] },
      { name: 'models/gemini-2.5-flash-audio', supportedGenerationMethods: ['generateContent'] },
      { name: 'models/gemini-2.0-flash-realtime', supportedGenerationMethods: ['generateContent'] },
      { name: 'models/gemini-2.0-flash-live', supportedGenerationMethods: ['generateContent'] },
      { name: 'models/gemini-1.5-flash', supportedGenerationMethods: ['generateContent'] },
    ];
    const cascade = selectFlashModelCascade(mixedModels);
    expect(cascade).toEqual(['gemini-3.8-flash', 'gemini-1.5-flash']);
    expect(cascade).not.toContain('gemini-3.8-flash-lite-tts');
    expect(cascade).not.toContain('gemini-2.5-flash-audio');
    expect(cascade).not.toContain('gemini-2.0-flash-realtime');
  });

  it('getGeminiFlashModelCascade fetches and returns ordered cascade via API', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockModelsList,
    });
    (global as any).fetch = mockFetch;

    const cascade = await getGeminiFlashModelCascade('valid-api-key');
    expect(cascade).toEqual(['gemini-3.8-flash', 'gemini-2.5-flash', 'gemini-1.5-flash']);
  });

  it('HF-009: discoverLatestGeminiModel fetches and resolves newest flash model via API', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockModelsList,
    });
    (global as any).fetch = mockFetch;

    const resolved = await discoverLatestGeminiModel('valid-api-key');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('https://generativelanguage.googleapis.com/v1beta/models?key=valid-api-key')
    );
    expect(resolved).toBe('gemini-3.8-flash');
  });

  it('discoverLatestGeminiModel falls back gracefully if network call fails', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });
    (global as any).fetch = mockFetch;

    const resolved = await discoverLatestGeminiModel('valid-api-key');
    expect(resolved).toBe('gemini-3.8-flash');
  });

  describe('Token Limit Formatting & Detailed Model Extraction (HF-013, HF-014)', () => {
    it('formatTokenLimit formats millions, thousands, and edge cases accurately', () => {
      expect(formatTokenLimit(1048576)).toBe('1M tokens');
      expect(formatTokenLimit(2097152)).toBe('2M tokens');
      expect(formatTokenLimit(131072)).toBe('128k tokens');
      expect(formatTokenLimit(32768)).toBe('32k tokens');
      expect(formatTokenLimit(1000000)).toBe('1M tokens');
      expect(formatTokenLimit(undefined)).toBe('');
      expect(formatTokenLimit(0)).toBe('');
    });

    it('getDetailedFlashModels extracts models with display names, token limits, and clean labels', () => {
      const apiModels = [
        {
          name: 'models/gemini-1.5-flash',
          displayName: 'Gemini 1.5 Flash',
          inputTokenLimit: 1048576,
          supportedGenerationMethods: ['generateContent'],
        },
        {
          name: 'models/gemini-2.0-flash',
          displayName: 'Gemini 2.0 Flash',
          inputTokenLimit: 1048576,
          supportedGenerationMethods: ['generateContent'],
        },
        {
          name: 'models/gemini-3.8-flash-lite-tts',
          displayName: 'Gemini 3.8 Flash TTS',
          inputTokenLimit: 10000,
          supportedGenerationMethods: ['generateContent'],
        },
      ];

      const detailed = getDetailedFlashModels(apiModels);
      expect(detailed).toHaveLength(2);
      expect(detailed[0].id).toBe('gemini-2.0-flash');
      expect(detailed[0].tokenLimitFormatted).toBe('1M tokens');
      expect(detailed[0].label).toBe('Gemini 2.0 Flash [1M tokens]');

      expect(detailed[1].id).toBe('gemini-1.5-flash');
      expect(detailed[1].tokenLimitFormatted).toBe('1M tokens');
      expect(detailed[1].label).toBe('Gemini 1.5 Flash [1M tokens]');
    });

    it('GEMINI_DEFAULT_MODELS and GROQ_DEFAULT_MODELS contain clean, emoji-free professional labels (HF-013)', () => {
      // Emojis regex to ensure zero consumer emojis in dropdown options
      const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

      expect(DEFAULT_AUTO_MODEL_LABEL).toBe('Auto-Detect (Recommended)');
      expect(emojiRegex.test(DEFAULT_AUTO_MODEL_LABEL)).toBe(false);

      expect(CUSTOM_MODEL_LABEL).toBe('Custom Model...');
      expect(emojiRegex.test(CUSTOM_MODEL_LABEL)).toBe(false);

      for (const m of GEMINI_DEFAULT_MODELS) {
        expect(emojiRegex.test(m.label)).toBe(false);
        expect(m.label).not.toContain('✨');
        expect(m.label).not.toContain('✏️');
      }

      for (const m of GROQ_DEFAULT_MODELS) {
        expect(emojiRegex.test(m.label)).toBe(false);
        expect(m.label).not.toContain('✨');
        expect(m.label).not.toContain('✏️');
      }
    });
  });
});
