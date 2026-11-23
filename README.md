# ⚡ AI Resume Tailor — Chrome Extension (Manifest V3)

[![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue.svg)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6.svg)](https://www.typescriptlang.org/)
[![Vitest Tests](https://img.shields.io/badge/Tests-37%20Passed-10b981.svg)](https://vitest.dev/)
[![Privacy First](https://img.shields.io/badge/Privacy-100%25%20Local-8b5cf6.svg)](#-privacy--security)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

An intelligent, privacy-first Chrome Extension that operates seamlessly in the **Chrome Side Panel**. It reads the active job posting from whichever job board you are browsing (LinkedIn, Indeed, Workday, Greenhouse, Lever, UKG, custom company portals, etc.), evaluates keyword coverage, and tailors your resume using **free AI models** (Google Gemini Flash & Groq Llama 3.3 70B) into an ATS-compliant PDF and Markdown without hallucinating unearned credentials.

---

## 🌟 Key Features

- **Universal & Instant Setup**:
  - Upload your existing resume (`.pdf`, `.docx`, `.txt`, `.md`, `.json`) into the persistent **Master Profile** tab.
  - Or click **"Load Sample Profile"** for an instant pre-populated full-stack profile.
- **100% Free AI Inference (Zero Subscriptions Required)**:
  - **Google Gemini Flash**: 1,500 free requests per day via Google AI Studio. Features dynamic auto-discovery (`gemini-3.8-flash` auto-resolution) and dynamic live multi-model failover.
  - **Groq (Llama 3.3 70B)**: Near-instant inference powered by Groq's LPU.
- **Privacy-First & Zero Backend Servers**:
  - Your resume, job details, and API keys are stored **100% locally** in your browser's `chrome.storage.local`.
  - Zero third-party telemetry, zero external database tracking.
- **Strict Anti-Hallucination Grounding**:
  - The AI prompt enforces immutable truth: it **never** invents employers, dates, degrees, or false credentials.
  - Re-weights authentic skills, crafts targeted professional summaries, and aligns existing bullet points to target ATS keywords.
- **Smart Job Heuristic Detection**:
  - Deterministic filters block non-job sites (Google Search, YouTube, Wikipedia, social feeds).
  - Amber warning banners guide you when on non-job pages, with manual paste fallback.
- **Single-Click Export**:
  - 📥 **Download ATS PDF**: Generates a clean, single-page printable PDF formatted to pass modern ATS parsers.
  - 📄 **Download Markdown (.md)**: Clean GitHub-flavored markdown.
  - 📋 **Copy to Clipboard**.

---

## 🚀 Installation & Quick Start

### Method A: Quick Install (Pre-Built Release — No Node.js Needed)

1. Download the latest `ai-resume-tailor-v1.0.0.zip` from the [`release/`](./release/) folder or the [GitHub Releases](https://github.com/Vishnu1562/AI_Resume_Tailor/releases) tab.
2. Unzip the archive into a folder on your computer.
3. Open Google Chrome and navigate to `chrome://extensions/`.
4. Turn ON **"Developer mode"** in the top-right corner.
5. Click **"Load unpacked"** in the top-left corner and select the extracted folder.
6. Click the extension puzzle icon in Chrome's toolbar, pin **AI Resume Tailor**, and click to open the Side Panel!

---

### Method B: Developer Build from Source

```bash
# 1. Clone repository
git clone https://github.com/Vishnu1562/AI_Resume_Tailor.git
cd AI_Resume_Tailor

# 2. Install dependencies
npm install

# 3. Run test suite (37 tests across 7 test suites)
npm test

# 4. Compile TypeScript
npm run build

# 5. (Optional) Create production ZIP package
npm run package
```

Then load the root folder in `chrome://extensions/` via **Load unpacked**.

---

## 🔑 Getting Free API Keys

### Google Gemini (Recommended)
1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Sign in with any Google account (no credit card required).
3. Click **"Create API Key"** and copy your key.
4. In the extension, open **Settings (⚙️)**, select **Google Gemini**, paste your key, and click **Save Settings**.
5. Model is set to `auto` by default to automatically discover and use Google's latest active Flash model.

### Groq (Ultra-Fast)
1. Visit [Groq Console](https://console.groq.com/keys).
2. Sign in and create a free API key.
3. In the extension Settings, select **Groq (Llama 3.3 70B)**, paste your key, and click **Save Settings**.

---

## 📦 How to Deploy / Package

### Packaging for Release or Chrome Web Store

Run the automated packaging pipeline:
```bash
npm run package
```
This script:
1. Executes the complete Vitest test suite (`npm test`).
2. Compiles TypeScript via `tsc`.
3. Packages a production-ready, forward-slash ZIP archive at `release/ai-resume-tailor-v1.0.0.zip`.

### Publishing to the Google Chrome Web Store

1. Register for a [Chrome Web Store Developer Account](https://chrome.google.com/webstore/devconsole) (one-time $5 Google fee).
2. Click **"Add new item"** and upload `release/ai-resume-tailor-v1.0.0.zip`.
3. Add store listing details, screenshots, and privacy policy declaration (Zero data collection; all processing is local).
4. Submit for review!

---

## 🧪 Behavioral Test Suite & Quality Assurance

The extension adheres strictly to the behavioral contracts defined in [`automation-tests.md`](./automation-tests.md):

```bash
npm test
```

### Verified Test Suites:
- `test/atsPdfRenderer.test.ts`: ATS PDF layout, single-page print formatting, and Markdown export (`HF-006`, `HF-007`).
- `test/contentScraper.test.ts`: ATS DOM parsing, non-job heuristic detection, and sanitization (`HF-003`, `NF-003`, `NF-011`, `VR-003`, `EC-001`).
- `test/modelDiscovery.test.ts`: Dynamic Google AI Studio model discovery, version sorting, and caching (`HF-009`).
- `test/pdfExtractor.test.ts`: Client-side binary PDF text extraction via PDF.js (`HF-001`).
- `test/profileStorage.test.ts`: Master Profile CRUD, schema validation, and persistence (`HF-001`, `HF-002`, `HF-008`, `VR-001`).
- `test/resumeParser.test.ts`: Unstructured resume text structuring into schema (`HF-001`, `NF-005`).
- `test/tailoringEngine.test.ts`: Multi-model cascading (503/404 failovers), JSON mode auto-recovery, and anti-hallucination grounding (`HF-004`, `HF-005`, `NF-006`, `NF-007`, `NF-008`, `NF-009`, `NF-010`, `VR-002`).

---

## 📂 Architecture & Directory Structure

```text
AI_Resume_Tailor/
├── manifest.json              # Chrome Extension Manifest V3 configuration
├── sidepanel.html             # Side panel dark-glass UI layout
├── sidepanel.css              # Modern glassmorphism UI stylesheet
├── icons/                     # High-resolution extension icons (16, 48, 128px)
├── libs/                      # Sandboxed client-side libraries (PDF.js)
├── automation-tests.md        # Behavioral specification & traceability contract
├── release/                   # Production ZIP builds for distribution
├── scripts/
│   ├── package.ps1            # Production ZIP packaging pipeline
│   ├── package.js             # Cross-platform runner for npm run package
│   └── generate_icons.ps1     # Icon rasterizer
├── src/
│   ├── background.ts          # MV3 service worker managing side panel state
│   ├── content.ts             # Content script for active tab DOM reading
│   ├── sidepanel.ts           # Main controller orchestrating tabs & UI state
│   ├── types/index.ts         # TypeScript data contracts & schemas
│   ├── storage/
│   │   └── profileStorage.ts  # chrome.storage.local abstraction layer
│   └── services/
│       ├── atsPdfRenderer.ts  # ATS-compliant PDF & Markdown exporter
│       ├── contentScraper.ts  # Smart heuristic job scraper & DOM extractor
│       ├── geminiService.ts   # Dynamic Gemini Flash auto-discovery & API client
│       ├── pdfExtractor.ts    # Sandboxed client-side PDF text extractor
│       ├── resumeParser.ts    # Text-to-JSON resume parsing engine
│       └── tailoringEngine.ts # Prompt assembly, LLM failover cascade & parsing
└── test/                      # Vitest behavioral test suites
```

---

## 🔒 Privacy & Security

- **No Tracking**: Zero Google Analytics, zero telemetry, zero cookies.
- **Client-Side Only**: Your resume, contact details, and career history never leave your browser except directly to the AI provider endpoint using your own personal API key.
- **Direct Endpoints**: Network calls connect only to `generativelanguage.googleapis.com` (Gemini) or `api.groq.com` (Groq).

---

## 📄 License

Distributed under the [MIT License](LICENSE).
