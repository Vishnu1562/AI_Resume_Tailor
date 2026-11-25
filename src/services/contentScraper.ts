import type { JobContext } from '../types/index.js';

export const BLOCKED_DOMAINS = [
  /google\.[a-z.]+\/search/i,
  /bing\.com\/search/i,
  /duckduckgo\.com/i,
  /search\.yahoo\.com/i,
  /ecosia\.org/i,
  /youtube\.com/i,
  /wikipedia\.org/i,
  /reddit\.com/i,
  /twitter\.com/i,
  /x\.com/i,
  /facebook\.com/i,
  /instagram\.com/i,
  /tiktok\.com/i,
  /netflix\.com/i,
  /imdb\.com/i,
];

export const ATS_DOMAINS = [
  /greenhouse\.io/i,
  /lever\.co/i,
  /workdayjobs\.com/i,
  /ashbyhq\.com/i,
  /ukg\.com/i,
  /icims\.com/i,
  /smartrecruiters\.com/i,
  /bamboohr\.com/i,
  /jobvite\.com/i,
  /taleo\.net/i,
  /breezy\.hr/i,
  /jazzhr\.com/i,
  /workable\.com/i,
  /linkedin\.com\/jobs/i,
  /indeed\.com/i,
  /glassdoor\.com/i,
  /careers?\./i,
  /\/jobs?\//i,
  /\/careers?\//i,
];

export const JOB_KEYWORDS = [
  /\bresponsibilities\b/i,
  /\bqualifications\b/i,
  /\brequirements\b/i,
  /\bexperience\b/i,
  /\babout the (role|job|position)\b/i,
  /\bwhat you('ll| will) do\b/i,
  /\bskills\b/i,
  /\bapply\b/i,
  /\bbenefits\b/i,
  /\bjob description\b/i,
  /\bpreferred qualifications\b/i,
  /\bminimum qualifications\b/i,
  /\bkey responsibilities\b/i,
  /\brole overview\b/i,
  /\bequal opportunity\b/i,
];

export function isLikelyJobPage(text: string, url: string = '', hasJobSelectors: boolean = false): boolean {
  if (url) {
    for (const pattern of BLOCKED_DOMAINS) {
      if (pattern.test(url)) return false;
    }
    for (const pattern of ATS_DOMAINS) {
      if (pattern.test(url) && text.length >= 80) return true;
    }
  }

  // If explicit job container selectors matched on a non-blocked page
  if (hasJobSelectors && text.length >= 80) {
    return true;
  }

  // Keyword check: requires at least 2 distinct job signals
  let keywordHits = 0;
  for (const pattern of JOB_KEYWORDS) {
    if (pattern.test(text)) {
      keywordHits++;
      if (keywordHits >= 2) break;
    }
  }

  return keywordHits >= 2 && text.length >= 80;
}

export function sanitizeJobContent(text: string, maxLength: number = 6000): string {
  if (!text) return '';

  let cleaned = text
    .replace(/[ \t]+/g, ' ')
    .replace(/(\r\n|\n|\r){3,}/g, '\n\n')
    .trim();

  if (cleaned.length > maxLength) {
    const suffix = '... [truncated]';
    cleaned = cleaned.slice(0, Math.max(0, maxLength - suffix.length)) + suffix;
  }

  return cleaned;
}

export const JOB_PLATFORM_DOMAINS = [
  'linkedin.com',
  'indeed.com',
  'glassdoor.com',
  'monster.com',
  'ziprecruiter.com',
  'simplyhired.com',
  'careerbuilder.com',
];

export const GENERIC_TITLE_BLACKLIST = [
  /^\(?\d*\)?\s*notifications?$/i,
  /^notifications?$/i,
  /^search\s+results?$/i,
  /^home$/i,
  /^feed$/i,
  /^single\s+position$/i,
  /^job\s+details?$/i,
  /^job\s+search$/i,
  /^sign\s+in$/i,
  /^log\s+in$/i,
  /^view\s+all\s+jobs$/i,
  /^careers?$/i,
  /^jobs?$/i,
  /^my\s+network$/i,
  /^messaging$/i,
];

export function isGenericTitle(str: string): boolean {
  const clean = str.trim();
  if (clean.length < 2) return true;
  return GENERIC_TITLE_BLACKLIST.some((regex) => regex.test(clean));
}

export function extractCompanyFromUrl(url: string): string {
  if (!url) return '';
  for (const pattern of BLOCKED_DOMAINS) {
    if (pattern.test(url)) return '';
  }
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();

    // Do not return generic job boards as the employer
    if (JOB_PLATFORM_DOMAINS.some((d) => host.includes(d))) {
      return '';
    }

    // Specific ATS platform host matchers
    if (host.includes('ukg.com')) return 'UKG';
    if (host.includes('workdayjobs.com')) {
      const match = host.match(/^([a-z0-9_-]+)\.wd\d*\.myworkdayjobs\.com/);
      if (match) return capitalize(match[1]);
    }
    if (host.includes('greenhouse.io')) {
      const parts = parsed.pathname.split('/').filter(Boolean);
      if (parts[0]) return capitalize(parts[0]);
    }
    if (host.includes('lever.co')) {
      const parts = parsed.pathname.split('/').filter(Boolean);
      if (parts[0]) return capitalize(parts[0]);
    }
    if (host.includes('ashbyhq.com')) {
      const parts = parsed.pathname.split('/').filter(Boolean);
      if (parts[0]) return capitalize(parts[0]);
    }

    // Generic domain extraction (e.g. careers.netflix.com -> Netflix)
    const hostParts = host.replace(/^(apply\.|careers?\.|jobs?\.|www\.)/, '').split('.');
    if (hostParts.length > 0 && hostParts[0].length >= 2) {
      return capitalize(hostParts[0]);
    }
  } catch {
    // Ignore URL parse failures
  }
  return '';
}

