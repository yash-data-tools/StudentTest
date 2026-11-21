import assert from 'assert';
import {
  CANONICAL_QUESTION_TYPES,
  QUESTION_TYPE_ALIASES,
  normalizeQuestionType,
  normalizeToleranceType,
  normalizeDifficulty,
  sanitizeDbErrorMessage,
} from '../src/lib/question-types.ts';

console.log('--- STARTING QUESTION TYPE NORMALIZATION & CONSTRAINT TESTS ---');

// Test 1: Verify all 10 canonical question types
console.log('\n[TEST 1] Verifying all 10 canonical question types in database schema...');
assert.strictEqual(CANONICAL_QUESTION_TYPES.length, 10);
const expectedTypes = [
  'mcq_single',
  'mcq_multiple',
  'numerical',
  'true_false',
  'short_answer',
  'long_answer',
  'derivation',
  'diagram',
  'assertion_reason',
  'match_following',
];
for (const t of expectedTypes) {
  assert.ok(CANONICAL_QUESTION_TYPES.includes(t), `Canonical list must include ${t}`);
  const result = normalizeQuestionType(t, 1);
  assert.strictEqual(result.valid, true);
  assert.strictEqual(result.questionType, t);
}
console.log('✓ All 10 canonical question types validate and normalize identically');

// Test 2: Alias and variant mapping
console.log('\n[TEST 2] Testing normalization of common aliases, AI outputs, and user variants...');
const aliasTestCases = [
  { raw: 'mcq', expected: 'mcq_single' },
  { raw: 'single_choice', expected: 'mcq_single' },
  { raw: 'SCQ', expected: 'mcq_single' },
  { raw: 'single-correct', expected: 'mcq_single' },
  { raw: 'multiple_choice', expected: 'mcq_multiple' },
  { raw: 'multi_correct', expected: 'mcq_multiple' },
  { raw: 'checkbox', expected: 'mcq_multiple' },
  { raw: 'numeric', expected: 'numerical' },
  { raw: 'integer', expected: 'numerical' },
  { raw: 'numerical_value', expected: 'numerical' },
  { raw: 'true/false', expected: 'true_false' },
  { raw: 'tf', expected: 'true_false' },
  { raw: 'boolean', expected: 'true_false' },
  { raw: 'short', expected: 'short_answer' },
  { raw: 'brief_answer', expected: 'short_answer' },
  { raw: 'descriptive', expected: 'long_answer' },
  { raw: 'subjective', expected: 'long_answer' },
  { raw: 'essay', expected: 'long_answer' },
  { raw: 'proof', expected: 'derivation' },
  { raw: 'derive', expected: 'derivation' },
  { raw: 'drawing', expected: 'diagram' },
  { raw: 'sketch', expected: 'diagram' },
  { raw: 'graph', expected: 'diagram' },
  { raw: 'assertion-reason', expected: 'assertion_reason' },
  { raw: 'ar', expected: 'assertion_reason' },
  { raw: 'match_the_following', expected: 'match_following' },
  { raw: 'matrix_match', expected: 'match_following' },
];

for (const tc of aliasTestCases) {
  const res = normalizeQuestionType(tc.raw);
  assert.strictEqual(res.valid, true, `Expected valid for "${tc.raw}"`);
  assert.strictEqual(res.questionType, tc.expected, `Expected "${tc.raw}" to map to "${tc.expected}"`);
}
console.log(`✓ All ${aliasTestCases.length} aliases correctly normalized to canonical database values`);

// Test 3: Explicit rejection of unsupported question types (Requirement 6)
console.log('\n[TEST 3] Testing explicit rejection of unsupported question types...');
const invalidTypes = ['fill_in_the_blanks', 'audio_listening', 'drag_and_drop', 'unknown_type', '', null, undefined];
for (const inv of invalidTypes) {
  const res = normalizeQuestionType(inv, 5);
  assert.strictEqual(res.valid, false, `Expected invalid for unsupported type "${inv}"`);
  assert.ok(res.error, 'Error message must be present');
  assert.ok(res.error.includes('#5'), 'Error must identify the question number');
}
console.log('✓ Unsupported question types are rejected explicitly with question identification');

// Test 4: Tolerance type and difficulty normalization
console.log('\n[TEST 4] Testing tolerance type and difficulty normalization...');
assert.strictEqual(normalizeToleranceType('exact'), 'exact');
assert.strictEqual(normalizeToleranceType('absolute'), 'absolute');
assert.strictEqual(normalizeToleranceType('range'), 'range');
assert.strictEqual(normalizeToleranceType('relative'), 'exact');
assert.strictEqual(normalizeToleranceType(null), 'exact');

assert.strictEqual(normalizeDifficulty('easy'), 'easy');
assert.strictEqual(normalizeDifficulty('medium'), 'medium');
assert.strictEqual(normalizeDifficulty('hard'), 'hard');
assert.strictEqual(normalizeDifficulty('mixed'), 'mixed');
assert.strictEqual(normalizeDifficulty('extreme'), 'medium');
console.log('✓ Tolerance types and difficulty levels adhere strictly to PostgreSQL CHECK constraints');

// Test 5: Database error sanitization (Requirement 8)
console.log('\n[TEST 5] Testing error message sanitization...');
const rawPgError = 'new row for relation "questions" violates check constraint "questions_question_type_check"';
const sanitizedMsg = sanitizeDbErrorMessage(rawPgError);
assert.ok(sanitizedMsg.includes('invalid or unsupported question_type'));

const connError = 'connection error to postgresql://admin:secretPass123@db.supabase.co:5432/postgres failed';
const sanitizedConn = sanitizeDbErrorMessage(connError);
assert.ok(!sanitizedConn.includes('secretPass123'), 'Passwords must be redacted');
console.log('✓ Database errors are sanitized and provide clear context without leaking credentials');

// Test 6: Simulating a 34-question exam paper (Requirement 9)
console.log('\n[TEST 6] Simulating an extracted paper with 34 questions across all types...');
const sample34Questions = [];
for (let i = 1; i <= 34; i++) {
  const typeIndex = (i - 1) % CANONICAL_QUESTION_TYPES.length;
  sample34Questions.push({
    question_number: i,
    question_text: `Test Question #${i} with detailed instructions.`,
    question_type: CANONICAL_QUESTION_TYPES[typeIndex],
    marks: (i % 4) + 1,
    negative_marks: typeIndex === 0 ? 1 : 0,
    numerical_tolerance_type: 'exact',
  });
}

assert.strictEqual(sample34Questions.length, 34);
for (const q of sample34Questions) {
  const check = normalizeQuestionType(q.question_type, q.question_number);
  assert.strictEqual(check.valid, true);
  assert.ok(CANONICAL_QUESTION_TYPES.includes(check.questionType));
}
console.log('✓ All 34 questions in simulated exam paper cleanly validated against database constraints');

console.log('\n--- ALL QUESTION TYPE NORMALIZATION TESTS PASSED! ---');
