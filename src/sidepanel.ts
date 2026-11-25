import {
  getMasterProfile,
  saveMasterProfile,
  clearMasterProfile,
  getSettings,
  saveSettings,
  validateProfile,
} from './storage/profileStorage.js';
import { tailorResume } from './services/tailoringEngine.js';
import { renderAtsHtml, formatAsMarkdown } from './services/atsPdfRenderer.js';
import { parseResumeTextToProfile } from './services/resumeParser.js';
import { extractTextFromPdf } from './services/pdfExtractor.js';
import {
  discoverLatestGeminiModel,
  fetchLiveGeminiModels,
  type DetailedModelItem,
  DEFAULT_AUTO_MODEL_LABEL,
  CUSTOM_MODEL_LABEL,
  GEMINI_DEFAULT_MODELS,
  GROQ_DEFAULT_MODELS,
} from './services/geminiService.js';
import type { MasterProfile, ExtensionSettings, JobContext, TailoredResume } from './types/index.js';

// Generic dummy sample profile for demo / testing
export const DEMO_SAMPLE_PROFILE: MasterProfile = {
  personalInfo: {
    fullName: 'Alex Morgan',
    email: 'alex.morgan@example.com',
    phone: '+1 (555) 019-2834',
    location: 'San Francisco, CA',
    linkedin: 'https://linkedin.com/in/alex-morgan-sample',
    github: 'https://github.com/alex-morgan-sample',
  },
  summary:
    'Full-Stack Software Engineer with 4+ years of experience building high-throughput RESTful APIs, distributed microservices, and responsive web applications using TypeScript, Node.js, C# .NET, and modern frontend frameworks. Strong focus on clean architecture, database optimization, and CI/CD automation.',
  skills: {
    'Languages & Backend': [
      'TypeScript',
      'JavaScript (ES6+)',
      'Node.js',
      'C#',
      'ASP.NET Core',
      'Python',
    ],
    Frontend: [
      'React',
      'Angular',
      'Tailwind CSS',
      'HTML5',
      'SCSS',
    ],
    'Databases & Cloud': [
      'PostgreSQL',
      'SQL Server',
      'Redis',
      'Docker',
      'AWS',
      'CI/CD Pipelines',
    ],
    'Architecture & Practices': [
      'Clean Architecture',
      'RESTful APIs',
      'Microservices',
      'Agile/Scrum',
      'Unit & Integration Testing',
    ],
  },
  experience: [
    {
      company: 'TechCorp Solutions',
      role: 'Senior Software Engineer',
      location: 'San Francisco, CA',
      startDate: 'Jan 2022',
      endDate: 'Present',
      bullets: [
        'Engineered high-concurrency microservices handling over 5M daily requests with sub-100ms latency.',
        'Architected clean REST APIs and modular frontend features reducing client load times by 35%.',
        'Implemented automated CI/CD deployment pipelines with zero-downtime rolling releases.',
      ],
    },
  ],
  projects: [
    {
      name: 'Cloud Workflow Automation Engine',
      techStack: 'Node.js, TypeScript, PostgreSQL, Docker',
      bullets: [
        'Built an event-driven task orchestration engine enabling asynchronous distributed job execution.',
      ],
    },
  ],
  education: [
    {
      degree: 'B.S. in Computer Science',
      institution: 'State University of Technology',
      year: '2017 – 2021',
    },
  ],
  certifications: [
    'AWS Certified Solutions Architect',
  ],
};

let currentJob: JobContext = {
  title: '',
  company: '',
  description: '',
  isDetected: false,
};

let currentTailoredResume: TailoredResume | null = null;

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', async () => {
  setupTabs();
  setupSettingsTab();
  setupProfileTab();
  setupTailorTab();

  // Load existing profile & settings into state
  const profile = await getMasterProfile();
  if (profile) {
    populateProfileForm(profile);
    updateProfileStatusBadge(true);
  } else {
    updateProfileStatusBadge(false);
  }

  const settings = await getSettings();
  if (settings) {
    // Automatically migrate deprecated model IDs
    if (settings.model === 'gemini-2.0-flash') {
      settings.model = 'gemini-3.8-flash';
      await saveSettings(settings);
    }
    populateSettingsForm(settings);
  }

  // Attempt to fetch active job from tab on load
  await fetchActiveTabJob();
});

function setupTabs() {
  const tabs = document.querySelectorAll<HTMLButtonElement>('.nav-tab');
  const panels = document.querySelectorAll<HTMLElement>('.tab-panel');

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('active'));
      panels.forEach((p) => p.classList.remove('active'));

      tab.classList.add('active');
      const targetPanelId = tab.dataset.target;
      if (targetPanelId) {
        document.getElementById(targetPanelId)?.classList.add('active');
      }
    });
  });
}

