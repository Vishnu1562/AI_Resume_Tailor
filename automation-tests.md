# Automation & Behavioral Test Specification: AI Resume Tailor (Chrome Extension)

## Feature Overview
AI Resume Tailor is a privacy-first, client-side Manifest V3 Chrome Extension operating in the Chrome Side Panel. It allows any job seeker to upload their existing resume (PDF, DOCX, or Text), structure it into a persistent Master Profile (stored securely in `chrome.storage.local`), extract job requirements from any active job board tab (LinkedIn, Indeed, Workday, Greenhouse, Lever, etc.), and tailor their resume using free AI models (Google Gemini Flash / Groq) into an ATS-compliant PDF and Markdown without hallucinating facts.

---

## Preconditions
1. Chrome browser (Manifest V3 compatible).
2. Extension loaded into Chrome via `chrome://extensions` (Developer Mode).
3. Valid free API key for Google Gemini (Google AI Studio) or Groq.

---

## Test Scenarios & Behavioral Contract

### Happy Flows

#### HF-001: Upload & Parse Base Resume into Master Profile
- **Preconditions**: User opens extension in side panel, navigates to "Profile" tab. No master profile stored yet.
- **User Actions**: User selects or drops a resume file (`.pdf`, `.docx`, or `.txt`/`.md`).
- **System Actions**:
  1. Client-side parser extracts raw text from the file (via `pdfjs-dist` for PDF, `mammoth` for DOCX, or raw read for text).
  2. Text is structured into standardized `MasterProfile` JSON schema (`personalInfo`, `summary`, `experience`, `skills`, `projects`, `education`, `certifications`).
  3. Structured profile is saved to `chrome.storage.local`.
- **Expected Results**: Profile form displays extracted details accurately; green success status is indicated.
- **Final State**: Master Profile exists and persists in storage.

#### HF-002: Manual Edit & Save Master Profile
- **Preconditions**: Master Profile loaded in Profile tab.
- **User Actions**: User edits their phone number, updates skill lists, or adds an experience bullet point, then clicks "Save Profile".
- **System Actions**: Validates input, serializes to JSON, and updates `chrome.storage.local`.
- **Expected Results**: Toast notification "Profile saved successfully"; data is updated.
- **Final State**: Updated profile stored.

#### HF-008: Clear Master Profile Fields and Storage
- **Preconditions**: Profile fields populated in Profile tab (from sample profile or saved storage).
- **User Actions**: User clicks "Clear Fields" button.
- **System Actions**:
  1. Clears all input and textarea fields across the Profile form.
  2. Removes the stored master profile from `chrome.storage.local`.
  3. Updates profile status badge to "No Profile Set".
- **Expected Results**: Form fields are completely empty; badge turns amber ("No Profile Set"); confirmation toast appears.
- **Final State**: Form and storage are clean and empty.

#### HF-009: Dynamic Model Discovery and Auto-Resolution
- **Preconditions**: Valid Gemini API key configured.
- **User Actions**: User triggers tailoring with model set to "auto" (or clicks "Fetch Available Models" in Settings).
- **System Actions**:
  1. Queries Google AI Studio models endpoint: `GET https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`.
  2. Filters models supporting `generateContent` containing `flash`.
  3. Sorts versions descending to detect the newest active Flash model (e.g. `gemini-3.8-flash`).
  4. Caches the resolved model in `chrome.storage.local` to avoid redundant network overhead.
- **Expected Results**: Resolves and uses the newest available Flash model automatically.
- **Final State**: Request executes with latest valid model without hardcoded version dependency.

#### NF-006: Deprecated Model Auto-Recovery
- **Preconditions**: Settings configured with a model that Google has retired.
- **User Actions**: User clicks "Tailor Resume".
- **System Actions**:
  1. API request detects deprecation error response from Google.
  2. Intercepts error, invokes dynamic model discovery to find the latest active Flash model.
  3. Automatically updates saved settings and retries the tailoring request.
- **Expected Results**: User request succeeds transparently without throwing a breaking error.
- **Final State**: Model setting updated to active version and tailored resume generated.

