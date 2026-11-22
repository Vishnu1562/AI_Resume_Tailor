export function cleanCandidateName(rawLine) {
    if (!rawLine)
        return '';
    let name = rawLine.replace(/^#+\s*/, '').trim();
    // Strip anything following pipes, bullets, dashes, or common role titles
    const roleKeywords = [
        'software',
        'developer',
        'engineer',
        'consultant',
        'architect',
        'full-stack',
        'full stack',
        'backend',
        'frontend',
        'lead',
        'manager',
    ];
    // If there are delimiters like | or • or -
    const delimiterMatch = name.split(/\s*[\u2022|•–—\t]\s*/);
    if (delimiterMatch.length > 1 && delimiterMatch[0].trim().length >= 2) {
        name = delimiterMatch[0].trim();
    }
    // If role keywords are glued to the name, strip them
    for (const kw of roleKeywords) {
        const regex = new RegExp(`\\b${kw}\\b.*$`, 'i');
        if (regex.test(name)) {
            const candidatePart = name.replace(regex, '').trim();
            if (candidatePart.length >= 2) {
                name = candidatePart;
                break;
            }
        }
    }
    return name.trim();
}
export function extractLocationFromText(text) {
    // Matches "City, State, Country" or "City, Country" or "City, State"
    const locationMatch = text.match(/\b([A-Za-z\s]{2,25},\s*[A-Za-z\s]{2,25}(?:,\s*[A-Za-z\s]{2,25})?)\b/);
    if (locationMatch) {
        const loc = locationMatch[1].trim();
        // Exclude false positives like "Object-Oriented Programming, SOLID"
        if (!loc.includes('Programming') && !loc.includes('Architecture') && !loc.includes('Framework')) {
            return loc;
        }
    }
    return '';
}
export function parseResumeTextToProfile(rawText) {
    const emptyProfile = {
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
    if (lines.length === 0)
        return emptyProfile;
    // 1. Extract Name cleanly from first non-empty line
    emptyProfile.personalInfo.fullName = cleanCandidateName(lines[0]);
    // 2. Extract Contact Info via regex across full document
    const fullText = lines.join('\n');
    const emailMatch = fullText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if (emailMatch)
        emptyProfile.personalInfo.email = emailMatch[0];
    const phoneMatch = fullText.match(/(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4,6}/);
    if (phoneMatch)
        emptyProfile.personalInfo.phone = phoneMatch[0].trim();
    const linkedinMatch = fullText.match(/linkedin\.com\/in\/[a-zA-Z0-9_-]+/i);
    if (linkedinMatch)
        emptyProfile.personalInfo.linkedin = `https://${linkedinMatch[0]}`;
    const githubMatch = fullText.match(/github\.com\/[a-zA-Z0-9_-]+/i);
    if (githubMatch)
        emptyProfile.personalInfo.github = `https://${githubMatch[0]}`;
    // 3. Extract Location
    const contactHeaderBlock = lines.slice(0, 5).join(' ');
    emptyProfile.personalInfo.location = extractLocationFromText(contactHeaderBlock);
    // 4. Robust Section Parser
    let currentSection = '';
    let currentExp = null;
    let currentProj = null;
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        const upper = line.toUpperCase().replace(/^#+\s*/, '').replace(/[:*_\-•–—]/g, '').trim();
        const isShortHeader = line.length <= 50;
        // Detect Section Headers
        if (isShortHeader && /^(PROFESSIONAL\s+|EXECUTIVE\s+)?(SUMMARY|OBJECTIVE|ABOUT\s+ME|PROFILE)$/i.test(upper)) {
            currentSection = 'SUMMARY';
            continue;
        }
        else if (isShortHeader && /^(TECHNICAL\s+|CORE\s+|KEY\s+)?SKILLS?$/i.test(upper)) {
            currentSection = 'SKILLS';
            continue;
        }
        else if (isShortHeader && /^(PROFESSIONAL\s+|WORK\s+|CAREER\s+)?(EXPERIENCE|HISTORY|EMPLOYMENT)$/i.test(upper)) {
            currentSection = 'EXPERIENCE';
            continue;
        }
        else if (isShortHeader && /^(PERSONAL\s+|KEY\s+|NOTABLE\s+)?PROJECTS?$/i.test(upper)) {
            currentSection = 'PROJECTS';
            continue;
        }
        else if (isShortHeader && /^(EDUCATION|ACADEMICS|QUALIFICATIONS)$/i.test(upper)) {
            currentSection = 'EDUCATION';
            continue;
        }
        else if (isShortHeader && /^(CERTIFICATIONS?|CERTIFICATES?|LICENSES?)$/i.test(upper)) {
            currentSection = 'CERTIFICATIONS';
            continue;
        }
        else if (isShortHeader && /^(HONORS|AWARDS|ACHIEVEMENTS)$/i.test(upper)) {
            currentSection = 'HONORS';
            continue;
        }
        // Process Content within Sections
        if (currentSection === 'SUMMARY') {
            emptyProfile.summary += (emptyProfile.summary ? ' ' : '') + line;
        }
        else if (currentSection === 'SKILLS') {
            const parts = line.split(/:\s*/);
            if (parts.length === 2) {
                const cat = parts[0].replace(/^[*•\-\u2022\u25cf]\s*/, '').trim();
                const list = parts[1].split(/,\s*/).map((s) => s.trim()).filter(Boolean);
                emptyProfile.skills[cat] = list;
            }
            else {
                const list = line.split(/,\s*/).map((s) => s.replace(/^[*•\-\u2022\u25cf]\s*/, '').trim()).filter(Boolean);
                if (list.length > 0) {
                    emptyProfile.skills['Technical Skills'] = [
                        ...(emptyProfile.skills['Technical Skills'] || []),
                        ...list,
                    ];
                }
            }
        }
        else if (currentSection === 'EXPERIENCE') {
            const isBullet = /^[*•\-\u2022\u25cf]/.test(line);
            if (isBullet) {
                const bullet = line.replace(/^[*•\-\u2022\u25cf]\s*/, '').trim();
                if (currentExp) {
                    currentExp.bullets.push(bullet);
                }
                else {
                    currentExp = { company: 'Company', role: 'Software Engineer', bullets: [bullet] };
                    emptyProfile.experience.push(currentExp);
                }
            }
            else {
                // Experience header line (e.g. Role | Company | Dates)
                const parts = line.split(/\||–|—/).map((s) => s.trim());
                currentExp = {
                    role: parts[0] || 'Software Engineer',
                    company: parts[1] || 'Company',
                    period: parts[2] || '',
                    bullets: [],
                };
                emptyProfile.experience.push(currentExp);
            }
        }
        else if (currentSection === 'PROJECTS') {
            const isBullet = /^[*•\-\u2022\u25cf]/.test(line);
            if (isBullet) {
                const bullet = line.replace(/^[*•\-\u2022\u25cf]\s*/, '').trim();
                if (currentProj) {
                    currentProj.bullets.push(bullet);
                }
                else {
                    currentProj = { name: 'Project', bullets: [bullet] };
                    emptyProfile.projects.push(currentProj);
                }
            }
            else {
                const parts = line.split(/\||–|—/).map((s) => s.trim());
                currentProj = {
                    name: parts[0] || 'Project',
                    techStack: parts[1] || '',
                    bullets: [],
                };
                emptyProfile.projects.push(currentProj);
            }
        }
        else if (currentSection === 'EDUCATION') {
            const parts = line.split(/\||–|—/).map((s) => s.trim());
            emptyProfile.education.push({
                degree: parts[0] || line,
                institution: parts[1] || '',
                year: parts[2] || '',
            });
        }
        else if (currentSection === 'CERTIFICATIONS') {
            const cert = line.replace(/^[*•\-\u2022\u25cf]\s*/, '').trim();
            if (cert)
                emptyProfile.certifications?.push(cert);
        }
        else if (currentSection === 'HONORS') {
            const honor = line.replace(/^[*•\-\u2022\u25cf]\s*/, '').trim();
            if (honor)
                emptyProfile.honors?.push(honor);
        }
    }
    return emptyProfile;
}
