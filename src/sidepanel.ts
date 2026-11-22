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
    badge.textContent = 'Profile Ready ✓';
    badge.className = 'badge badge-green';
  } else {
    badge.textContent = 'No Profile Set';
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

  btnFetch?.addEventListener('click', fetchActiveTabJob);
  btnTailor?.addEventListener('click', executeTailoring);
  btnDownloadPdf?.addEventListener('click', downloadPdf);
  btnDownloadMd?.addEventListener('click', downloadMarkdown);
  btnCopyMd?.addEventListener('click', copyMarkdown);
}

async function fetchActiveTabJob() {
  const titleEl = document.getElementById('job-title') as HTMLInputElement;
  const companyEl = document.getElementById('job-company') as HTMLInputElement;
  const descEl = document.getElementById('job-description') as HTMLTextAreaElement;
  const statusEl = document.getElementById('job-detection-status');

  if (statusEl) statusEl.textContent = 'Scanning active page...';

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      if (statusEl) statusEl.textContent = 'No active webpage found.';
      return;
    }

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const titleEl = document.querySelector('h1.job-title, h1.topcard__title, h1') as HTMLElement;
        const compEl = document.querySelector('.company-name, .topcard__flavor--black-link, [data-automation="job-company"]') as HTMLElement;
        const descEl = document.querySelector('.job-description, #job-details, article, main') as HTMLElement;

        return {
          title: titleEl?.innerText?.trim() || document.title,
          company: compEl?.innerText?.trim() || '',
          description: descEl?.innerText?.trim() || document.body?.innerText?.trim() || '',
        };
      },
    });

    const data = results?.[0]?.result;
    if (data && data.description.length > 50) {
      currentJob = {
        title: data.title || 'Target Role',
        company: data.company || 'Company',
        description: data.description,
        isDetected: true,
      };

      if (titleEl) titleEl.value = currentJob.title;
      if (companyEl) companyEl.value = currentJob.company;
      if (descEl) descEl.value = currentJob.description;
      if (statusEl) {
        statusEl.textContent = `Job detected (${currentJob.description.split(/\s+/).length} words)`;
        statusEl.className = 'status-text success';
      }
    } else {
      if (statusEl) {
        statusEl.textContent = 'Could not auto-detect job text. Please paste the job description below.';
        statusEl.className = 'status-text warning';
      }
    }
  } catch (err: any) {
    if (statusEl) {
      statusEl.textContent = 'Paste job description below manually.';
      statusEl.className = 'status-text warning';
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

  if (scoreEl) {
    scoreEl.textContent = `${tailored.matchScore}%`;
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
      const text = await file.text();
      if (file.name.endsWith('.json')) {
        const json = JSON.parse(text);
        populateProfileForm(json);
      } else {
        const parsed = parseResumeTextToProfile(text);
        populateProfileForm(parsed);
      }
      showToast(`Parsed ${file.name} successfully! Click 'Save Profile' to store.`, 'success');
    } catch (err: any) {
      showToast(`Failed to parse file: ${err.message}`, 'error');
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

// ------------------- TAB 3: SETTINGS -------------------
function setupSettingsTab() {
  const btnSave = document.getElementById('btn-save-settings') as HTMLButtonElement;
  const providerSelect = document.getElementById('setting-provider') as HTMLSelectElement;
  const modelInput = document.getElementById('setting-model') as HTMLInputElement;

  providerSelect?.addEventListener('change', () => {
    if (providerSelect.value === 'gemini') {
      modelInput.value = 'gemini-2.0-flash';
    } else if (providerSelect.value === 'groq') {
      modelInput.value = 'llama-3.3-70b-versatile';
    }
  });

  btnSave?.addEventListener('click', async () => {
    const provider = (providerSelect.value as 'gemini' | 'groq') || 'gemini';
    const apiKey = (document.getElementById('setting-api-key') as HTMLInputElement)?.value.trim() || '';
    const model = modelInput.value.trim() || 'gemini-2.0-flash';

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
  const modelEl = document.getElementById('setting-model') as HTMLInputElement;

  if (providerEl) providerEl.value = settings.provider;
  if (apiKeyEl) apiKeyEl.value = settings.apiKey;
  if (modelEl) modelEl.value = settings.model;
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
