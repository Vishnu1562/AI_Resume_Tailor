import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  saveMasterProfile,
  getMasterProfile,
  validateProfile,
  saveSettings,
  getSettings,
} from '../src/storage/profileStorage';
import type { MasterProfile, ExtensionSettings } from '../src/types';

describe('Profile Storage (HF-001, HF-002, VR-001, NF-002, RR-001)', () => {
  let mockStorage: Record<string, any> = {};

  beforeEach(() => {
    mockStorage = {};
    (global as any).chrome = {
      storage: {
        local: {
          get: vi.fn((keys: string | string[], cb?: (res: any) => void) => {
            const result: Record<string, any> = {};
            if (typeof keys === 'string') {
              result[keys] = mockStorage[keys];
            } else if (Array.isArray(keys)) {
              keys.forEach((k) => (result[k] = mockStorage[k]));
            }
            if (cb) cb(result);
            return Promise.resolve(result);
          }),
          set: vi.fn((items: Record<string, any>, cb?: () => void) => {
            Object.assign(mockStorage, items);
            if (cb) cb();
            return Promise.resolve();
          }),
        },
      },
    };
  });

  const validProfile: MasterProfile = {
    personalInfo: {
      fullName: 'Alex Morgan',
      email: 'alex.morgan@example.com',
      phone: '+1 (555) 019-2834',
      location: 'San Francisco, CA',
      linkedin: 'https://linkedin.com/in/alex-morgan-sample',
      github: 'https://github.com/alex-morgan-sample',
    },
    summary: 'Software Developer with 4+ years experience...',
    experience: [
      {
        company: 'TechCorp Solutions',
        role: 'Senior Software Engineer',
        location: 'San Francisco, CA',
        startDate: 'Jan 2022',
        endDate: 'Present',
        bullets: ['Engineered scalable RESTful APIs', 'Built modular frontends'],
      },
    ],
    skills: {
      'Languages & Backend': ['C#', 'ASP.NET Core', 'TypeScript', 'Node.js'],
      Frontend: ['Angular', 'Tailwind CSS'],
    },
    projects: [
      {
        name: 'Workflow Automation Platform',
        techStack: 'Node.js, TypeScript, PostgreSQL',
        bullets: ['Built automated orchestration workflows'],
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

  it('VR-001: validates minimum required profile fields', () => {
    const invalidProfile: any = { personalInfo: { fullName: '' }, experience: [] };
    const validation = validateProfile(invalidProfile);
    expect(validation.isValid).toBe(false);
    expect(validation.errors).toContain('Full name is required');
    expect(validation.errors).toContain('At least one experience or project is required');

    const validValidation = validateProfile(validProfile);
    expect(validValidation.isValid).toBe(true);
    expect(validValidation.errors).toHaveLength(0);
  });

  it('HF-001 & RR-001: saves and retrieves master profile to chrome.storage.local', async () => {
    await saveMasterProfile(validProfile);
    const retrieved = await getMasterProfile();
    expect(retrieved).toEqual(validProfile);
  });

  it('NF-002: getMasterProfile returns null when no profile exists', async () => {
    const retrieved = await getMasterProfile();
    expect(retrieved).toBeNull();
  });

  it('HF-002: preserves updated profile on modification', async () => {
    await saveMasterProfile(validProfile);
    const updated = {
      ...validProfile,
      personalInfo: { ...validProfile.personalInfo, phone: '+1 (555) 999-9999' },
    };
    await saveMasterProfile(updated);
    const retrieved = await getMasterProfile();
    expect(retrieved?.personalInfo.phone).toBe('+1 (555) 999-9999');
  });

  it('saves and retrieves settings (provider, apiKey, model)', async () => {
    const settings: ExtensionSettings = {
      provider: 'gemini',
      apiKey: 'test-gemini-key-123',
      model: 'gemini-2.0-flash',
    };
    await saveSettings(settings);
    const retrieved = await getSettings();
    expect(retrieved).toEqual(settings);
  });
});
