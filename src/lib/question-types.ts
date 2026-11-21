/**
 * Central Question Types, Aliases, Normalization, and Constraint Mapping
 * Ensures full alignment between frontend editors, AI extraction,
 * and PostgreSQL relation "questions" CHECK constraints.
 */

export const CANONICAL_QUESTION_TYPES = [
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
] as const;

export type QuestionType = (typeof CANONICAL_QUESTION_TYPES)[number];
export type CanonicalQuestionType = QuestionType;

/**
 * Normalization map covering all common variants, abbreviations,
 * AI outputs, and user aliases.
 */
export const QUESTION_TYPE_ALIASES: Record<string, CanonicalQuestionType> = {
  // Single-correct MCQ
  'mcq_single': 'mcq_single',
  'mcq': 'mcq_single',
  'scq': 'mcq_single',
  'single_choice': 'mcq_single',
  'single_correct': 'mcq_single',
  'single-choice': 'mcq_single',
  'single-correct': 'mcq_single',
  'multiple_choice_single': 'mcq_single',
  'radio': 'mcq_single',

  // Multiple-correct MCQ
  'mcq_multiple': 'mcq_multiple',
  'multiple_correct': 'mcq_multiple',
  'multiple_choice': 'mcq_multiple',
  'multi_correct': 'mcq_multiple',
  'multi_choice': 'mcq_multiple',
  'multiple-choice': 'mcq_multiple',
  'multi-select': 'mcq_multiple',
  'multiselect': 'mcq_multiple',
  'checkbox': 'mcq_multiple',
  'more_than_one_correct': 'mcq_multiple',

  // Numerical
  'numerical': 'numerical',
  'numeric': 'numerical',
  'number': 'numerical',
  'integer': 'numerical',
  'decimal': 'numerical',
  'numerical_value': 'numerical',
  'numerical_answer': 'numerical',
  'calculation': 'numerical',

  // True / False
  'true_false': 'true_false',
  'true-false': 'true_false',
  'true/false': 'true_false',
  'tf': 'true_false',
  't_f': 'true_false',
  'boolean': 'true_false',

  // Short Answer
  'short_answer': 'short_answer',
  'short-answer': 'short_answer',
  'short': 'short_answer',
  'brief': 'short_answer',
  'brief_answer': 'short_answer',
  'one_word': 'short_answer',
  'conceptual': 'short_answer',

  // Long Answer / Descriptive
  'long_answer': 'long_answer',
  'long-answer': 'long_answer',
  'long': 'long_answer',
  'descriptive': 'long_answer',
  'subjective': 'long_answer',
  'essay': 'long_answer',
  'theory': 'long_answer',
  'written': 'long_answer',

  // Derivation / Proof
  'derivation': 'derivation',
  'derive': 'derivation',
  'proof': 'derivation',
  'prove': 'derivation',
  'theorem': 'derivation',
  'mathematical_proof': 'derivation',

  // Diagram
  'diagram': 'diagram',
  'diagram_based': 'diagram',
  'drawing': 'diagram',
  'draw': 'diagram',
  'sketch': 'diagram',
  'figure': 'diagram',
  'graph': 'diagram',

  // Assertion - Reason
  'assertion_reason': 'assertion_reason',
  'assertion-reason': 'assertion_reason',
  'assertion_and_reason': 'assertion_reason',
  'assertion': 'assertion_reason',
  'reasoning': 'assertion_reason',
  'ar': 'assertion_reason',

  // Match the Following
  'match_following': 'match_following',
  'match-following': 'match_following',
  'match_the_following': 'match_following',
  'matching': 'match_following',
  'match': 'match_following',
  'matrix_match': 'match_following',
  'column_match': 'match_following',
};

/**
 * Validate and normalize question type.
 * Returns an explicit error if the question type is unsupported,
 * avoiding silent mapping to incorrect types.
 */
export function normalizeQuestionType(
  rawType: unknown,
  questionNumber?: number
): {
  valid: boolean;
  questionType?: CanonicalQuestionType;
  error?: string;
} {
  if (typeof rawType !== 'string' || !rawType.trim()) {
    return {
      valid: false,
      error: `Question ${questionNumber !== undefined ? `#${questionNumber}` : ''}: Question type is missing or invalid.`,
    };
  }

  const normalized = rawType.trim().toLowerCase().replace(/\s+/g, '_');
  const mapped = QUESTION_TYPE_ALIASES[normalized];

  if (mapped) {
    return {
      valid: true,
      questionType: mapped,
    };
  }

  return {
    valid: false,
    error: `Question ${questionNumber !== undefined ? `#${questionNumber}` : ''}: Unsupported question type "${rawType}". Supported types are: ${CANONICAL_QUESTION_TYPES.join(', ')}.`,
  };
}

/**
 * Validate and normalize numerical tolerance type to match PostgreSQL CHECK constraint:
 * CHECK (numerical_tolerance_type IN ('exact', 'absolute', 'range'))
 */
export function normalizeToleranceType(rawType: unknown): 'exact' | 'absolute' | 'range' {
  if (typeof rawType !== 'string') return 'exact';
  const clean = rawType.trim().toLowerCase();
  if (clean === 'absolute' || clean === 'range' || clean === 'exact') {
    return clean;
  }
  return 'exact';
}

/**
 * Validate difficulty to match PostgreSQL CHECK constraint:
 * CHECK (difficulty IN ('easy', 'medium', 'hard', 'mixed'))
 */
export function normalizeDifficulty(rawDiff: unknown): 'easy' | 'medium' | 'hard' | 'mixed' {
  if (typeof rawDiff !== 'string') return 'medium';
  const clean = rawDiff.trim().toLowerCase();
  if (clean === 'easy' || clean === 'medium' || clean === 'hard' || clean === 'mixed') {
    return clean;
  }
  return 'medium';
}

/**
 * Sanitize database error messages to prevent exposing internal connection details or sensitive credentials
 */
export function sanitizeDbErrorMessage(errorText: string | any): string {
  if (!errorText) return 'Database operation failed.';
  let safe = typeof errorText === 'string' ? errorText : errorText?.message || JSON.stringify(errorText);

  if (safe.includes('violates check constraint')) {
    const match = safe.match(/violates check constraint "([^"]+)"/);
    const constraintName = match ? match[1] : '';
    if (constraintName.includes('question_type')) {
      return 'Database constraint error: One or more questions contain an invalid or unsupported question_type.';
    }
    if (constraintName.includes('numerical_tolerance_type')) {
      return 'Database constraint error: Invalid numerical_tolerance_type.';
    }
    if (constraintName.includes('difficulty')) {
      return 'Database constraint error: Invalid difficulty level.';
    }
    return `Database check constraint violation on relation "questions" (${constraintName || 'check constraint'}).`;
  }

  // Redact DB credentials
  safe = safe.replace(/postgres(?:ql)?:\/\/[^\s]+/gi, '[REDACTED_DB_URL]');
  safe = safe.replace(/password=[^\s]+/gi, 'password=[REDACTED]');
  return safe;
}
