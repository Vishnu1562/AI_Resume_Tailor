import { describe, it, expect } from 'vitest';
import { renderAtsHtml, formatAsMarkdown } from '../src/services/atsPdfRenderer';
import type { TailoredResume, MasterProfile } from '../src/types';

describe('ATS PDF & Markdown Renderer (HF-006, HF-007)', () => {
  const baseProfile: MasterProfile = {
    personalInfo: {
      fullName: 'Alex Morgan',
      email: 'alex.morgan@example.com',
      phone: '+1 (555) 019-2834',
      location: 'San Francisco, CA',
      linkedin: 'https://linkedin.com/in/alex-morgan-sample',
      github: 'https://github.com/alex-morgan-sample',
    },
    summary: 'Software Developer with 4+ years experience...',
    experience: [],
    skills: {},
    projects: [],
    education: [
      {
        degree: 'B.S. in Computer Science',
        institution: 'State University',
        year: '2017 – 2021',
      },
    ],
    certifications: ['AWS Certified Solutions Architect'],
  };

  const tailored: TailoredResume = {
    jobTitle: 'Software Developer 2',
    company: 'EnterpriseCorp',
    matchScore: 94,
    matchedSkills: ['C#', '.NET 8', 'Angular', 'Clean Architecture'],
    missingKeywords: ['Docker'],
    tailoredSummary: 'Enterprise Software Developer with 4+ years experience...',
    prioritizedSkills: {
      'Languages & Frameworks': ['C#', 'ASP.NET Core (.NET 8)', 'Angular', 'TypeScript'],
      'Architecture & DB': ['Clean Architecture', 'OOP', 'SQL Server'],
    },
    experience: [
      {
        company: 'TechCorp Solutions',
        role: 'Senior Software Engineer',
        location: 'San Francisco, CA',
        period: 'Jan 2022 – Present',
        bullets: ['Engineered high-throughput RESTful Web APIs using C# and ASP.NET Core'],
      },
    ],
    projects: [
      {
        name: 'Workflow Platform',
        techStack: 'Node.js, TypeScript, PostgreSQL',
        bullets: ['Full-stack platform with clean database modeling'],
      },
    ],
    education: baseProfile.education,
    certifications: baseProfile.certifications,
  };

  it('HF-006: renders clean, semantic, ATS-compliant single-page HTML', () => {
    const html = renderAtsHtml(tailored, baseProfile.personalInfo);

    // ATS essentials
    expect(html).toContain('Alex Morgan');
    expect(html).toContain('+1 (555) 019-2834');
    expect(html).toContain('alex.morgan@example.com');
    expect(html).toContain('EnterpriseCorp');
    expect(html).toContain('PROFESSIONAL SUMMARY');
    expect(html).toContain('TECHNICAL SKILLS');
    expect(html).toContain('PROFESSIONAL EXPERIENCE');
    expect(html).toContain('PERSONAL PROJECTS');
    expect(html).toContain('EDUCATION');
    expect(html).toContain('CERTIFICATIONS');

    // Layout check: printable styles
    expect(html).toContain('@media print');
    expect(html).toContain('font-family');
  });

  it('HF-007: formats tailored resume into GitHub Flavored Markdown', () => {
    const md = formatAsMarkdown(tailored, baseProfile.personalInfo);

    expect(md).toContain('# Alex Morgan');
    expect(md).toContain('## PROFESSIONAL SUMMARY');
    expect(md).toContain('## TECHNICAL SKILLS');
    expect(md).toContain('## PROFESSIONAL EXPERIENCE');
    expect(md).toContain('### **Senior Software Engineer** | **TechCorp Solutions**');
    expect(md).toContain('* Engineered high-throughput RESTful Web APIs');
    expect(md).toContain('## EDUCATION');
  });
});
