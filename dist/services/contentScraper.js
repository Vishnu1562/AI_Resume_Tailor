export function sanitizeJobContent(text, maxLength = 6000) {
    if (!text)
        return '';
    // Clean excessive spaces, tabs, and duplicate blank lines while preserving bullets
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
export function extractJobDetails(doc = document) {
    // Strategy 1: Common Job Board Selectors
    const titleSelectors = [
        'h1.job-title',
        'h1.topcard__title',
        'h1.app-title',
        '.jobsearch-JobInfoHeader-title',
        '[data-automation="job-title"]',
        'h1',
    ];
    let title = '';
    for (const sel of titleSelectors) {
        const el = doc.querySelector(sel);
        if (el && el.textContent?.trim()) {
            title = el.textContent.trim();
            break;
        }
    }
    const companySelectors = [
        '.company-name',
        '.topcard__flavor--black-link',
        '.app-company',
        '[data-automation="job-company"]',
        '.employer',
        '[data-company-name="true"]',
    ];
    let company = '';
    for (const sel of companySelectors) {
        const el = doc.querySelector(sel);
        if (el && el.textContent?.trim()) {
            company = el.textContent.trim();
            break;
        }
    }
    // Description Selectors
    const descSelectors = [
        '.job-description',
        '#job-details',
        '.description__text',
        '[data-automation="job-description"]',
        '.jobsearch-jobDescriptionText',
        'article',
        'main',
    ];
    let rawDesc = '';
    for (const sel of descSelectors) {
        const el = doc.querySelector(sel);
        if (el && el.textContent && el.textContent.trim().length > 100) {
            rawDesc = el.textContent.trim();
            break;
        }
    }
    if (!rawDesc && doc.body) {
        rawDesc = doc.body.textContent?.trim() || '';
    }
    const sanitized = sanitizeJobContent(rawDesc);
    const isDetected = sanitized.length >= 100 && (title.length > 0 || company.length > 0);
    return {
        title: title || 'Target Role',
        company: company || 'Target Company',
        description: sanitized,
        isDetected,
    };
}
