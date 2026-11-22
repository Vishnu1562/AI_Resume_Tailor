import { describe, it, expect } from 'vitest';
import { parseResumeTextToProfile } from '../src/services/resumeParser';

describe('Resume Parser (HF-001, NF-005, EC-002)', () => {
  it('HF-001: parses raw resume text into structured MasterProfile', () => {
    const rawText = `
Alex Morgan
San Francisco, CA | +1 (555) 019-2834 | alex.morgan@example.com | linkedin.com/in/alex-morgan-sample | github.com/alex-morgan-sample

PROFESSIONAL SUMMARY
Software Developer with 4+ years experience in C# .NET, Angular, NestJS, and Clean Architecture.

TECHNICAL SKILLS
Languages: C#, TypeScript, JavaScript, SQL
Frameworks: ASP.NET Core, Angular, NestJS, Node.js

PROFESSIONAL EXPERIENCE
Senior Software Engineer | TechCorp Solutions
Jan 2022 – Present | San Francisco, CA
• Built enterprise RESTful APIs in C# ASP.NET Core
• Developed responsive client SPAs in Angular

PERSONAL PROJECTS
Workflow Platform | NestJS, Angular, PostgreSQL
• Full-stack tournament management platform

EDUCATION
B.S. in Computer Science | State University | 2017 – 2021

CERTIFICATIONS
AWS Certified Solutions Architect
    `;

    const profile = parseResumeTextToProfile(rawText);

    expect(profile.personalInfo.fullName).toBe('Alex Morgan');
    expect(profile.personalInfo.email).toBe('alex.morgan@example.com');
    expect(profile.personalInfo.phone).toBe('+1 (555) 019-2834');
    expect(profile.summary).toContain('Software Developer with 4+ years experience');
    expect(profile.experience.length).toBeGreaterThanOrEqual(1);
    expect(profile.experience[0].company).toContain('TechCorp');
    expect(profile.experience[0].role).toContain('Senior Software Engineer');
    expect(profile.skills).toBeDefined();
    expect(profile.education.length).toBeGreaterThanOrEqual(1);
    expect(profile.education[0].institution).toContain('State University');
  });

  it('NF-005: handles empty or invalid text safely', () => {
    const profile = parseResumeTextToProfile('');
    expect(profile.personalInfo.fullName).toBe('');
    expect(profile.experience).toHaveLength(0);
  });
});
