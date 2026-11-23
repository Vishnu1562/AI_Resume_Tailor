import type {
  MasterProfile,
  JobContext,
  ExtensionSettings,
  TailoredResume,
} from '../types/index.js';
import {
  discoverLatestGeminiModel,
  getGeminiFlashModelCascade,
  FALLBACK_CASCADE,
} from './geminiService.js';

export function buildPrompt(profile: MasterProfile, job: JobContext): string {
  return `You are an elite ATS Resume Optimization & Career Architecture AI.
Your objective is to tailor the candidate's verified profile specifically for the target job description while strictly adhering to FACTUAL INTEGRITY.

CRITICAL GROUNDING RULES:
1. DO NOT invent or hallucinate any employer, client, institution, job title, degree, date, or certification.
2. Candidate's actual work experience at "${profile.experience.map((e) => e.company).join(', ')}" is immutable ground truth.
3. Permitted actions:
   - Re-weight and rewrite the Professional Summary to directly speak to the target role's core requirements.
   - Categorize and prioritize Technical Skills, placing the JD's exact matching technologies first.
   - Refine and elevate bullet points in Experience and Projects to emphasize relevant technologies and achievements matching the JD.
   - Calculate an objective ATS match score (0-100) and identify matched vs missing skills.

---
TARGET JOB DETAILS:
Role: ${job.title}
Company: ${job.company}
Job Description:
${job.description}

---
CANDIDATE MASTER PROFILE (FACTUAL GROUND TRUTH):
${JSON.stringify(profile, null, 2)}

---
OUTPUT REQUIREMENTS:
Respond ONLY with a valid JSON object strictly matching this schema, without any prose or markdown wrappers:
{
  "matchScore": number,
  "matchedSkills": string[],
  "missingKeywords": string[],
  "tailoredSummary": string,
  "prioritizedSkills": {
    "Category Name": string[]
  },
  "experience": [
    {
      "company": string,
      "role": string,
      "location": string,
      "period": string,
      "bullets": string[]
    }
  ],
  "projects": [
    {
      "name": string,
      "techStack": string,
      "bullets": string[]
    }
  ]
}`;
}

export function cleanJsonOutput(rawText: string): any {
  let cleaned = rawText.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  return JSON.parse(cleaned);
}

export async function tailorResume(
  profile: MasterProfile,
  job: JobContext,
  settings: ExtensionSettings
): Promise<TailoredResume> {
  if (!settings.apiKey || settings.apiKey.trim() === '') {
    throw new Error('API key is required. Please set your free Gemini or Groq API key in Settings.');
  }

  const prompt = buildPrompt(profile, job);

  let rawJsonText = '';

  if (settings.provider === 'gemini') {
    let configuredModel = settings.model || 'gemini-3.8-flash';
    if (configuredModel === 'gemini-2.0-flash') {
      configuredModel = 'gemini-3.8-flash';
    }

    let candidateModels: string[] = [];
    if (configuredModel === 'auto') {
      candidateModels = await getGeminiFlashModelCascade(settings.apiKey);
    } else {
      candidateModels = [configuredModel, ...FALLBACK_CASCADE.filter((m) => m !== configuredModel)];
    }

    const callGemini = async (targetModel: string) => {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${settings.apiKey}`;
      return await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.2,
          },
        }),
      });
    };

    let res: Response | null = null;
    let lastErrorMessage = '';

    for (let i = 0; i < candidateModels.length; i++) {
      const targetModel = candidateModels[i];
      res = await callGemini(targetModel);

      if (res.ok) {
        break;
      }

      const errData = await res.json().catch(() => ({}));
      lastErrorMessage = errData?.error?.message || `HTTP ${res.status} ${res.statusText}`;

      // Check if the error indicates model deprecation / unavailability
      const isDeprecated =
        lastErrorMessage.includes('no longer available') ||
        lastErrorMessage.includes('not found') ||
        lastErrorMessage.includes('deprecated');

      if (isDeprecated) {
        console.warn(`Model ${targetModel} unavailable, discovering newest Flash model...`);
        const latestModel = await discoverLatestGeminiModel(settings.apiKey);
        if (latestModel && latestModel !== targetModel) {
          res = await callGemini(latestModel);
          if (res.ok) {
            try {
              const { saveSettings } = await import('../storage/profileStorage.js');
              await saveSettings({ ...settings, model: latestModel });
            } catch (_) {}
            break;
          }
        }
      }

      // Check if the model is experiencing high demand / capacity shedding
      const isHighDemandOrOverloaded =
        res.status === 503 ||
        lastErrorMessage.toLowerCase().includes('high demand') ||
        lastErrorMessage.toLowerCase().includes('spikes in demand') ||
        lastErrorMessage.toLowerCase().includes('overloaded');

      if (isHighDemandOrOverloaded && i < candidateModels.length - 1) {
        console.warn(
          `Model ${targetModel} experiencing high demand (${lastErrorMessage}). Cascading to ${candidateModels[i + 1]}...`
        );
        continue;
      }

      // If it's another non-recoverable error, break immediately
      break;
    }

    if (!res || !res.ok) {
      throw new Error(`Gemini API Error: ${lastErrorMessage}`);
    }

    const data = await res.json();
    rawJsonText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  } else if (settings.provider === 'groq') {
    const model = settings.model || 'llama-3.3-70b-versatile';
    const url = 'https://api.groq.com/openai/v1/chat/completions';

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${settings.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.2,
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const message = errData?.error?.message || `HTTP ${res.status} ${res.statusText}`;
      throw new Error(`Groq API Error: ${message}`);
    }

    const data = await res.json();
    rawJsonText = data?.choices?.[0]?.message?.content || '';
  } else {
    throw new Error(`Unsupported provider: ${settings.provider}`);
  }

  if (!rawJsonText) {
    throw new Error('AI returned an empty response. Please retry.');
  }

  const parsed = cleanJsonOutput(rawJsonText);

  return {
    jobTitle: job.title,
    company: job.company,
    matchScore: parsed.matchScore || 85,
    matchedSkills: parsed.matchedSkills || [],
    missingKeywords: parsed.missingKeywords || [],
    tailoredSummary: parsed.tailoredSummary || profile.summary,
    prioritizedSkills: parsed.prioritizedSkills || profile.skills,
    experience: parsed.experience || profile.experience.map((e) => ({
      company: e.company,
      role: e.role,
      location: e.location,
      period: `${e.startDate || ''} – ${e.endDate || ''}`.trim(),
      bullets: e.bullets,
    })),
    projects: parsed.projects || profile.projects.map((p) => ({
      name: p.name,
      techStack: p.techStack,
      bullets: p.bullets,
    })),
    education: profile.education,
    certifications: profile.certifications,
    honors: profile.honors,
  };
}
