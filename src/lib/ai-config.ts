/**
 * Central Google Gemini AI Configuration & Model Management
 * 
 * Provides centralized model selection, dynamic capability discovery,
 * endpoint URL generation, and error sanitization (ensuring API keys
 * are never exposed in UI or logs).
 */

// User-specified primary model: 'gemini-3.1-flash-lite' (overridable via process.env.GEMINI_MODEL)
export const DEFAULT_PRIMARY_MODEL = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';

// Priority order of Gemini models supporting generateContent on v1beta
export const CANDIDATE_GEMINI_MODELS: string[] = [
  ...(process.env.GEMINI_MODEL ? [process.env.GEMINI_MODEL] : []),
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
].filter((m, idx, arr) => Boolean(m) && arr.indexOf(m) === idx);

/**
 * Clean model name by stripping any leading 'models/' prefix
 */
export function cleanModelName(model: string): string {
  return model.replace(/^models\//, '').trim();
}

/**
 * Build the v1beta generateContent endpoint URL
 */
export function getGeminiGenerateContentUrl(model: string, apiKey: string): string {
  const cleanModel = cleanModelName(model);
  return `https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:generateContent?key=${apiKey}`;
}

/**
 * Build the v1beta list models endpoint URL
 */
export function getGeminiListModelsUrl(apiKey: string): string {
  return `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
}

/**
 * Sanitize error messages to guarantee no API keys or sensitive auth tokens are leaked
 */
export function sanitizeGeminiError(errorText: string | any, apiKey?: string): string {
  if (!errorText) return 'Unknown error occurred';
  let sanitized = typeof errorText === 'string' ? errorText : errorText?.message || JSON.stringify(errorText);

  // Redact any URL query parameters with key=...
  sanitized = sanitized.replace(/key=[a-zA-Z0-9_\-]+/gi, 'key=[REDACTED]');

  // Redact standard Google API key format (AIzaSy...)
  sanitized = sanitized.replace(/AIza[0-9A-Za-z\-_]{35}/g, '[REDACTED_API_KEY]');

  // Redact explicit apiKey if provided
  if (apiKey && apiKey.trim()) {
    sanitized = sanitized.split(apiKey.trim()).join('[REDACTED_API_KEY]');
  }

  return sanitized;
}

/**
 * In-memory model cache to prevent repeated GET /models queries during active operations
 */
let cachedModelsState: {
  models: string[];
  resolvedModel: string;
  timestamp: number;
} | null = null;

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch list of all models supporting 'generateContent' from the Gemini API
 */
export async function fetchAvailableGeminiModels(apiKey: string): Promise<{
  models: string[];
  error?: string;
}> {
  if (!apiKey || apiKey.trim() === '') {
    return { models: [], error: 'GEMINI_API_KEY is not configured.' };
  }

  try {
    const url = getGeminiListModelsUrl(apiKey);
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!res.ok) {
      const errText = await res.text();
      return {
        models: [],
        error: sanitizeGeminiError(`Gemini models check HTTP ${res.status}: ${errText}`, apiKey),
      };
    }

    const data = await res.json();
    if (!data || !Array.isArray(data.models)) {
      return { models: [], error: 'Invalid response format from Gemini models endpoint.' };
    }

    // Filter models supporting generateContent
    const available = data.models
      .filter((m: any) => {
        if (!m || !m.name) return false;
        if (Array.isArray(m.supportedGenerationMethods)) {
          return m.supportedGenerationMethods.includes('generateContent');
        }
        return true;
      })
      .map((m: any) => cleanModelName(m.name));

    return { models: available };
  } catch (err: any) {
    return {
      models: [],
      error: sanitizeGeminiError(err?.message || 'Failed to connect to Gemini models endpoint', apiKey),
    };
  }
}

/**
 * Determine the best Gemini model available for the given API key.
 * First checks available models from the Gemini API, then matches against
 * candidate models (gemini-3.1-flash-lite, gemini-2.5-flash, gemini-2.0-flash).
 */
export async function resolveGeminiModel(apiKey: string): Promise<{
  selectedModel: string;
  candidatesToTry: string[];
  verifiedViaApi: boolean;
  modelsFound?: string[];
  verificationError?: string;
}> {
  // Check memory cache
  if (cachedModelsState && Date.now() - cachedModelsState.timestamp < CACHE_TTL_MS) {
    return {
      selectedModel: cachedModelsState.resolvedModel,
      candidatesToTry: CANDIDATE_GEMINI_MODELS,
      verifiedViaApi: true,
      modelsFound: cachedModelsState.models,
    };
  }

  const { models, error } = await fetchAvailableGeminiModels(apiKey);

  if (models.length > 0) {
    // Check candidate models against discovered available models
    let bestModel: string | null = null;

    for (const candidate of CANDIDATE_GEMINI_MODELS) {
      if (models.includes(candidate)) {
        bestModel = candidate;
        break;
      }
    }

    // If none matched exactly, check for candidate substrings or any flash model
    if (!bestModel) {
      bestModel =
        models.find((m) => m.includes('3.1-flash-lite')) ||
        models.find((m) => m.includes('2.5-flash')) ||
        models.find((m) => m.includes('2.0-flash')) ||
        models.find((m) => m.includes('flash')) ||
        models[0];
    }

    // Construct ordered list prioritizing the verified best model
    const orderedCandidates = [
      bestModel,
      ...CANDIDATE_GEMINI_MODELS.filter((m) => m !== bestModel),
    ];

    cachedModelsState = {
      models,
      resolvedModel: bestModel,
      timestamp: Date.now(),
    };

    return {
      selectedModel: bestModel,
      candidatesToTry: orderedCandidates,
      verifiedViaApi: true,
      modelsFound: models,
    };
  }

  // If dynamic models endpoint failed or returned empty, return candidate chain
  return {
    selectedModel: DEFAULT_PRIMARY_MODEL,
    candidatesToTry: CANDIDATE_GEMINI_MODELS,
    verifiedViaApi: false,
    verificationError: error,
  };
}
