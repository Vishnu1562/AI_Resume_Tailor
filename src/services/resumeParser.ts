import type { MasterProfile } from '../types/index.js';

export function parseResumeTextToProfile(rawText: string): MasterProfile {
  const emptyProfile: MasterProfile = {
    personalInfo: {
      fullName: '',
      email: '',
      phone: '',
      location: '',
      linkedin: '',
      github: '',
    },
    summary: '',
    experience: [],
    skills: {},
    projects: [],
    education: [],
    certifications: [],
    honors: [],
  };

  if (!rawText || !rawText.trim()) {
    return emptyProfile;
  }

  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) return emptyProfile;

  // 1. Extract Name (usually first non-empty line)
  const nameLine = lines[0].replace(/^#+\s*/, '');
  emptyProfile.personalInfo.fullName = nameLine;

  // 2. Extract Contact Info via regex
  const fullText = lines.join('\n');
  const emailMatch = fullText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (emailMatch) emptyProfile.personalInfo.email = emailMatch[0];

  const phoneMatch = fullText.match(/(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4,6}/);
  if (phoneMatch) emptyProfile.personalInfo.phone = phoneMatch[0].trim();

  const linkedinMatch = fullText.match(/linkedin\.com\/in\/[a-zA-Z0-9_-]+/i);
  if (linkedinMatch) emptyProfile.personalInfo.linkedin = `https://${linkedinMatch[0]}`;

  const githubMatch = fullText.match(/github\.com\/[a-zA-Z0-9_-]+/i);
  if (githubMatch) emptyProfile.personalInfo.github = `https://${githubMatch[0]}`;

  // 3. Section splitter
  let currentSection = '';
  let currentExp: any = null;
  let currentProj: any = null;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const upper = line.toUpperCase().replace(/^#+\s*/, '').replace(/[:*_-]/g, '').trim();

    const isShortHeader = line.length <= 40;

    if (isShortHeader && /^(PROFESSIONAL\s+)?(SUMMARY|OBJECTIVE|ABOUT\s+ME)$/i.test(upper)) {
      currentSection = 'SUMMARY';
      continue;
    } else if (isShortHeader && /^(TECHNICAL\s+|CORE\s+)?SKILLS?$/i.test(upper)) {
      currentSection = 'SKILLS';
      continue;
    } else if (isShortHeader && /^(PROFESSIONAL\s+|WORK\s+)?(EXPERIENCE|HISTORY|EMPLOYMENT)$/i.test(upper)) {
      currentSection = 'EXPERIENCE';
      continue;
    } else if (isShortHeader && /^(PERSONAL\s+|KEY\s+)?PROJECTS?$/i.test(upper)) {
      currentSection = 'PROJECTS';
      continue;
    } else if (isShortHeader && /^EDUCATION$/i.test(upper)) {
      currentSection = 'EDUCATION';
      continue;
    } else if (isShortHeader && /^(CERTIFICATIONS?|CERTIFICATES?|LICENSES?)$/i.test(upper)) {
      currentSection = 'CERTIFICATIONS';
      continue;
    }

    if (currentSection === 'SUMMARY') {
      emptyProfile.summary += (emptyProfile.summary ? ' ' : '') + line;
    } else if (currentSection === 'SKILLS') {
      const parts = line.split(/:\s*/);
      if (parts.length === 2) {
        const cat = parts[0].replace(/^[*•-]\s*/, '').trim();
        const list = parts[1].split(/,\s*/).map((s) => s.trim()).filter(Boolean);
        emptyProfile.skills[cat] = list;
      } else {
        const list = line.split(/,\s*/).map((s) => s.replace(/^[*•-]\s*/, '').trim()).filter(Boolean);
        if (list.length > 0) {
          emptyProfile.skills['General Skills'] = [
            ...(emptyProfile.skills['General Skills'] || []),
            ...list,
          ];
        }
      }
    } else if (currentSection === 'EXPERIENCE') {
      if (line.startsWith('•') || line.startsWith('*') || line.startsWith('-')) {
        const bullet = line.replace(/^[*•-]\s*/, '').trim();
        if (currentExp) {
          currentExp.bullets.push(bullet);
        } else {
          currentExp = { company: 'Company', role: 'Role', bullets: [bullet] };
          emptyProfile.experience.push(currentExp);
        }
      } else {
        // Experience header line
        const parts = line.split(/\||–|-/).map((s) => s.trim());
        currentExp = {
          role: parts[0] || 'Software Engineer',
          company: parts[1] || 'Company',
          period: parts[2] || '',
          bullets: [],
        };
        emptyProfile.experience.push(currentExp);
      }
    } else if (currentSection === 'PROJECTS') {
      if (line.startsWith('•') || line.startsWith('*') || line.startsWith('-')) {
        const bullet = line.replace(/^[*•-]\s*/, '').trim();
        if (currentProj) {
          currentProj.bullets.push(bullet);
        } else {
          currentProj = { name: 'Project', bullets: [bullet] };
          emptyProfile.projects.push(currentProj);
        }
      } else {
        const parts = line.split(/\|/).map((s) => s.trim());
        currentProj = {
          name: parts[0] || 'Project',
          techStack: parts[1] || '',
          bullets: [],
        };
        emptyProfile.projects.push(currentProj);
      }
    } else if (currentSection === 'EDUCATION') {
      const parts = line.split(/\||–/).map((s) => s.trim());
      emptyProfile.education.push({
        degree: parts[0] || line,
        institution: parts[1] || '',
        year: parts[2] || '',
      });
    } else if (currentSection === 'CERTIFICATIONS') {
      const cert = line.replace(/^[*•-]\s*/, '').trim();
      if (cert) emptyProfile.certifications?.push(cert);
    }
  }

  return emptyProfile;
}
