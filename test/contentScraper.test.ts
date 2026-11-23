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

  it('NF-011 & VR-003: suppresses job extraction on search engine pages (e.g. Google Search Before Sunrise)', () => {
    document.title = 'Before Sunrise - Google Search';
    document.body.innerHTML = `
      <div id="search">
        <h1>Search Results</h1>
        <div class="result">
          <h2>Before Sunrise (1995)</h2>
          <p>Ethan Hawke and Julie Delpy star in this romantic drama about two travelers who meet on a train in Europe.</p>
          <p>Rotten Tomatoes rating: 100%. Watch trailer on YouTube. Available on Amazon Prime Video.</p>
          ${'Additional search snippet content about actors, director Richard Linklater, reviews and showtimes. '.repeat(10)}
        </div>
      </div>
    `;

    const details = extractJobDetails(document, 'https://www.google.com/search?q=before+sunrise');
    expect(details.isDetected).toBe(false);
    expect(details.title).toBe('');
    expect(details.company).toBe('');
    expect(details.description).toBe('');
  });

  it('VR-003: suppresses job extraction on media and social platforms (YouTube, Wikipedia, Reddit, IMDb)', () => {
    document.title = 'Before Sunrise - Wikipedia';
    document.body.innerHTML = `
      <div id="content">
        <h1>Before Sunrise</h1>
        <p>Before Sunrise is a 1995 romantic drama film directed by Richard Linklater and co-written by Linklater and Kim Krizan.</p>
        <p>${'Plot summary, cast details, production information, and critical reception. '.repeat(15)}</p>
      </div>
    `;

    const details = extractJobDetails(document, 'https://en.wikipedia.org/wiki/Before_Sunrise');
    expect(details.isDetected).toBe(false);
    expect(details.title).toBe('');
    expect(details.company).toBe('');
  });

  it('VR-003: accepts genuine job postings on custom company domains when job keywords are present', () => {
    document.title = 'Backend Engineer - Stripe Careers';
    document.body.innerHTML = `
      <div>
        <h1>Backend Engineer, Core Infrastructure</h1>
        <p>Stripe is looking for a Software Engineer to join our team.</p>
        <h3>Responsibilities:</h3>
        <p>Design, build, and maintain high-throughput transaction processing systems with low latency.</p>
        <h3>Requirements & Qualifications:</h3>
        <p>Experience with distributed systems, Java or Go, SQL databases, and cloud architecture.</p>
        <p>Competitive benefits and equal opportunity employer.</p>
      </div>
    `;

    const details = extractJobDetails(document, 'https://stripe.com/jobs/backend-engineer-123');
    expect(details.isDetected).toBe(true);
    expect(details.title).toContain('Backend Engineer');
    expect(details.description).toContain('Responsibilities');
    expect(details.description).toContain('Qualifications');
  });

  it('VR-003: accepts job postings on verified ATS platforms (UKG, Workday, Greenhouse, Lever, Ashby)', () => {
    document.title = 'Software Engineer at UKG';
    document.body.innerHTML = `
      <div class="job-container">
        <h1>Software Engineer</h1>
        <div class="job-details">
          <p>Join UKG to build human capital management software.</p>
          <p>Key skills include Java, Spring Boot, microservices, and Agile methodologies.</p>
        </div>
      </div>
    `;

    const details = extractJobDetails(document, 'https://apply.ukg.com/careers/job/893398783398');
    expect(details.isDetected).toBe(true);
    expect(details.company).toBe('UKG');
  });
});