function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function extractJobDetails(doc: Document = document, url: string = ''): JobContext {
  const currentUrl = url || (typeof window !== 'undefined' ? window.location?.href || '' : '');

  // 1. Job Title Extraction
  const titleSelectors = [
    '.job-details-jobs-unified-top-card__job-title',
    '.jobs-unified-top-card__job-title',
    'h1.top-card-layout__title',
    'h1.job-title',
    'h1.topcard__title',
    'h1.app-title',
    '.jobsearch-JobInfoHeader-title',
    '[data-automation="job-title"]',
    '[data-automation*="title" i]',
    '[class*="job-title" i]',
    '[class*="jobTitle" i]',
    '[class*="position-title" i]',
    'h1.t-24',
    'h1',
    'h2.job-title',
  ];

  let title = '';
  for (const sel of titleSelectors) {
    const el = doc.querySelector(sel);
    if (el && el.textContent?.trim() && el.textContent.trim().length >= 3) {
      const candidate = el.textContent.trim();
      if (!isGenericTitle(candidate)) {
        title = candidate;
        break;
      }
    }
  }

  // Fallback title from document title
  if (!title && doc.title) {
    const cleanedDocTitle = doc.title.replace(/^\(\d+\)\s*/, '');
    const titleParts = cleanedDocTitle.split(/[-|•–—]/);
    for (const part of titleParts) {
      const trimmed = part.trim();
      if (
        trimmed.length >= 3 &&
        !isGenericTitle(trimmed) &&
        !/^(linkedin|indeed|glassdoor|google|monster|ziprecruiter)$/i.test(trimmed)
      ) {
        title = trimmed;
        break;
      }
    }
  }

  // 2. Company Name Extraction
  const companySelectors = [
    '.job-details-jobs-unified-top-card__company-name',
    '.jobs-unified-top-card__company-name',
    '.topcard__flavor--black-link',
    '.topcard__flavor',
    '.company-name',
    'a[href*="/company/"]',
    '.app-company',
    '[data-automation="job-company"]',
    '[data-automation*="company" i]',
    '.employer',
    '[data-company-name="true"]',
    '[class*="company-name" i]',
    '[class*="companyName" i]',
    '[class*="employer" i]',
  ];

  let company = '';
  for (const sel of companySelectors) {
    const el = doc.querySelector(sel);
    if (el && el.textContent?.trim()) {
      const candidate = el.textContent.trim();
      if (!/^(linkedin|indeed|glassdoor)$/i.test(candidate)) {
        company = candidate;
        break;
      }
    }
  }

  // Meta tag company checks
  if (!company) {
    const ogSite = doc.querySelector('meta[property="og:site_name"]')?.getAttribute('content');
    if (ogSite?.trim() && !/^(linkedin|indeed|glassdoor)$/i.test(ogSite.trim())) {
      company = ogSite.trim();
    }
  }

  // Document title company checks (e.g. "Careers at UKG" or "PowerApps Developer | Capgemini | LinkedIn")
  if (!company && doc.title) {
    const atMatch = doc.title.match(/(?:at|@)\s+([A-Za-z0-9\s&]+?)(?:\s*[-|•–—]|$)/i);
    if (atMatch && atMatch[1].trim().length >= 2 && !/^(linkedin|indeed|glassdoor)$/i.test(atMatch[1].trim())) {
      company = atMatch[1].trim();
    } else {
      const cleanedDocTitle = doc.title.replace(/^\(\d+\)\s*/, '');
      const titleParts = cleanedDocTitle.split(/[-|•–—]/).map((p) => p.trim());
      for (const p of titleParts) {
        if (p.length >= 2 && p !== title && !isGenericTitle(p) && !/^(linkedin|indeed|glassdoor)$/i.test(p)) {
          company = p;
          break;
        }
      }
    }
  }

  // URL fallback company check
  if (!company && currentUrl) {
    company = extractCompanyFromUrl(currentUrl);
  }

  // 3. Job Description Extraction
  const descSelectors = [
    '.jobs-description__content',
    '.jobs-box__html-content',
    '.jobs-description',
    '.job-description',
    '#job-details',
    '.description__text',
    '[data-automation="job-description"]',
    '[data-automation*="description" i]',
    '[itemprop="description"]',
    '.jobsearch-jobDescriptionText',
    '[class*="job-description" i]',
    '[class*="jobDescription" i]',
    '[id*="job-description" i]',
    '[id*="jobDescription" i]',
    '[class*="job-detail" i]',
    'article',
    'main',
    '[role="main"]',
  ];

  let hasJobSelectors = false;
  let rawDesc = '';
  for (const sel of descSelectors) {
    const el = doc.querySelector(sel) as HTMLElement;
    const text = el?.innerText?.trim() || el?.textContent?.trim() || '';
    if (el && text.length > 100) {
      rawDesc = text;
      hasJobSelectors = true;
      break;
    }
  }

  // Fallback: Scan divs to find container with highest word density
  if (!rawDesc) {
    const containers = doc.querySelectorAll('div, section');
    let maxWords = 0;
    let bestBlock = '';

    containers.forEach((c) => {
      const text = (c as HTMLElement).innerText?.trim() || (c as HTMLElement).textContent?.trim() || '';
      const wordCount = text.split(/\s+/).length;
      if (wordCount > maxWords && wordCount < 5000) {
        maxWords = wordCount;
        bestBlock = text;
      }
    });

    if (bestBlock.length > 150) {
      rawDesc = bestBlock;
    }
  }

  // Absolute fallback: body
  if (!rawDesc && doc.body) {
    rawDesc = doc.body.innerText?.trim() || doc.body.textContent?.trim() || '';
  }

  const sanitized = sanitizeJobContent(rawDesc);
  const isDetected = isLikelyJobPage(sanitized, currentUrl, hasJobSelectors);

  if (!isDetected) {
    return {
      title: '',
      company: '',
      description: '',
      url: currentUrl,
      isDetected: false,
    };
  }

  return {
    title: title || 'Target Role',
    company: company || 'Target Company',
    description: sanitized,
    url: currentUrl,
    isDetected: true,
  };
}
