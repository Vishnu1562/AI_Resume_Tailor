import type {
  MasterProfile,
  JobContext,
  ExtensionSettings,
  TailoredResume,
} from '../types/index.js';
import {
  discoverLatestGeminiModel,
  getGeminiFlashModelCascade,
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
  try {
    return JSON.parse(cleaned);
  } catch (_) {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
    throw new Error('AI returned invalid JSON format. Please retry.');
  }
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

    let candidateModels: string[] = [];
    if (configuredModel === 'auto') {
      candidateModels = await getGeminiFlashModelCascade(settings.apiKey);
    } else {
      candidateModels = [configuredModel];
    }

    const callGemini = async (targetModel: string, useJsonMimeType: boolean = true) => {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${settings.apiKey}`;
      const body: any = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
        },
      };
      if (useJsonMimeType) {
        body.generationConfig.responseMimeType = 'application/json';
      }
      return await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    };

    let res: Response | null = null;
    let lastErrorMessage = '';
    let usedModel = candidateModels[0];

    for (let i = 0; i < candidateModels.length; i++) {
      const targetModel = candidateModels[i];
      usedModel = targetModel;
      res = await callGemini(targetModel, true);

      if (res.ok) {
        break;
      }

      let errData = await res.json().catch(() => ({}));
      lastErrorMessage = errData?.error?.message || `HTTP ${res.status} ${res.statusText}`;

      // If the model does not support JSON mode (e.g. "JSON mode is not enabled for this model"),
      // immediately retry without responseMimeType!
      if (
        lastErrorMessage.toLowerCase().includes('json mode is not enabled') ||
        lastErrorMessage.toLowerCase().includes('response_mime_type is not supported')
      ) {
        console.warn(`Model ${targetModel} does not support JSON mode. Retrying without responseMimeType...`);
        res = await callGemini(targetModel, false);
        if (res.ok) {
          break;
        }
        errData = await res.json().catch(() => ({}));
        lastErrorMessage = errData?.error?.message || `HTTP ${res.status} ${res.statusText}`;
      }

      // Check if error is high demand / capacity spike
      const isHighDemandOrOverloaded =
        res.status === 503 ||
        lastErrorMessage.toLowerCase().includes('high demand') ||
        lastErrorMessage.toLowerCase().includes('spikes in demand') ||
        lastErrorMessage.toLowerCase().includes('overloaded');

      // Check if error is model deprecated / not found / unsupported method
      const isUnavailableOrNotFound =
        res.status === 404 ||
        lastErrorMessage.includes('no longer available') ||
        lastErrorMessage.includes('not found') ||
        lastErrorMessage.includes('deprecated') ||
        lastErrorMessage.includes('not supported for generateContent');

      if (isHighDemandOrOverloaded || isUnavailableOrNotFound) {
        // If we reached the end of current candidate list, query Google's live endpoint
        if (i >= candidateModels.length - 1) {
          console.warn(
            `Model ${targetModel} issue (${lastErrorMessage}). Querying Google AI Studio for live active models...`
          );
          const liveModels = await getGeminiFlashModelCascade(settings.apiKey);
          const untried = liveModels.filter((m) => !candidateModels.includes(m));
          if (untried.length > 0) {
            candidateModels.push(...untried);
            continue;
          }
        } else {
          console.warn(
            `Model ${targetModel} issue (${lastErrorMessage}). Cascading to next live model ${candidateModels[i + 1]}...`
          );
          continue;
        }
      }

      // If it's a non-recoverable error (e.g. invalid API key 400/403 or quota 429), break
      break;
    }

    if (!res || !res.ok) {
      throw new Error(`Gemini API Error: ${lastErrorMessage}`);
    }

    // Auto-save the recovered live model if it differs from the failed configured model
    if (usedModel && usedModel !== configuredModel && configuredModel !== 'auto') {
      try {
        const { saveSettings } = await import('../storage/profileStorage.js');
        await saveSettings({ ...settings, model: usedModel });
      } catch (_) {}
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
