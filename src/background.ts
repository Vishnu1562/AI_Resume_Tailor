// Background service worker for AI Resume Tailor Chrome Extension (Manifest V3)

chrome.sidePanel
  ?.setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error: unknown) => console.error('Failed to set side panel behavior:', error));

chrome.runtime.onInstalled.addListener(() => {
  console.log('AI Resume Tailor extension installed successfully.');
});
