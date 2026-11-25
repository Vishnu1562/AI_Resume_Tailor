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

#### HF-010: Dynamic Settings UI Adaptation by AI Provider
- **Preconditions**: Extension settings panel open.
- **User Actions**: User changes "AI Provider" dropdown between Google Gemini and Groq.
- **System Actions**:
  1. Detects selection change (`gemini` vs `groq`).
  2. Updates Model ID default (`gemini-3.8-flash` vs `llama-3.3-70b-versatile`).
  3. Shows/hides provider-specific controls (e.g., "Auto-Detect Latest" button and Gemini-specific tip).
  4. Updates the step-by-step API Key Guide card to link to Google AI Studio or Groq Console with tailored instructions.
- **Expected Results**: The UI guide, links, and model tips match the selected provider in real-time.
- **Final State**: Active provider guide displayed accurately.

#### HF-011: Pure-Text Flash Model Discovery (TTS/Audio/Multimodal Exclusion)
- **Preconditions**: User triggers model discovery with Google AI Studio key. Google's API returns multi-modal audio, speech, and text models.
- **User Actions**: Trigger model discovery (or start tailoring with model set to "auto").
- **System Actions**:
  1. Queries Google AI Studio models endpoint.
  2. Strictly filters out non-text models: `-tts`, `-audio`, `-image`, `-imagen`, `-live`, `-realtime`, `-embedding`.
  3. Selects only pure-text Flash models with 250K+ TPM rate limits (e.g. `gemini-3.8-flash`, `gemini-2.5-flash`, `gemini-2.0-flash`).
- **Expected Results**: Prevents routing to low-quota (10K TPM) audio/TTS models.
- **Final State**: High-throughput text model selected and cached.

#### HF-012: Targeted LinkedIn Job Scraping
- **Preconditions**: User is on a LinkedIn job posting page (e.g. `linkedin.com/jobs/view/...`).
- **User Actions**: Clicks "Scan Tab" or opens side panel.
- **System Actions**:
  1. Targets LinkedIn specific job title elements (`.job-details-jobs-unified-top-card__job-title`, `.jobs-unified-top-card__job-title`) while rejecting navigation badges (e.g. "0 notifications", "Home", "Feed").
  2. Targets hiring company selector (`.job-details-jobs-unified-top-card__company-name`, `a[href*="/company/"]`) and prevents falling back to "Linkedin" as the company.
  3. Scopes description to `.jobs-description__content` / `.jobs-description`, excluding sidebar recommendations and feed.
- **Expected Results**: Captures accurate job title and company (e.g. "PowerApps Developer" at "Capgemini") and concise description (< 1,200 words).
- **Final State**: Accurate job context populated in side panel.

#### HF-013: Professional Model Dropdown Selection with Formatted Token Limits
- **Preconditions**: Settings tab open.
- **User Actions**: User views the Model selector.
- **System Actions**:
  1. Renders a `<select>` dropdown populated with models and formatted token limits in brackets (e.g. `Gemini 1.5 Flash [1M tokens]`, `Llama 3.3 70B [128k tokens]`).
  2. Clean professional typography without emoji prefixes: defaults to `Auto-Detect (Recommended)`.
  3. Provides a clean fallback option: `Custom Model...`.
- **Expected Results**: User can select any model from the dropdown with visible token capacity and no emoji clutter.
- **Final State**: Selected model saved in `chrome.storage.local`.

#### HF-014: Live Model Fetch and Dropdown Repopulation
- **Preconditions**: Valid Gemini API key entered in Settings.
- **User Actions**: User clicks "Fetch Live Models" button.
- **System Actions**:
  1. Queries Google AI Studio models endpoint: `GET https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`.
  2. Filters out audio/TTS/multimodal models and extracts `displayName`, `name`, and `inputTokenLimit`.
  3. Formats token numbers into human-readable strings (`1048576` -> `1M tokens`, `131072` -> `128k tokens`).
  4. Repopulates the dropdown with live active models sorted descending by version, prefixed with clean `Auto-Detect (Recommended)`.
  5. Displays confirmation toast with total count of models retrieved.
