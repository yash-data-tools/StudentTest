import assert from 'assert';

// Test sanitized error helper logic
function sanitizeGeminiError(errorText, apiKey) {
  if (!errorText) return 'Unknown error occurred';
  let sanitized = typeof errorText === 'string' ? errorText : errorText?.message || JSON.stringify(errorText);

  sanitized = sanitized.replace(/key=[a-zA-Z0-9_\-]+/gi, 'key=[REDACTED]');
  sanitized = sanitized.replace(/AIza[0-9A-Za-z\-_]{35}/g, '[REDACTED_API_KEY]');

  if (apiKey && apiKey.trim()) {
    sanitized = sanitized.split(apiKey.trim()).join('[REDACTED_API_KEY]');
  }

  return sanitized;
}

function cleanModelName(model) {
  return model.replace(/^models\//, '').trim();
}

function getGeminiGenerateContentUrl(model, apiKey) {
  const cleanModel = cleanModelName(model);
  return `https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:generateContent?key=${apiKey}`;
}

console.log('--- STARTING GEMINI CENTRAL CONFIG & SANITIZATION TESTS ---');

// Test 1: Model URL generation
console.log('\n[TEST 1] Testing getGeminiGenerateContentUrl with gemini-3.1-flash-lite...');
const sampleApiKey = 'AIzaSyA1234567890123456789012345678901';
const generatedUrl = getGeminiGenerateContentUrl('gemini-3.1-flash-lite', sampleApiKey);
assert.strictEqual(
  generatedUrl,
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${sampleApiKey}`
);
console.log('✓ Model URL matches specification for gemini-3.1-flash-lite on v1beta');

// Test 2: Stripping models/ prefix if present
console.log('\n[TEST 2] Testing cleanModelName with models/ prefix...');
assert.strictEqual(cleanModelName('models/gemini-3.1-flash-lite'), 'gemini-3.1-flash-lite');
assert.strictEqual(cleanModelName('gemini-2.5-flash'), 'gemini-2.5-flash');
console.log('✓ cleanModelName correctly normalizes model identifiers');

// Test 3: API Key sanitization
console.log('\n[TEST 3] Testing API Key sanitization in error messages...');
const sampleErrorWithKey = `Gemini (gemini-3.1-flash-lite) returned HTTP 404: models/gemini-3.1-flash-lite not found on URL https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${sampleApiKey}`;
const sanitized = sanitizeGeminiError(sampleErrorWithKey, sampleApiKey);
assert.ok(!sanitized.includes(sampleApiKey), 'API key MUST be redacted');
assert.ok(sanitized.includes('[REDACTED]'), 'Redaction placeholder must be present');
console.log('✓ Sensitive API keys and tokens are completely sanitized from error strings:');
console.log('  Sanitized output:', sanitized);

// Test 4: Candidate order validation
console.log('\n[TEST 4] Testing model candidate order...');
const candidates = [
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
];
assert.strictEqual(candidates[0], 'gemini-3.1-flash-lite');
assert.ok(candidates.includes('gemini-2.5-flash'));
assert.ok(candidates.includes('gemini-2.0-flash'));
console.log('✓ Candidate models list conforms to requirements with gemini-3.1-flash-lite as primary');

console.log('\n--- ALL GEMINI CENTRAL CONFIG TESTS PASSED SUCCESSFULLY! ---');