function updateProfileStatusBadge(hasProfile: boolean) {
  const badge = document.getElementById('profile-status-badge');
  if (!badge) return;
  if (hasProfile) {
    badge.innerHTML = '<span class="badge-dot"></span><span class="badge-text">Profile Ready ✓</span>';
    badge.className = 'badge badge-green';
  } else {
    badge.innerHTML = '<span class="badge-dot"></span><span class="badge-text">No Profile Set</span>';
    badge.className = 'badge badge-amber';
  }
}

// ------------------- TAB 1: TAILOR -------------------
function setupTailorTab() {
  const btnFetch = document.getElementById('btn-fetch-job') as HTMLButtonElement;
  const btnTailor = document.getElementById('btn-tailor') as HTMLButtonElement;
  const btnDownloadPdf = document.getElementById('btn-download-pdf') as HTMLButtonElement;
  const btnDownloadMd = document.getElementById('btn-download-md') as HTMLButtonElement;
  const btnCopyMd = document.getElementById('btn-copy-md') as HTMLButtonElement;
  const descEl = document.getElementById('job-description') as HTMLTextAreaElement;
  const titleEl = document.getElementById('job-title') as HTMLInputElement;
  const companyEl = document.getElementById('job-company') as HTMLInputElement;

  btnFetch?.addEventListener('click', fetchActiveTabJob);
  btnTailor?.addEventListener('click', executeTailoring);
  btnDownloadPdf?.addEventListener('click', downloadPdf);
  btnDownloadMd?.addEventListener('click', downloadMarkdown);
  btnCopyMd?.addEventListener('click', copyMarkdown);

  descEl?.addEventListener('input', () => {
    const text = descEl.value.trim();
    const words = text ? text.split(/\s+/).length : 0;
    if (words >= 30) {
      currentJob = {
        title: titleEl?.value.trim() || 'Target Role',
        company: companyEl?.value.trim() || 'Target Company',
        description: text,
        isDetected: true,
      };
      const statusEl = document.getElementById('job-detection-status');
      if (statusEl) {
        statusEl.innerHTML = `<span class="status-dot"></span><span class="status-msg">Manual job description provided (${words} words)</span>`;
        statusEl.className = 'status-banner success';
      }
    }
  });
}

