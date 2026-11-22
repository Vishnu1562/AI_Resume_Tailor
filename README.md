# ⚡ AI Resume Tailor — Chrome Extension

An AI-powered, privacy-first Chrome Extension (Manifest V3) that runs in the Chrome Side Panel. It reads the job listing directly from whatever tab you are browsing (LinkedIn, Indeed, Workday, Greenhouse, Lever, etc.), tailors your resume to match the job's technical requirements using **free AI models** (Google Gemini Flash / Groq), and exports an ATS-compliant PDF and Markdown resume with 1 click.

---

## 🌟 Key Features

- **Universal & Accessible to Anyone**:
  - Anyone can upload their existing resume (`.pdf`, `.txt`, `.md`, `.json`) or paste their details into the **Master Profile** tab.
  - Includes a **1-click "Load Sample Profile"** pre-seeded with a comprehensive full-stack engineering background.
- **100% Free AI (No Subscription Required)**:
  - Powered by **Google Gemini Flash** (1,500 requests/day free via Google AI Studio).
  - Also supports **Groq (Llama 3.3 70B)** for ultra-fast free inference.
- **Privacy-First (Zero Backend Servers)**:
  - Your resume, job details, and API keys are stored **100% locally** in your browser's `chrome.storage.local`.
  - Nothing is sent to any third-party database.
- **Strict Anti-Hallucination Grounding**:
  - The AI prompt enforces immutable truth: it **never** invents employers, titles, dates, or degrees.
  - Re-weights technical skills, customizes the professional summary, and aligns bullet points to target the employer's keywords.
- **ATS Match Score & Analysis**:
  - Visual ATS match percentage gauge.
  - Matched skills badges vs. missing recommended keywords.
- **Instant Export**:
  - 📥 **Download ATS PDF**: Generates a clean, single-page printable PDF formatted to pass modern ATS scanners.
  - 📄 **Download Markdown (.md)**: Clean GitHub-flavored markdown.
  - 📋 **Copy to Clipboard**.

---

## 🚀 How to Install in Chrome (1 Minute)

1. **Clone or Build the Extension**:
   ```bash
   cd D:\Projects\AI_Resume_Tailor
   npm install
   npm run build
   ```
2. **Load into Google Chrome**:
   - Open Chrome and navigate to `chrome://extensions/`.
   - Enable **"Developer mode"** (toggle in the top-right corner).
   - Click **"Load unpacked"** in the top-left corner.
   - Select the folder: `D:\Projects\AI_Resume_Tailor`.
3. **Pin & Open**:
   - Click the puzzle icon in Chrome's toolbar and pin **AI Resume Tailor**.
   - Click the extension icon to open the **Chrome Side Panel**!

---

## 🔑 How to Get Your Free Gemini API Key (30 Seconds)

1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Sign in with any Google account (no credit card needed).
3. Click **"Create API key"** and copy it.
4. Open the extension, click the **Settings (⚙️)** tab, paste your key, and click **Save Settings**.

---

## 🧪 Testing & Verification

The extension includes a comprehensive behavioral test suite adhering to `automation-tests.md`:

```bash
npm test
```

### Test Coverage Summary:
- `test/profileStorage.test.ts`: Master profile CRUD, validation, and storage persistence (`HF-001`, `HF-002`, `VR-001`, `NF-002`, `RR-001`).
- `test/contentScraper.test.ts`: Active tab DOM extraction, sanitization, and fallback (`HF-003`, `NF-003`, `EC-001`, `EC-002`).
- `test/tailoringEngine.test.ts`: Gemini Flash & Groq prompt construction, anti-hallucination grounding, and error recovery (`HF-004`, `HF-005`, `NF-001`, `NF-004`, `VR-002`).
- `test/atsPdfRenderer.test.ts`: Semantic ATS single-page printable HTML and Markdown generation (`HF-006`, `HF-007`).
- `test/resumeParser.test.ts`: Raw resume text parsing into structured profile (`HF-001`, `NF-005`).

---

## 📂 Project Structure

```
AI_Resume_Tailor/
├── manifest.json            # Chrome Manifest V3 configuration
├── sidepanel.html           # Side panel UI layout
├── sidepanel.css            # Dark/light modern styling
├── icons/                   # Extension icons (16px, 48px, 128px)
├── automation-tests.md      # Behavioral test specifications
├── src/
│   ├── background.ts        # Service worker managing side panel state
│   ├── content.ts           # Content script for in-page extraction
│   ├── sidepanel.ts         # Main controller wiring tabs and actions
│   ├── types/index.ts       # Type definitions
│   ├── storage/             # chrome.storage.local wrapper
│   └── services/
│       ├── contentScraper.ts    # DOM job scraper
│       ├── tailoringEngine.ts   # Gemini/Groq prompt & call handler
│       ├── atsPdfRenderer.ts    # ATS printable HTML & Markdown generator
│       └── resumeParser.ts      # Client-side resume text parser
└── test/                    # Vitest test suites
```

---

## 📜 License
MIT