- **Expected Results**: Dropdown updates in real-time with verified live models and their exact token limits.
- **Final State**: Updated models available for selection.

#### HF-015: Custom Model Entry Fallback
- **Preconditions**: Settings tab open.
- **User Actions**: User chooses "Custom Model..." from the model dropdown.
- **System Actions**: Reveals a text input allowing manual entry of a custom model string (e.g. fine-tuned model or private endpoint).
- **Expected Results**: Custom model text field appears; on saving settings, the custom string is stored.
- **Final State**: Custom model ID stored and used for tailoring.

#### NF-013: Fetch Live Models Without API Key
- **Preconditions**: No API key entered in Settings.
- **User Actions**: User clicks "Fetch Live Models".
- **System Actions**: Intercepts missing key, prevents network call, and displays notification: "Please enter your API key first to fetch live models."
- **Expected Results**: Existing default model options preserved; clear warning shown.
- **Final State**: State remains stable.

#### NF-006: Deprecated Model Auto-Recovery
- **Preconditions**: Settings configured with a model that Google has retired.
- **User Actions**: User clicks "Tailor Resume".
- **System Actions**:
  1. API request detects deprecation error response from Google.
  2. Intercepts error, invokes dynamic model discovery to find the latest active Flash model.
  3. Automatically updates saved settings and retries the tailoring request.
- **Expected Results**: User request succeeds transparently without throwing a breaking error.
- **Final State**: Model setting updated to active version and tailored resume generated.

#### NF-007: Automatic Multi-Model Cascade via Live Google Models API (Zero Hardcoded Cascade)
- **Preconditions**: Valid Gemini API key configured, primary model under temporary server overload (HTTP 503 / "high demand") or deprecated/not found (HTTP 404/400).
- **User Actions**: User clicks "Tailor Resume".
- **System Actions**:
  1. Detects `503` / `"high demand"` or `404` / `"not found"` / `"deprecated"`.
  2. Queries Google's live endpoint: `GET https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}` directly.
  3. Filters active models from Google's live response supporting `generateContent` and `flash`.
  4. Cascades dynamically through Google's verified live models without using hardcoded model strings.
  5. Executes tailoring on the first available live model.
- **Expected Results**: Resume tailoring succeeds on a verified active model without failing with a hardcoded "model not found" error.
- **Final State**: Tailored resume rendered successfully; active live model dynamically used.

#### NF-009: JSON Mode Compatibility and Graceful Fallback
- **Preconditions**: Valid Gemini API key configured, target model does not support `responseMimeType: 'application/json'` (returns "JSON mode is not enabled for this model").
- **User Actions**: User clicks "Tailor Resume".
- **System Actions**:
  1. Intercepts error `JSON mode is not enabled for this model`.
  2. Retries request to the model without `responseMimeType` configuration, relying on system prompt schema constraints.
  3. Parses raw response with robust markdown fence and boundary regex extraction.
- **Expected Results**: Tailored resume generated and parsed cleanly without surfacing JSON mode error to user.
- **Final State**: Tailored results rendered successfully in side panel.

#### NF-010: Multi-Part & Thinking Response Extraction with Empty-Candidate Cascade
- **Preconditions**: Valid Gemini API key configured, model outputs reasoning/thought parts or returns an empty candidate (e.g. server finishReason empty).
- **User Actions**: User clicks "Tailor Resume".
- **System Actions**:
  1. Iterates all content parts, ignores reasoning/thinking tokens (`thought: true`), and concatenates all text parts.
  2. If candidate text remains empty, cascades to the next active model in Google's live catalog.
- **Expected Results**: Complete JSON payload is reconstructed and parsed; if candidate is empty, cascade resolves on the next model.
- **Final State**: Tailored results rendered successfully without throwing "AI returned an empty response".

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