async function fetchActiveTabJob() {
  const titleEl = document.getElementById('job-title') as HTMLInputElement;
  const companyEl = document.getElementById('job-company') as HTMLInputElement;
  const descEl = document.getElementById('job-description') as HTMLTextAreaElement;
  const statusEl = document.getElementById('job-detection-status');

  if (statusEl) {
    statusEl.textContent = 'Scanning active page...';
    statusEl.className = 'status-banner info';
  }

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      if (statusEl) {
        statusEl.innerHTML = '<span class="status-dot"></span><span class="status-msg">No active webpage found.</span>';
        statusEl.className = 'status-banner warning';
      }
      return;
    }

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      args: [tab.url || ''],
      func: (tabUrl: string) => {
        const blockedPatterns = [
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

        const atsPatterns = [
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

        const jobKeywords = [
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

        const jobPlatformHosts = ['linkedin.com', 'indeed.com', 'glassdoor.com', 'monster.com', 'ziprecruiter.com'];

        const genericTitleBlacklist = [
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
        const isGeneric = (str: string) => !str || str.trim().length < 2 || genericTitleBlacklist.some((r) => r.test(str.trim()));

        if (tabUrl && blockedPatterns.some((p) => p.test(tabUrl))) {
          return {
            title: '',
            company: '',
            description: '',
            isDetected: false,
            reason: 'blocked_domain',
          };
        }

        // 1. Company Extraction
        let company = '';
        const compEl = document.querySelector(
          '.job-details-jobs-unified-top-card__company-name, .jobs-unified-top-card__company-name, .topcard__flavor--black-link, .topcard__flavor, a[href*="/company/"], .company-name, [data-automation="job-company"], [data-automation*="company" i], .employer, [data-company-name="true"], [class*="company-name" i], [class*="companyName" i], [class*="employer" i]'
        ) as HTMLElement;
        if (compEl && compEl.innerText?.trim()) {
          const cand = compEl.innerText.trim();
          if (!/^(linkedin|indeed|glassdoor)$/i.test(cand)) {
            company = cand;
          }
        }

        if (!company) {
          const ogSite = document.querySelector('meta[property="og:site_name"]')?.getAttribute('content');
          if (ogSite?.trim() && !/^(linkedin|indeed|glassdoor)$/i.test(ogSite.trim())) {
            company = ogSite.trim();
          }
        }

        if (!company && document.title) {
          const atMatch = document.title.match(/(?:at|@)\s+([A-Za-z0-9\s&]+?)(?:\s*[-|•–—]|$)/i);
          if (atMatch && atMatch[1].trim().length >= 2 && !/^(linkedin|indeed|glassdoor)$/i.test(atMatch[1].trim())) {
            company = atMatch[1].trim();
          } else {
            const cleanedTitle = document.title.replace(/^\(\d+\)\s*/, '');
            const parts = cleanedTitle.split(/[-|•–—]/).map((p) => p.trim());
            for (const p of parts) {
              if (p.length >= 2 && !isGeneric(p) && !/^(linkedin|indeed|glassdoor)$/i.test(p)) {
                company = p;
                break;
              }
            }
          }
        }

        if (!company && tabUrl && !jobPlatformHosts.some((h) => tabUrl.toLowerCase().includes(h))) {
          try {
            const host = new URL(tabUrl).hostname.toLowerCase();
            if (host.includes('ukg.com')) company = 'UKG';
            else if (host.includes('workdayjobs.com')) {
              const m = host.match(/^([a-z0-9_-]+)\.wd\d*\.myworkdayjobs\.com/);
              if (m) company = m[1].toUpperCase();
            } else if (host.includes('greenhouse.io') || host.includes('lever.co') || host.includes('ashbyhq.com')) {
              const p = new URL(tabUrl).pathname.split('/').filter(Boolean);
              if (p[0]) company = p[0].charAt(0).toUpperCase() + p[0].slice(1);
            } else {
              const clean = host.replace(/^(apply\.|careers?\.|jobs?\.|www\.)/, '').split('.')[0];
              if (clean && clean.length >= 2) company = clean.charAt(0).toUpperCase() + clean.slice(1);
            }
          } catch {}
        }

        // 2. Title Extraction
        let title = '';
        const titleEl = document.querySelector(
          '.job-details-jobs-unified-top-card__job-title, .jobs-unified-top-card__job-title, h1.top-card-layout__title, h1.job-title, h1.topcard__title, h1.app-title, .jobsearch-JobInfoHeader-title, [data-automation="job-title"], [data-automation*="title" i], [class*="job-title" i], [class*="jobTitle" i], [class*="position-title" i], h1.t-24, h1, h2'
        ) as HTMLElement;
        if (titleEl && titleEl.innerText?.trim() && titleEl.innerText.trim().length >= 3) {
          const cand = titleEl.innerText.trim();
          if (!isGeneric(cand)) {
            title = cand;
          }
        }

        if (!title && document.title) {
          const cleanedTitle = document.title.replace(/^\(\d+\)\s*/, '');
          const parts = cleanedTitle.split(/[-|•–—]/);
          for (const p of parts) {
            const cand = p.trim();
            if (cand.length >= 3 && !isGeneric(cand) && !/^(linkedin|indeed|glassdoor|google|monster|ziprecruiter)$/i.test(cand)) {
              title = cand;
              break;
            }
          }
        }

        // 3. Description Extraction
        let description = '';
        let hasJobSelectors = false;
        const descEl = document.querySelector(
          '.jobs-description__content, .jobs-box__html-content, .jobs-description, .job-description, #job-details, [data-automation="job-description"], [data-automation*="description" i], [itemprop="description"], [class*="job-description" i], [class*="jobDescription" i], [id*="job-description" i], [class*="job-detail" i], article, main, [role="main"]'
        ) as HTMLElement;

        if (descEl && descEl.innerText && descEl.innerText.trim().length > 100) {
          description = descEl.innerText.trim();
          hasJobSelectors = true;
        } else {
          // Fallback: search containers for highest text length
          const candidates = document.querySelectorAll('div, section');
          let maxLen = 0;
          candidates.forEach((c) => {
            const txt = (c as HTMLElement).innerText?.trim() || '';
            if (txt.length > maxLen && txt.length < 25000) {
              maxLen = txt.length;
              description = txt;
            }
          });
        }

        if (!description && document.body) {
          description = document.body.innerText?.trim() || '';
        }

        // Evaluate whether this page is a legitimate job posting
        let isLikelyJob = false;
        if (tabUrl && atsPatterns.some((p) => p.test(tabUrl)) && description.length >= 80) {
          isLikelyJob = true;
        } else if (hasJobSelectors && description.length >= 80) {
          isLikelyJob = true;
        } else {
          let hits = 0;
          for (const p of jobKeywords) {
            if (p.test(description)) {
              hits++;
              if (hits >= 2) break;
            }
          }
          if (hits >= 2 && description.length >= 80) {
            isLikelyJob = true;
          }
        }

        if (!isLikelyJob) {
          return {
            title: '',
            company: '',
            description: '',
            isDetected: false,
          };
        }

        return {
          title: title || '',
          company: company || '',
          description: description || '',
          isDetected: true,
        };
      },
    });

    const data = results?.[0]?.result;
    if (data && data.isDetected && data.description) {
      currentJob = {
        title: data.title || 'Target Role',
        company: data.company || 'Company',
        description: data.description,
        isDetected: true,
      };

      if (titleEl && currentJob.title) titleEl.value = currentJob.title;
      if (companyEl && currentJob.company) companyEl.value = currentJob.company;
      if (descEl && currentJob.description) descEl.value = currentJob.description;

      const words = currentJob.description ? currentJob.description.split(/\s+/).length : 0;
      if (statusEl) {
        statusEl.innerHTML = `<span class="status-dot"></span><span class="status-msg">Scanned "${currentJob.title}" at ${currentJob.company} (${words} words)</span>`;
        statusEl.className = 'status-banner success';
      }
    } else {
      currentJob = {
        title: '',
        company: '',
        description: '',
        isDetected: false,
      };
      if (titleEl) titleEl.value = '';
      if (companyEl) companyEl.value = '';
      if (descEl) descEl.value = '';

      if (statusEl) {
        statusEl.innerHTML = '<span class="status-dot"></span><span class="status-msg">⚠️ No job posting detected on this page. Navigate to a job listing or paste the job description below.</span>';
        statusEl.className = 'status-banner warning';
      }
    }
  } catch (err: any) {
    if (statusEl) {
      statusEl.innerHTML = `<span class="status-dot"></span><span class="status-msg">Scan error: ${err.message}. Paste job description below.</span>`;
      statusEl.className = 'status-banner warning';
    }
  }
}

