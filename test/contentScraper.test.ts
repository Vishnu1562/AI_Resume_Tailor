import { describe, it, expect } from 'vitest';
import { extractJobDetails, sanitizeJobContent } from '../src/services/contentScraper';

describe('Content Scraper (HF-003, NF-003, EC-001, EC-002)', () => {
  it('HF-003: extracts job details from structured DOM elements', () => {
    document.body.innerHTML = `
      <main>
        <h1 class="job-title">Senior Full Stack Engineer</h1>
        <div class="company-name">Acme Innovations Inc.</div>
        <div class="location">Remote - India</div>
        <div class="job-description">
          <h2>About the Role</h2>
          <p>We are looking for an experienced developer with C#, .NET 8, and Angular.</p>
          <h3>Requirements:</h3>
          <ul>
            <li>3+ years in enterprise software development</li>
            <li>Strong proficiency in TypeScript and Clean Architecture</li>
          </ul>
        </div>
      </main>
    `;

    const details = extractJobDetails(document);
    expect(details.title).toBe('Senior Full Stack Engineer');
    expect(details.company).toContain('Acme Innovations');
    expect(details.description).toContain('C#, .NET 8, and Angular');
    expect(details.description).toContain('Clean Architecture');
    expect(details.isDetected).toBe(true);
  });

  it('NF-003: returns isDetected=false on empty or non-job pages', () => {
    document.body.innerHTML = `
      <div>
        <p>Welcome to our homepage! Click here to learn more.</p>
      </div>
    `;

    const details = extractJobDetails(document);
    expect(details.isDetected).toBe(false);
    expect(details.description.length).toBeLessThan(100);
  });

  it('EC-001: sanitizes and truncates huge boilerplate text without losing requirements', () => {
    const hugeText = 'Job Requirements: Must know TypeScript, .NET Core, SQL. ' + 'Equal Opportunity Employer Disclaimer '.repeat(1000);
    const sanitized = sanitizeJobContent(hugeText, 3000);
    expect(sanitized.length).toBeLessThanOrEqual(3000);
    expect(sanitized).toContain('TypeScript, .NET Core, SQL');
  });

  it('EC-002: preserves unicode and bullet characters without corruption', () => {
    const unicodeText = 'Responsibilities:\n• Build high-throughput APIs\n– Maintain 99.9% uptime\n— Deploy via CI/CD 🚀';
    const sanitized = sanitizeJobContent(unicodeText);
    expect(sanitized).toContain('Build high-throughput APIs');
    expect(sanitized).toContain('Maintain 99.9% uptime');
  });
});