#### NF-011: Filter Non-Job Pages (Search Engines, Social Platforms) with Amber Banner
- **Preconditions**: Active tab is a search engine (e.g. Google Search, Bing) or media/social platform (YouTube, Wikipedia, Reddit, Netflix, IMDb).
- **User Actions**: User opens extension or clicks "Scan Tab".
- **System Actions**:
  1. Content scraper checks URL and page content against non-job patterns and job heuristics.
  2. Detects blocked domain or absence of job listing signals (`responsibilities`, `qualifications`, `requirements`, etc.).
  3. Sets `isDetected: false`, suppresses false job titles (e.g. "Search Results") and companies (e.g. "Google"), and leaves job description clean.
  4. Renders an amber status warning banner in the side panel: "⚠️ No job posting detected on this page. Navigate to a job listing or paste the job description below."
- **Expected Results**: Amber warning banner displayed, no bogus job details auto-filled.
- **Final State**: System prevents false-positive job detection; user can navigate to a job listing or paste manually.

#### NF-012: Dynamic Cascade on Per-Model Rate Limit (HTTP 429 / Quota Exceeded)
- **Preconditions**: Primary Gemini model hits a temporary per-minute rate limit (HTTP 429 / "quota exceeded" / "input tokens per minute limit exceeded").
- **User Actions**: User triggers resume tailoring.
- **System Actions**:
  1. Intercepts HTTP 429 or quota exceeded error.
  2. Logs warning and immediately cascades to the next live Flash model in the cascade list (each model maintains independent quota in Google AI Studio).
  3. Executes tailoring on the alternative model and updates saved settings to the working model.
- **Expected Results**: Tailoring succeeds without throwing a blocking rate-limit error to the user.
- **Final State**: Resume generated successfully; working model dynamically selected.

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

#### VR-003: Smart Job Page Heuristic Detection
- Content scraper must evaluate whether a page represents a genuine job posting using deterministic heuristics:
  1. **Blocked Domains**: Known search engines (`google.com/search`, `bing.com/search`, etc.) and non-job media/social domains (`youtube.com`, `wikipedia.org`, `reddit.com`, `netflix.com`, `imdb.com`) immediately fail job validation (`isJob: false`).
  2. **Verified ATS Domains**: High-confidence ATS hosts (`ukg.com`, `workdayjobs.com`, `greenhouse.io`, `lever.co`, `ashbyhq.com`, `indeed.com`, `linkedin.com/jobs`, etc.) are recognized as job portals if text length >= 80 characters.
  3. **Job Keyword Signals**: On custom corporate domains or company career portals, text must contain at least 2 distinct job keywords (e.g., `responsibilities`, `qualifications`, `requirements`, `experience`, `about the role`, `skills`, `apply now`, `benefits`, `job description`).
  4. Pages failing these criteria return `isDetected: false` and empty strings for title, company, and description.

#### EC-004: Manual Job Description Fallback after Non-Job Detection
- **Preconditions**: User is on a non-job page where heuristic detection showed amber warning banner.
- **User Actions**: User pastes target job description text into the textarea.
- **System Actions**:
  1. Textarea input listener counts words in pasted text.
  2. When word count >= 30, updates status banner to green: "Manual job description provided (X words)".
  3. Enables user to click "Tailor Resume with AI" with manual context.
- **Expected Results**: User can successfully tailor resume against manually provided job context even when active tab is not a job portal.
- **Final State**: Tailoring succeeds with manual input.

#### EC-005: Generic Navigation and UI Element Filtering from Job Titles
- **Preconditions**: Webpage contains navigation items, badges, or headers with generic text (e.g., "0 notifications", "Search Results", "Job Search", "Home", "Feed", "Single Position", "Job Details").
- **System Actions**: Content scraper evaluates extracted title against a blacklist of generic navigational patterns; ignores matching elements and continues searching for genuine role titles.
- **Expected Results**: Prevents garbage values like "0 notifications" or "Single Position" from being populated as the role title.
- **Final State**: Legitimate role title extracted, or sensible default "Target Role" used.

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
