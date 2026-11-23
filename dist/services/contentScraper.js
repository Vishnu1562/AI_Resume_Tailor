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
export function isLikelyJobPage(text, url = '', hasJobSelectors = false) {
    if (url) {
        for (const pattern of BLOCKED_DOMAINS) {
            if (pattern.test(url))
                return false;
        }
        for (const pattern of ATS_DOMAINS) {
            if (pattern.test(url) && text.length >= 80)
                return true;
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
            if (keywordHits >= 2)
                break;
        }
    }
    return keywordHits >= 2 && text.length >= 80;
}
export function sanitizeJobContent(text, maxLength = 6000) {
    if (!text)
        return '';
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
export function extractCompanyFromUrl(url) {
    if (!url)
        return '';
    for (const pattern of BLOCKED_DOMAINS) {
        if (pattern.test(url))
            return '';
    }
    try {
        const parsed = new URL(url);
        const host = parsed.hostname.toLowerCase();
        // Specific ATS platform host matchers
        if (host.includes('ukg.com'))
            return 'UKG';
        if (host.includes('workdayjobs.com')) {
            const match = host.match(/^([a-z0-9_-]+)\.wd\d*\.myworkdayjobs\.com/);
            if (match)
                return capitalize(match[1]);
        }
        if (host.includes('greenhouse.io')) {
            const parts = parsed.pathname.split('/').filter(Boolean);
            if (parts[0])
                return capitalize(parts[0]);
        }
        if (host.includes('lever.co')) {
            const parts = parsed.pathname.split('/').filter(Boolean);
            if (parts[0])
                return capitalize(parts[0]);
        }
        if (host.includes('ashbyhq.com')) {
            const parts = parsed.pathname.split('/').filter(Boolean);
            if (parts[0])
                return capitalize(parts[0]);
        }
        // Generic domain extraction (e.g. careers.netflix.com -> Netflix)
        const hostParts = host.replace(/^(apply\.|careers?\.|jobs?\.|www\.)/, '').split('.');
        if (hostParts.length > 0 && hostParts[0].length >= 2) {
            return capitalize(hostParts[0]);
        }
    }
    catch {
        // Ignore URL parse failures
    }
    return '';
}
function capitalize(str) {
    if (!str)
        return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}
export function extractJobDetails(doc = document, url = '') {
    const currentUrl = url || (typeof window !== 'undefined' ? window.location?.href || '' : '');
    // 1. Job Title Extraction
    const titleSelectors = [
        'h1.job-title',
        'h1.topcard__title',
        'h1.app-title',
        '.jobsearch-JobInfoHeader-title',
        '[data-automation="job-title"]',
        '[data-automation*="title" i]',
        '[class*="job-title" i]',
        '[class*="jobTitle" i]',
        '[class*="position-title" i]',
        'h1',
        'h2.job-title',
    ];
    let title = '';
    for (const sel of titleSelectors) {
        const el = doc.querySelector(sel);
        if (el && el.textContent?.trim() && el.textContent.trim().length >= 3) {
            title = el.textContent.trim();
            break;
        }
    }
    // Fallback title from document title
    if (!title && doc.title) {
        const titleParts = doc.title.split(/[-|•–—]/);
        if (titleParts.length > 0 && titleParts[0].trim().length >= 3) {
            title = titleParts[0].trim();
        }
    }
    // 2. Company Name Extraction
    const companySelectors = [
        '.company-name',
        '.topcard__flavor--black-link',
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
            company = el.textContent.trim();
            break;
        }
    }
    // Meta tag company checks
    if (!company) {
        const ogSite = doc.querySelector('meta[property="og:site_name"]')?.getAttribute('content');
        if (ogSite?.trim()) {
            company = ogSite.trim();
        }
    }
    // Document title company checks (e.g. "Careers at UKG")
    if (!company && doc.title) {
        const atMatch = doc.title.match(/(?:at|@)\s+([A-Za-z0-9\s&]+?)(?:\s*[-|•–—]|$)/i);
        if (atMatch && atMatch[1].trim().length >= 2) {
            company = atMatch[1].trim();
        }
    }
    // URL fallback company check
    if (!company && currentUrl) {
        company = extractCompanyFromUrl(currentUrl);
    }
    // 3. Job Description Extraction
    const descSelectors = [
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
        const el = doc.querySelector(sel);
        if (el && el.innerText && el.innerText.trim().length > 100) {
            rawDesc = el.innerText.trim();
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
            const text = c.innerText?.trim() || '';
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
