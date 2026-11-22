import { extractJobDetails } from './services/contentScraper.js';
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'EXTRACT_JOB_DETAILS') {
        try {
            const details = extractJobDetails(document);
            sendResponse({ success: true, data: details });
        }
        catch (err) {
            sendResponse({ success: false, error: err.message });
        }
    }
    return true;
});
