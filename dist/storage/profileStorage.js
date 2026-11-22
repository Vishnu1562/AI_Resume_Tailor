const STORAGE_KEYS = {
    MASTER_PROFILE: 'ai_resume_tailor_profile',
    SETTINGS: 'ai_resume_tailor_settings',
};
export function validateProfile(profile) {
    const errors = [];
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
export async function saveMasterProfile(profile) {
    const validation = validateProfile(profile);
    if (!validation.isValid) {
        throw new Error(`Invalid profile: ${validation.errors.join(', ')}`);
    }
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        await chrome.storage.local.set({ [STORAGE_KEYS.MASTER_PROFILE]: profile });
    }
    else if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEYS.MASTER_PROFILE, JSON.stringify(profile));
    }
}
export async function getMasterProfile() {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        const data = await chrome.storage.local.get(STORAGE_KEYS.MASTER_PROFILE);
        return data[STORAGE_KEYS.MASTER_PROFILE] || null;
    }
    else if (typeof localStorage !== 'undefined') {
        const data = localStorage.getItem(STORAGE_KEYS.MASTER_PROFILE);
        return data ? JSON.parse(data) : null;
    }
    return null;
}
export async function clearMasterProfile() {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        await chrome.storage.local.remove(STORAGE_KEYS.MASTER_PROFILE);
    }
    else if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(STORAGE_KEYS.MASTER_PROFILE);
    }
}
export async function saveSettings(settings) {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        await chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: settings });
    }
    else if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    }
}
export async function getSettings() {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        const data = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
        return data[STORAGE_KEYS.SETTINGS] || null;
    }
    else if (typeof localStorage !== 'undefined') {
        const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
        return data ? JSON.parse(data) : null;
    }
    return null;
}
