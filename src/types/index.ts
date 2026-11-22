export interface PersonalInfo {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  linkedin?: string;
  github?: string;
  portfolio?: string;
}

export interface ExperienceEntry {
  company: string;
  role: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  bullets: string[];
}

export interface ProjectEntry {
  name: string;
  techStack?: string;
  link?: string;
  bullets: string[];
}

export interface EducationEntry {
  degree: string;
  institution: string;
  year?: string;
  location?: string;
}

export interface MasterProfile {
  personalInfo: PersonalInfo;
  summary: string;
  experience: ExperienceEntry[];
  skills: Record<string, string[]>;
  projects: ProjectEntry[];
  education: EducationEntry[];
  certifications?: string[];
  honors?: string[];
}

export interface ExtensionSettings {
  provider: 'gemini' | 'groq';
  apiKey: string;
  model: string;
}

export interface JobContext {
  title: string;
  company: string;
  description: string;
  url?: string;
  location?: string;
  isDetected?: boolean;
}

export interface TailoredExperience {
  company: string;
  role: string;
  location?: string;
  period?: string;
  bullets: string[];
}

export interface TailoredProject {
  name: string;
  techStack?: string;
  bullets: string[];
}

export interface TailoredResume {
  jobTitle: string;
  company: string;
  matchScore: number;
  matchedSkills: string[];
  missingKeywords: string[];
  tailoredSummary: string;
  prioritizedSkills: Record<string, string[]>;
  experience: TailoredExperience[];
  projects: TailoredProject[];
  education: EducationEntry[];
  certifications?: string[];
  honors?: string[];
}