async function executeTailoring() {
  const titleEl = document.getElementById('job-title') as HTMLInputElement;
  const companyEl = document.getElementById('job-company') as HTMLInputElement;
  const descEl = document.getElementById('job-description') as HTMLTextAreaElement;
  const statusEl = document.getElementById('tailor-status');
  const resultsCard = document.getElementById('results-card');

  const title = titleEl?.value.trim() || 'Software Engineer';
  const company = companyEl?.value.trim() || 'Target Employer';
  const description = descEl?.value.trim() || '';

  if (!description || description.length < 50) {
    showToast('Please provide a job description (at least 50 characters).', 'error');
    return;
  }

  const profile = await getMasterProfile();
  if (!profile) {
    showToast('Please configure your Master Profile first (Profile tab).', 'error');
    return;
  }

  const settings = await getSettings();
  if (!settings || !settings.apiKey) {
    showToast('Please enter your free Gemini or Groq API key in Settings.', 'error');
    return;
  }

  currentJob = { title, company, description };

  if (statusEl) {
    statusEl.innerHTML = '<span class="spinner"></span> Analyzing JD & Tailoring Resume...';
    statusEl.className = 'status-text loading';
  }

  try {
    currentTailoredResume = await tailorResume(profile, currentJob, settings);

    renderTailoredResults(currentTailoredResume);

    if (resultsCard) resultsCard.style.display = 'block';
    if (statusEl) {
      statusEl.textContent = 'Resume successfully tailored!';
      statusEl.className = 'status-text success';
    }
    showToast('Resume tailored successfully!', 'success');
  } catch (err: any) {
    if (statusEl) {
      statusEl.textContent = `Error: ${err.message}`;
      statusEl.className = 'status-text error';
    }
    showToast(err.message, 'error');
  }
}

