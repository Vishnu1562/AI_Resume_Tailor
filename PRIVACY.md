# Privacy Policy for AI Resume Tailor - ATS Optimizer

**Last Updated:** November 27, 2026

## 1. Overview
**AI Resume Tailor - ATS Optimizer** is an open-source, privacy-first Google Chrome extension designed to assist job seekers by tailoring their resumes to job descriptions using free AI models (such as Google Gemini Flash and Groq Llama 3.3).

Your privacy is our primary priority. The extension does **not** collect, store, sell, or track your personal data on any developer-owned or third-party servers.

---

## 2. Data Collection and Storage

### A. Local Browser Storage
All user data remains **100% on your local machine**:
- **Master Profile Data**: Your contact info, work history, skills, and education are stored locally in Chrome's sandboxed storage (`chrome.storage.local`).
- **API Keys**: Your personal Google AI Studio or Groq API keys are stored solely in your local browser storage.
- **Job Descriptions & Tailored Resumes**: Scanned job descriptions and generated resumes exist only in your local session and browser storage.

### B. No Developer Servers
We operate **no external servers, databases, or analytics services**. The developer cannot view, access, or intercept your resumes, job applications, or API keys.

---

## 3. Third-Party AI Services

When you click **"Tailor Resume with AI"**, the extension communicates directly from your browser to your chosen AI provider:
- **Google Gemini API** (`generativelanguage.googleapis.com`): Governed by [Google Cloud / Gemini API Terms of Service](https://ai.google.dev/gemini-api/terms).
- **Groq API** (`api.groq.com`): Governed by [Groq Terms of Service & Privacy](https://groq.com/privacy-policy/).

Your resume text and job description are transmitted directly to the API endpoint using your own personal API key over secure HTTPS. No third-party intermediaries receive this data.

---

## 4. Permissions Usage

- **`storage`**: Used to save your profile, tailored resumes, and settings locally on your computer.
- **`activeTab` & `scripting`**: Used only when you click **"Scan Tab"** to read the text of the job posting currently visible in your active browser tab. The extension never runs background scraping without user action.
- **`sidePanel`**: Used to display the extension's user interface docked next to your job browsing tab.
- **`host_permissions` (`<all_urls>`)**: Job listings exist across thousands of diverse corporate career domains and ATS portals (Workday, Greenhouse, Lever, LinkedIn, Indeed, etc.). This permission allows the extension to extract job text when explicitly requested by you.

---

## 5. Data Sharing & Disclosure
- We do **not** sell, rent, or monetize your personal information.
- We do **not** use your data for advertising, creditworthiness, or consumer profiling.
- We do **not** transfer your data to any third party other than the AI provider you explicitly configure.

---

## 6. Open Source Verification
This extension is fully open source. You can audit the entire codebase and network behavior on GitHub:
[https://github.com/Vishnu1562/AI_Resume_Tailor](https://github.com/Vishnu1562/AI_Resume_Tailor)

---

## 7. Contact
If you have questions regarding this Privacy Policy or the extension, please open an issue on GitHub:
[https://github.com/Vishnu1562/AI_Resume_Tailor/issues](https://github.com/Vishnu1562/AI_Resume_Tailor/issues)
