import { describe, it, expect, vi } from 'vitest';
import { tailorResume, buildPrompt } from '../src/services/tailoringEngine';
import type { MasterProfile, ExtensionSettings, JobContext } from '../src/types';

describe('Tailoring Engine (HF-004, HF-005, NF-001, NF-004, VR-002)', () => {
  const mockProfile: MasterProfile = {
    personalInfo: {
      fullName: 'Alex Morgan',
      email: 'alex.morgan@example.com',
      phone: '+1 (555) 019-2834',
      location: 'San Francisco, CA',
    },
    summary: 'Software Developer with 4+ years experience in C# .NET, Angular, and NestJS.',
    experience: [
      {
        company: 'TechCorp Solutions',
        role: 'Senior Software Engineer',
        location: 'San Francisco, CA',
        startDate: 'Jan 2022',
        endDate: 'Present',
        bullets: ['Built enterprise RESTful APIs in C# .NET and Clean Architecture'],
      },
    ],
    skills: {
      'Backend & Languages': ['C#', '.NET 8', 'TypeScript', 'NestJS'],
      Frontend: ['Angular', 'NgRx'],
    },
    projects: [
      {
        name: 'Workflow Platform',
        techStack: 'NestJS, Angular, PostgreSQL',
        bullets: ['Automated management platform with EAV schema'],
      },
    ],
    education: [
      {
        degree: 'B.S. in Computer Science',
        institution: 'State University',
        year: '2017 – 2021',
      },
    ],
    certifications: ['AWS Certified Solutions Architect'],
  };

  const mockJob: JobContext = {
    title: 'Senior Software Developer (.NET & Angular)',
    company: 'EnterpriseCorp',
    description: 'Looking for a Senior Developer with solid C#, ASP.NET Core, Angular, OOP, and Agile.',
  };

  it('VR-002: buildPrompt includes strict grounding rules against hallucination', () => {
    const prompt = buildPrompt(mockProfile, mockJob);
    expect(prompt).toContain('DO NOT invent or hallucinate');
    expect(prompt).toContain('TechCorp Solutions');
    expect(prompt).toContain('EnterpriseCorp');
    expect(prompt).toContain('Senior Software Developer (.NET & Angular)');
  });

  it('NF-001: throws descriptive error when API key is missing', async () => {
    const settingsWithoutKey: ExtensionSettings = {
      provider: 'gemini',
      apiKey: '',
      model: 'gemini-3.8-flash',
    };

    await expect(tailorResume(mockProfile, mockJob, settingsWithoutKey)).rejects.toThrow(
      /API key is required/i
    );
  });

  it('HF-004: calls Gemini API and returns formatted TailoredResume', async () => {
    const fakeGeminiResponse = {
      matchScore: 92,
      matchedSkills: ['C#', 'ASP.NET Core', 'Angular', 'OOP'],
      missingKeywords: ['Microservices'],
      tailoredSummary: 'Enterprise Software Developer specializing in C# .NET 8, Angular, and Clean Architecture.',
      prioritizedSkills: {
        'Core Technologies': ['C#', 'ASP.NET Core', 'Angular', 'TypeScript'],
        'Architecture & DB': ['Clean Architecture', 'OOP', 'SQL Server'],
      },
      experience: [
        {
          company: 'TechCorp Solutions',
          role: 'Senior Software Engineer',
          location: 'San Francisco, CA',
          period: 'Jan 2022 – Present',
          bullets: ['Engineered high-throughput RESTful Web APIs using C#, ASP.NET Core, and Clean Architecture'],
        },
      ],
      projects: [
        {
          name: 'Workflow Platform',
          techStack: 'NestJS, Angular, PostgreSQL',
          bullets: ['Engineered full-stack platform with Angular front-end and robust database modeling'],
        },
      ],
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: JSON.stringify(fakeGeminiResponse) }],
            },
          },
        ],
      }),
    });
    (global as any).fetch = mockFetch;

    const settings: ExtensionSettings = {
      provider: 'gemini',
      apiKey: 'valid-gemini-key',
      model: 'gemini-3.8-flash',
    };

    const result = await tailorResume(mockProfile, mockJob, settings);
    expect(result.matchScore).toBe(92);
    expect(result.matchedSkills).toContain('C#');
    expect(result.tailoredSummary).toContain('C# .NET 8');
  });

  it('NF-004: handles API quota / network error gracefully', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
      json: async () => ({ error: { message: 'Quota exceeded for model' } }),
    });
    (global as any).fetch = mockFetch;

    const settings: ExtensionSettings = {
      provider: 'gemini',
      apiKey: 'rate-limited-key',
      model: 'gemini-3.8-flash',
    };

    await expect(tailorResume(mockProfile, mockJob, settings)).rejects.toThrow(
      /Quota exceeded|429/i
    );
  });

  it('NF-006: automatically recovers from deprecated model error by querying latest model and retrying', async () => {
    const fakeGeminiResponse = {
      matchScore: 90,
      matchedSkills: ['C#', 'Angular'],
      tailoredSummary: 'Summary text',
      prioritizedSkills: { Backend: ['C#'] },
      experience: [],
      projects: [],
    };

    const mockFetch = vi
      .fn()
      // First call fails with deprecation
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: { message: 'models/gemini-2.0-flash is no longer available. Please use gemini-3.8-flash' },
        }),
      })
      // Second call queries models endpoint
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          models: [
            { name: 'models/gemini-3.8-flash', supportedGenerationMethods: ['generateContent'] },
          ],
        }),
      })
      // Third call retries with newly discovered model
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: JSON.stringify(fakeGeminiResponse) }] } }],
        }),
      });

    (global as any).fetch = mockFetch;

    const settings: ExtensionSettings = {
      provider: 'gemini',
      apiKey: 'test-key',
      model: 'gemini-old-deprecated',
    };

    const result = await tailorResume(mockProfile, mockJob, settings);
    expect(result.matchScore).toBe(90);
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it('NF-007: cascades dynamically through live models from Google API when encountering high demand (503)', async () => {
    const fakeGeminiResponse = {
      matchScore: 88,
      matchedSkills: ['TypeScript', 'Node.js'],
      tailoredSummary: 'Summary text from fallback model',
      prioritizedSkills: { Backend: ['TypeScript'] },
      experience: [],
      projects: [],
    };

    const mockFetch = vi
      .fn()
      // First call (gemini-3.8-flash) fails with 503 high demand
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => ({
          error: { message: 'This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.' },
        }),
      })
      // Second call queries Google's live models endpoint
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          models: [
            { name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] },
          ],
        }),
      })
      // Third call executes on the live discovered model (gemini-2.5-flash) and succeeds
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: JSON.stringify(fakeGeminiResponse) }] } }],
        }),
      });

    (global as any).fetch = mockFetch;

    const settings: ExtensionSettings = {
      provider: 'gemini',
      apiKey: 'test-key',
      model: 'gemini-3.8-flash',
    };

    const result = await tailorResume(mockProfile, mockJob, settings);
    expect(result.matchScore).toBe(88);
    expect(mockFetch).toHaveBeenCalledTimes(3);
    // Verified call 2 was to live models endpoint
    expect(mockFetch.mock.calls[1][0]).toContain('https://generativelanguage.googleapis.com/v1beta/models?key=test-key');
    // Verified call 3 used the live discovered model
    expect(mockFetch.mock.calls[2][0]).toContain('models/gemini-2.5-flash:generateContent');
  });

  it('NF-008: dynamically queries live models when encountering model not found (404/400)', async () => {
    const fakeGeminiResponse = {
      matchScore: 85,
      matchedSkills: ['C#'],
      tailoredSummary: 'Recovered summary',
      prioritizedSkills: { Backend: ['C#'] },
      experience: [],
      projects: [],
    };

    const mockFetch = vi
      .fn()
      // First call fails with model not found
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({
          error: { message: 'models/gemini-1.5-flash is not found for API version v1beta, or is not supported for generateContent.' },
        }),
      })
      // Second call queries Google live models endpoint
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          models: [
            { name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] },
          ],
        }),
      })
      // Third call uses live model
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: JSON.stringify(fakeGeminiResponse) }] } }],
        }),
      });

    (global as any).fetch = mockFetch;

    const settings: ExtensionSettings = {
      provider: 'gemini',
      apiKey: 'test-key',
      model: 'gemini-1.5-flash',
    };

    const result = await tailorResume(mockProfile, mockJob, settings);
    expect(result.matchScore).toBe(85);
    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(mockFetch.mock.calls[1][0]).toContain('https://generativelanguage.googleapis.com/v1beta/models?key=test-key');
    expect(mockFetch.mock.calls[2][0]).toContain('models/gemini-2.5-flash:generateContent');
  });

  it('NF-009: recovers gracefully when target model does not support JSON mode', async () => {
    const fakeGeminiResponse = {
      matchScore: 91,
      matchedSkills: ['C#', 'SQL'],
      tailoredSummary: 'Summary without JSON mode',
      prioritizedSkills: { Backend: ['C#'] },
      experience: [],
      projects: [],
    };

    const mockFetch = vi
      .fn()
      // First call fails with "JSON mode is not enabled for this model"
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: { message: 'JSON mode is not enabled for this model' },
        }),
      })
      // Second call retries without responseMimeType and succeeds
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [{
            content: {
              parts: [{ text: 'Here is the tailored resume:\n```json\n' + JSON.stringify(fakeGeminiResponse) + '\n```' }],
            },
          }],
        }),
      });

    (global as any).fetch = mockFetch;

    const settings: ExtensionSettings = {
      provider: 'gemini',
      apiKey: 'test-key',
      model: 'gemini-3.8-flash',
    };

    const result = await tailorResume(mockProfile, mockJob, settings);
    expect(result.matchScore).toBe(91);
    expect(mockFetch).toHaveBeenCalledTimes(2);

    // Verify second request did not have responseMimeType
    const secondReqBody = JSON.parse(mockFetch.mock.calls[1][1].body);
    expect(secondReqBody.generationConfig?.responseMimeType).toBeUndefined();
  });
});