#### NF-007: Automatic Multi-Model Cascade on High Demand / 503
- **Preconditions**: Valid Gemini API key configured, primary model under temporary server overload or high demand (HTTP 503 / "high demand").
- **User Actions**: User clicks "Tailor Resume".
- **System Actions**:
  1. Detects `503` or message containing `"high demand"`.
  2. Initiates quick retry or cascades to next best active Flash model in descending version order (e.g. `gemini-3.8-flash` -> `gemini-2.5-flash` -> `gemini-1.5-flash`).
  3. Executes tailoring on available cascade model.
- **Expected Results**: Resume tailoring succeeds on fallback model without surfacing a high demand error to user.
- **Final State**: Tailored resume rendered successfully; active cascade model logged/used.

#### HF-003: Extract Job Details from Active Tab
- **Preconditions**: User navigates to a job listing (e.g., on Greenhouse, Lever, Workday, or LinkedIn) and opens the extension side panel.
- **User Actions**: Clicks "Fetch Current Job" or extension auto-detects page content.
- **System Actions**: Injects content scraper script into the active tab to extract:
  - Job Title (from `h1`, metadata, or job header)
  - Company Name
  - Job Location / Type (Remote / Hybrid)
  - Full Job Description / Responsibilities / Qualifications text.
- **Expected Results**: Tailor tab populates Job Title, Company, and word count of extracted description.
- **Final State**: Job context is staged in the extension state.

#### HF-004: Tailor Resume with Gemini Flash API
- **Preconditions**: Valid Gemini API key configured, Master Profile saved, and Job Description staged.
- **User Actions**: User clicks "Tailor Resume".
- **System Actions**:
  1. System constructs grounded prompt combining Master Profile and Job Description.
  2. Calls Google Gemini Flash endpoint (`gemini-2.5-flash` or `gemini-1.5-flash`).
  3. Receives structured JSON:
     - ATS match score (0-100)
     - Matched skills & missing keywords
     - Tailored professional summary
     - Re-ordered/prioritized technical skills
     - Highlighted bullet points aligning experience with job requirements.
- **Expected Results**: UI displays Match Score widget, key keyword matches, and full side-by-side preview.
- **Final State**: Tailored resume is stored in session state ready for export.

#### HF-005: Fallback & Support for Groq API
- **Preconditions**: User selects "Groq (Llama 3.3 70B)" in Settings and provides Groq API key.
- **User Actions**: User clicks "Tailor Resume".
- **System Actions**: Sends OpenAI-compatible chat completion request to `api.groq.com/openai/v1/chat/completions`.
- **Expected Results**: Successfully generates tailored resume with ultra-fast latency.
- **Final State**: Tailored resume ready for preview/download.

#### HF-006: Export/Download Tailored Resume as ATS-Compliant PDF
- **Preconditions**: Tailored resume generated and displayed in preview.
- **User Actions**: User clicks "Download ATS PDF".
- **System Actions**:
  1. Renders clean, single-page printable HTML template (standard margins, sans-serif ATS typography, no multi-column parsing traps).
  2. Triggers browser print/download dialog or downloads generated PDF blob directly named `[Name]_Resume_[Company].pdf`.
- **Expected Results**: PDF file downloaded to user's downloads folder.
- **Final State**: Download complete.

#### HF-007: Export/Download Tailored Resume as Markdown
- **Preconditions**: Tailored resume generated and displayed in preview.
- **User Actions**: User clicks "Download Markdown" or "Copy Markdown".
- **System Actions**: Serializes tailored resume to GitHub Flavored Markdown and triggers download or clipboard copy.
- **Expected Results**: File `[Name]_Resume_[Company].md` saved, or clipboard contains formatted text.
- **Final State**: User has markdown copy for records or custom editing.

---

### Negative Flows

#### NF-001: Tailoring Attempted Without Configured API Key
- **Preconditions**: Extension installed, no API key entered in Settings.
- **User Actions**: User clicks "Tailor Resume".
- **System Actions**: Validates settings state prior to dispatching network call.
- **Expected Results**: User is presented with a clear banner: "Please configure your free Gemini or Groq API key in Settings" with a direct link/button to Settings.
- **Final State**: No API call made; state remains clean.