function renderTailoredResults(tailored: TailoredResume) {
  const scoreEl = document.getElementById('match-score');
  const matchedSkillsEl = document.getElementById('matched-skills');
  const missingKeywordsEl = document.getElementById('missing-keywords');
  const summaryEl = document.getElementById('tailored-summary-preview');
  const circleEl = document.querySelector('.score-circle') as HTMLElement;

  if (scoreEl) {
    scoreEl.textContent = `${tailored.matchScore}%`;
  }

  if (circleEl) {
    if (tailored.matchScore >= 80) {
      circleEl.style.borderColor = 'rgba(16, 185, 129, 0.6)';
      circleEl.style.background = 'radial-gradient(circle, rgba(16, 185, 129, 0.18) 0%, rgba(16, 185, 129, 0.04) 100%)';
      circleEl.style.boxShadow = '0 0 16px rgba(16, 185, 129, 0.25)';
      if (scoreEl) scoreEl.style.color = '#34d399';
    } else if (tailored.matchScore >= 60) {
      circleEl.style.borderColor = 'rgba(245, 158, 11, 0.6)';
      circleEl.style.background = 'radial-gradient(circle, rgba(245, 158, 11, 0.18) 0%, rgba(245, 158, 11, 0.04) 100%)';
      circleEl.style.boxShadow = '0 0 16px rgba(245, 158, 11, 0.25)';
      if (scoreEl) scoreEl.style.color = '#fbbf24';
    } else {
      circleEl.style.borderColor = 'rgba(239, 68, 68, 0.6)';
      circleEl.style.background = 'radial-gradient(circle, rgba(239, 68, 68, 0.18) 0%, rgba(239, 68, 68, 0.04) 100%)';
      circleEl.style.boxShadow = '0 0 16px rgba(239, 68, 68, 0.25)';
      if (scoreEl) scoreEl.style.color = '#f87171';
    }
  }

  if (matchedSkillsEl) {
    matchedSkillsEl.innerHTML = tailored.matchedSkills
      .map((s) => `<span class="chip chip-green">${s}</span>`)
      .join(' ');
  }

  if (missingKeywordsEl) {
    missingKeywordsEl.innerHTML = (tailored.missingKeywords || [])
      .map((k) => `<span class="chip chip-amber">${k}</span>`)
      .join(' ');
  }

  if (summaryEl) {
    summaryEl.textContent = tailored.tailoredSummary;
  }
}

