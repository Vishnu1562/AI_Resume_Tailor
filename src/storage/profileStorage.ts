import type { MasterProfile, ExtensionSettings } from '../types/index.js';

const STORAGE_KEYS = {
  MASTER_PROFILE: 'ai_resume_tailor_profile',
  SETTINGS: 'ai_resume_tailor_settings',
} as const;

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export function validateProfile(profile: Partial<MasterProfile>): ValidationResult {
  const errors: string[] = [];

  if (!profile.personalInfo?.fullName || profile.personalInfo.fullName.trim() === '') {
    errors.push('Full name is required');
  }

  const hasExperience = Array.isArray(profile.experience) && profile.experience.length > 0;
  const hasProjects = Array.isArray(profile.projects) && profile.projects.length > 0;

  if (!hasExperience && !hasProjects) {
    errors.push('At least one experience or project is required');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export async function saveMasterProfile(profile: MasterProfile): Promise<void> {
  const validation = validateProfile(profile);
  if (!validation.isValid) {
    throw new Error(`Invalid profile: ${validation.errors.join(', ')}`);
  }

  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    await chrome.storage.local.set({ [STORAGE_KEYS.MASTER_PROFILE]: profile });
  } else if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.MASTER_PROFILE, JSON.stringify(profile));
  }
}

export async function getMasterProfile(): Promise<MasterProfile | null> {
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    const data = await chrome.storage.local.get(STORAGE_KEYS.MASTER_PROFILE);
    return data[STORAGE_KEYS.MASTER_PROFILE] || null;
  } else if (typeof localStorage !== 'undefined') {
    const data = localStorage.getItem(STORAGE_KEYS.MASTER_PROFILE);
    return data ? JSON.parse(data) : null;
  }
  return null;
}

export async function saveSettings(settings: ExtensionSettings): Promise<void> {
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    await chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: settings });
  } else if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }
}

export async function getSettings(): Promise<ExtensionSettings | null> {
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    const data = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
    return data[STORAGE_KEYS.SETTINGS] || null;
  } else if (typeof localStorage !== 'undefined') {
    const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    return data ? JSON.parse(data) : null;
  }
  return null;
}
