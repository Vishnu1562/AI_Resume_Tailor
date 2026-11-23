import { describe, it, expect, vi, beforeEach } from 'vitest';
import { discoverLatestGeminiModel, selectBestFlashModel } from '../src/services/geminiService';

describe('Gemini Model Discovery & Auto-Resolution (HF-009, NF-006)', () => {
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
});