async function downloadPdf() {
  if (!currentTailoredResume) return;
  const profile = await getMasterProfile();
  if (!profile) return;

  const html = renderAtsHtml(currentTailoredResume, profile.personalInfo);

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 400);
  } else {
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${profile.personalInfo.fullName.replace(/\s+/g, '_')}_Resume_${currentTailoredResume.company.replace(/\s+/g, '_')}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

async function downloadMarkdown() {
  if (!currentTailoredResume) return;
  const profile = await getMasterProfile();
  if (!profile) return;

  const md = formatAsMarkdown(currentTailoredResume, profile.personalInfo);
  const blob = new Blob([md], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${profile.personalInfo.fullName.replace(/\s+/g, '_')}_Resume_${currentTailoredResume.company.replace(/\s+/g, '_')}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

async function copyMarkdown() {
  if (!currentTailoredResume) return;
  const profile = await getMasterProfile();
  if (!profile) return;

  const md = formatAsMarkdown(currentTailoredResume, profile.personalInfo);
  await navigator.clipboard.writeText(md);
  showToast('Markdown copied to clipboard!', 'success');
}

// ------------------- TAB 2: MASTER PROFILE -------------------
function setupProfileTab() {
  const btnSave = document.getElementById('btn-save-profile') as HTMLButtonElement;
  const btnLoadSample = document.getElementById('btn-load-sample') as HTMLButtonElement;
  const btnClear = document.getElementById('btn-clear-profile') as HTMLButtonElement;
  const fileInput = document.getElementById('resume-file-input') as HTMLInputElement;

  btnSave?.addEventListener('click', async () => {
    const profile = readProfileFromForm();
    const validation = validateProfile(profile);
    if (!validation.isValid) {
      showToast(`Cannot save: ${validation.errors.join(', ')}`, 'error');
      return;
    }

    try {
      await saveMasterProfile(profile);
      updateProfileStatusBadge(true);
      showToast('Master Profile saved successfully!', 'success');
    } catch (err: any) {
      showToast(`Save failed: ${err.message}`, 'error');
    }
  });

  btnLoadSample?.addEventListener('click', async () => {
    populateProfileForm(DEMO_SAMPLE_PROFILE);
    await saveMasterProfile(DEMO_SAMPLE_PROFILE);
    updateProfileStatusBadge(true);
    showToast('Loaded demo sample profile!', 'success');
  });

  btnClear?.addEventListener('click', async () => {
    clearProfileForm();
    await clearMasterProfile();
    updateProfileStatusBadge(false);
    showToast('Profile fields and storage cleared.', 'info');
  });

  fileInput?.addEventListener('change', async (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      showToast('Reading and parsing resume file...', 'info');
      let text = '';

      if (file.name.toLowerCase().endsWith('.pdf')) {
        const arrayBuffer = await file.arrayBuffer();
        text = await extractTextFromPdf(arrayBuffer);
        const parsed = parseResumeTextToProfile(text);
        populateProfileForm(parsed);
      } else if (file.name.toLowerCase().endsWith('.json')) {
        const rawJson = await file.text();
        const json = JSON.parse(rawJson);
        populateProfileForm(json);
      } else {
        text = await file.text();
        const parsed = parseResumeTextToProfile(text);
        populateProfileForm(parsed);
      }
      showToast(`Parsed ${file.name} successfully! Click 'Save Profile' to store.`, 'success');
    } catch (err: any) {
      showToast(`Failed to parse file: ${err.message}`, 'error');
    } finally {
      fileInput.value = '';
    }
  });
}

function readProfileFromForm(): MasterProfile {
  const fullName = (document.getElementById('prof-name') as HTMLInputElement)?.value.trim() || '';
  const email = (document.getElementById('prof-email') as HTMLInputElement)?.value.trim() || '';
  const phone = (document.getElementById('prof-phone') as HTMLInputElement)?.value.trim() || '';
  const location = (document.getElementById('prof-location') as HTMLInputElement)?.value.trim() || '';
  const linkedin = (document.getElementById('prof-linkedin') as HTMLInputElement)?.value.trim() || '';
  const github = (document.getElementById('prof-github') as HTMLInputElement)?.value.trim() || '';
  const summary = (document.getElementById('prof-summary') as HTMLTextAreaElement)?.value.trim() || '';
  const skillsText = (document.getElementById('prof-skills') as HTMLTextAreaElement)?.value.trim() || '';
  const expText = (document.getElementById('prof-experience') as HTMLTextAreaElement)?.value.trim() || '';
  const projText = (document.getElementById('prof-projects') as HTMLTextAreaElement)?.value.trim() || '';
  const eduText = (document.getElementById('prof-education') as HTMLTextAreaElement)?.value.trim() || '';
  const certsText = (document.getElementById('prof-certs') as HTMLTextAreaElement)?.value.trim() || '';

  const skills: Record<string, string[]> = {};
  skillsText.split('\n').forEach((line) => {
    const parts = line.split(':');
    if (parts.length === 2) {
      skills[parts[0].trim()] = parts[1].split(',').map((s) => s.trim()).filter(Boolean);
    } else if (line.trim()) {
      skills['Technical Skills'] = [...(skills['Technical Skills'] || []), line.trim()];
    }
  });

  const experience = expText
    .split(/\n\n+/)
    .filter(Boolean)
    .map((block) => {
      const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
      const header = lines[0] || 'Software Engineer | Company';
      const parts = header.split('|').map((s) => s.trim());
      const bullets = lines.slice(1).map((b) => b.replace(/^[*•-]\s*/, ''));
      return {
        role: parts[0] || 'Software Engineer',
        company: parts[1] || 'Company',
        period: parts[2] || '',
        bullets,
      };
    });

  const projects = projText
    .split(/\n\n+/)
    .filter(Boolean)
    .map((block) => {
      const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
      const header = lines[0] || 'Project Name';
      const parts = header.split('|').map((s) => s.trim());
      const bullets = lines.slice(1).map((b) => b.replace(/^[*•-]\s*/, ''));
      return {
        name: parts[0] || 'Project',
        techStack: parts[1] || '',
        bullets,
      };
    });

  const education = eduText
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const parts = line.split('|').map((s) => s.trim());
      return {
        degree: parts[0] || line,
        institution: parts[1] || '',
        year: parts[2] || '',
      };
    });

  const certifications = certsText.split('\n').map((c) => c.trim()).filter(Boolean);

  return {
    personalInfo: { fullName, email, phone, location, linkedin, github },
    summary,
    skills,
    experience,
    projects,
    education,
    certifications,
  };
}

function populateProfileForm(profile: MasterProfile) {
  const setVal = (id: string, val: string) => {
    const el = document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement;
    if (el) el.value = val;
  };

  setVal('prof-name', profile.personalInfo.fullName || '');
  setVal('prof-email', profile.personalInfo.email || '');
  setVal('prof-phone', profile.personalInfo.phone || '');
  setVal('prof-location', profile.personalInfo.location || '');
  setVal('prof-linkedin', profile.personalInfo.linkedin || '');
  setVal('prof-github', profile.personalInfo.github || '');
  setVal('prof-summary', profile.summary || '');

  const skillsLines = Object.entries(profile.skills || {})
    .map(([cat, list]) => `${cat}: ${list.join(', ')}`)
    .join('\n');
  setVal('prof-skills', skillsLines);

  const expBlocks = (profile.experience || [])
    .map((e) => `${e.role} | ${e.company}${e.startDate ? ` | ${e.startDate} – ${e.endDate || 'Present'}` : ''}\n${e.bullets.map((b) => `• ${b}`).join('\n')}`)
    .join('\n\n');
  setVal('prof-experience', expBlocks);

  const projBlocks = (profile.projects || [])
    .map((p) => `${p.name}${p.techStack ? ` | ${p.techStack}` : ''}\n${p.bullets.map((b) => `• ${b}`).join('\n')}`)
    .join('\n\n');
  setVal('prof-projects', projBlocks);

  const eduLines = (profile.education || [])
    .map((ed) => `${ed.degree} | ${ed.institution}${ed.year ? ` | ${ed.year}` : ''}`)
    .join('\n');
  setVal('prof-education', eduLines);

  setVal('prof-certs', (profile.certifications || []).join('\n'));
}