#### NF-002: Tailoring Attempted Without Master Profile
- **Preconditions**: API key configured, but no resume uploaded or profile saved.
- **User Actions**: User clicks "Tailor Resume".
- **System Actions**: Validates presence of profile in `chrome.storage.local`.
- **Expected Results**: Warning dialog: "Please upload or fill in your base resume first in the Profile tab."
- **Final State**: User redirected to Profile tab.

#### NF-003: Tailoring on Non-Job Page or Empty Content
- **Preconditions**: User is on a blank tab (`chrome://newtab`) or non-job webpage.
- **User Actions**: Clicks "Fetch Current Job".
- **System Actions**: Content scraper searches for relevant job container or text length. Detects insufficient text (< 100 characters).
- **Expected Results**: Shows informative message: "Could not automatically detect job description. Please paste the job description manually into the box below."
- **Final State**: Manual input box is focused for user entry.

#### NF-004: API Rate Limit or Network Error (Recovery & Retry)
- **Preconditions**: API key invalid or quota exceeded (HTTP 429 / 401).
- **User Actions**: User triggers tailoring.
- **System Actions**: Catches API response error, parses error message, and retains form state.
- **Expected Results**: Displays human-readable error banner (e.g. "API Error: Invalid API key or quota exceeded. Please check your key in Settings.") with a "Retry" button.
- **Final State**: Staged inputs preserved, user can retry without re-scraping.

#### NF-005: Corrupted or Unsupported File Upload
- **Preconditions**: User selects an unsupported format (e.g. `.exe`, `.png`) or an unparseable/password-protected PDF.
- **User Actions**: User uploads file.
- **System Actions**: File validator checks MIME type and parser catches read failure.
- **Expected Results**: Displays error: "Unable to parse file. Please upload a standard PDF, DOCX, or text file, or paste your resume text directly."
- **Final State**: No corrupted state saved.

---

### Validation & Edge Cases

#### VR-001: Master Profile Minimum Fields
- Profile must include at minimum: Full Name, Email or Phone, at least one Work Experience or Project entry, and Skills list.
- Prevent saving empty profile.

#### VR-002: Strict Anti-Hallucination Grounding
- System prompt for the LLM must explicitly forbid:
  - Fabricating employers, employment dates, or job titles not in the Master Profile.
  - Fabricating university degrees, GPAs, or unearned certifications.
  - Claiming years of experience beyond the Master Profile's actual timeline.
- Permitted actions:
  - Re-ordering and emphasizing relevant skills.
  - Highlighting matching technologies in project and experience descriptions.
  - Rewriting professional summary to align with the JD's primary domain.

#### EC-001: Extremely Long Job Posting (> 15,000 words)
- System sanitizes and truncates extraneous boilerplate (EEO statements, cookie notices, legal disclaimers) to keep tokens focused on role responsibilities and requirements.

#### EC-002: Unicode / Special Characters in Resume & Job Description
- Correctly parses bullet points, dashes, emojis, accents, and non-ASCII characters without encoding corruption.

#### ST-001: Loading & State Transitions
- Scraper state: `idle` → `scraping` → `scraped` | `error`
- Tailor state: `idle` → `tailoring` (animated spinner with progress tip) → `completed` | `error`
- Export state: `idle` → `generating_pdf` → `ready`

#### RR-001: Persistence Across Restarts
- `chrome.storage.local` preserves:
  - Master Profile JSON
  - Settings (Selected Provider, Model, API Key)
  - Last tailored resume cache (optional recovery)
- Survives browser restarts and tab closures.

---

## Traceability Matrix
- HF-001, HF-002 → Master Profile Management & Storage
- HF-003, NF-003, EC-001 → Job Content Extraction & Sanitization
- HF-004, HF-005, NF-001, NF-004, VR-002 → AI Tailoring Engine & Providers
- HF-006, HF-007 → ATS PDF & Markdown Exporters
- ST-001, RR-001 → Extension UI Lifecycle & Local Persistence