function clearProfileForm() {
  const ids = [
    'prof-name',
    'prof-email',
    'prof-phone',
    'prof-location',
    'prof-linkedin',
    'prof-github',
    'prof-summary',
    'prof-skills',
    'prof-experience',
    'prof-projects',
    'prof-education',
    'prof-certs',
  ];

  ids.forEach((id) => {
    const el = document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement;
    if (el) el.value = '';
  });
}

function updateModelDropdown(provider: 'gemini' | 'groq', currentModel: string = 'auto', customList?: DetailedModelItem[]) {
  const modelSelect = document.getElementById('setting-model-select') as HTMLSelectElement;
  const customInput = document.getElementById('setting-model-custom') as HTMLInputElement;
  if (!modelSelect) return;

  modelSelect.innerHTML = '';

  let list: Array<{ id: string; label: string }> = [];
  if (provider === 'gemini') {
    if (customList && customList.length > 0) {
      list = [
        { id: 'auto', label: DEFAULT_AUTO_MODEL_LABEL },
        ...customList.map((m) => ({ id: m.id, label: m.label })),
      ];
    } else {
      list = GEMINI_DEFAULT_MODELS.map((m) => ({ id: m.id, label: m.label }));
    }
  } else {
    list = GROQ_DEFAULT_MODELS;
  }

  list.forEach((m) => {
    const opt = document.createElement('option');
    opt.value = m.id;
    opt.textContent = m.label;
    modelSelect.appendChild(opt);
  });

  const customOpt = document.createElement('option');
  customOpt.value = 'custom';
  customOpt.textContent = CUSTOM_MODEL_LABEL;
  modelSelect.appendChild(customOpt);

  const match = list.find((m) => m.id === currentModel);
  if (match) {
    modelSelect.value = currentModel;
    if (customInput) customInput.style.display = 'none';
  } else if (currentModel && currentModel !== 'auto') {
    modelSelect.value = 'custom';
    if (customInput) {
      customInput.style.display = 'block';
      customInput.value = currentModel;
    }
  } else {
    modelSelect.value = list[0]?.id || 'auto';
    if (customInput) customInput.style.display = 'none';
  }
}

// ------------------- TAB 3: SETTINGS -------------------
function updateProviderUi(provider: 'gemini' | 'groq') {
  const btnDetect = document.getElementById('btn-detect-model') as HTMLElement;
  const modelTip = document.getElementById('model-tip') as HTMLElement;
  const guideTitle = document.getElementById('help-guide-title') as HTMLElement;
  const guideList = document.getElementById('help-guide-list') as HTMLElement;
  const keyInput = document.getElementById('setting-api-key') as HTMLInputElement;

  if (provider === 'gemini') {
    if (btnDetect) btnDetect.style.display = 'inline-block';
    if (modelTip) modelTip.textContent = 'Tip: Auto-Detect automatically resolves Google\'s newest high-quota text model.';
    if (guideTitle) guideTitle.textContent = '💡 Quick Guide: Get a free Gemini Key';
    if (keyInput) keyInput.placeholder = 'Paste your Google AI Studio API key';
    if (guideList) {
      guideList.innerHTML = `
        <li>Visit <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener">Google AI Studio</a>.</li>
        <li>Sign in with your Google account.</li>
        <li>Click <strong>"Create API Key"</strong> and copy it.</li>
        <li>Paste your key above. It includes generous free daily quota!</li>
      `;
    }
  } else if (provider === 'groq') {
    if (btnDetect) btnDetect.style.display = 'none';
    if (modelTip) modelTip.textContent = 'Tip: Llama 3.3 70B Versatile is optimized for complex resume reasoning and ATS formatting.';
    if (guideTitle) guideTitle.textContent = '⚡ Quick Guide: Get a free Groq Key';
    if (keyInput) keyInput.placeholder = 'gsk_... (Paste your Groq API key)';
    if (guideList) {
      guideList.innerHTML = `
        <li>Visit <a href="https://console.groq.com/keys" target="_blank" rel="noopener">Groq Console</a>.</li>
        <li>Sign in with your Google or GitHub account (instant & 100% free).</li>
        <li>Click <strong>"Create API Key"</strong> and copy it (starts with <code>gsk_...</code>).</li>
        <li>Paste your key above. Enjoy ultra-fast 500+ tokens/sec resume tailoring!</li>
      `;
    }
  }
}

function setupSettingsTab() {
  const btnSave = document.getElementById('btn-save-settings') as HTMLButtonElement;
  const btnDetect = document.getElementById('btn-detect-model') as HTMLButtonElement;
  const providerSelect = document.getElementById('setting-provider') as HTMLSelectElement;
  const modelSelect = document.getElementById('setting-model-select') as HTMLSelectElement;
  const customInput = document.getElementById('setting-model-custom') as HTMLInputElement;

  // Initialize UI based on current selection
  updateModelDropdown((providerSelect?.value as 'gemini' | 'groq') || 'gemini', 'auto');
  updateProviderUi((providerSelect?.value as 'gemini' | 'groq') || 'gemini');

  modelSelect?.addEventListener('change', () => {
    if (modelSelect.value === 'custom') {
      if (customInput) {
        customInput.style.display = 'block';
        customInput.focus();
      }
    } else {
      if (customInput) customInput.style.display = 'none';
    }
  });

  providerSelect?.addEventListener('change', () => {
    const provider = providerSelect.value as 'gemini' | 'groq';
    updateModelDropdown(provider, provider === 'gemini' ? 'auto' : 'llama-3.3-70b-versatile');
    updateProviderUi(provider);
  });

  btnDetect?.addEventListener('click', async () => {
    const provider = providerSelect.value;
    if (provider !== 'gemini') {
      showToast('Model listing is for Google Gemini. For Groq, choose from the list or enter custom ID.', 'info');
      return;
    }
    const apiKey = (document.getElementById('setting-api-key') as HTMLInputElement)?.value.trim() || '';
    if (!apiKey) {
      showToast('Please enter your Gemini API key first to fetch live models.', 'error');
      return;
    }

    const originalText = btnDetect.textContent;
    btnDetect.disabled = true;
    btnDetect.textContent = 'Fetching...';
    try {
      showToast('Querying Google AI Studio for active Flash models with token limits...', 'info');
      const models = await fetchLiveGeminiModels(apiKey);
      if (models.length > 0) {
        updateModelDropdown('gemini', modelSelect?.value || 'auto', models);
        showToast(`Discovered ${models.length} active models with token limits!`, 'success');
      } else {
        showToast('No active text models returned. Default models preserved.', 'info');
      }
    } catch (err: any) {
      showToast(`Model fetch failed: ${err.message}`, 'error');
    } finally {
      btnDetect.disabled = false;
      btnDetect.textContent = originalText;
    }
  });

  btnSave?.addEventListener('click', async () => {
    const provider = (providerSelect.value as 'gemini' | 'groq') || 'gemini';
    const apiKey = (document.getElementById('setting-api-key') as HTMLInputElement)?.value.trim() || '';
    let model = modelSelect?.value || 'auto';
    if (model === 'custom') {
      model = customInput?.value.trim() || (provider === 'gemini' ? 'auto' : 'llama-3.3-70b-versatile');
    }

    if (!apiKey) {
      showToast('Please enter an API key.', 'error');
      return;
    }

    try {
      await saveSettings({ provider, apiKey, model });
      showToast('Settings saved successfully!', 'success');
    } catch (err: any) {
      showToast(`Error saving settings: ${err.message}`, 'error');
    }
  });
}

function populateSettingsForm(settings: ExtensionSettings) {
  const providerEl = document.getElementById('setting-provider') as HTMLSelectElement;
  const apiKeyEl = document.getElementById('setting-api-key') as HTMLInputElement;

  if (providerEl) providerEl.value = settings.provider;
  if (apiKeyEl) apiKeyEl.value = settings.apiKey;
  updateModelDropdown(settings.provider, settings.model);
  updateProviderUi(settings.provider);
}

function showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
  const toast = document.getElementById('toast');
  if (!toast) return;

  toast.textContent = message;
  toast.className = `toast toast-${type} show`;
  setTimeout(() => {
    toast.className = 'toast';
  }, 3500);
}
