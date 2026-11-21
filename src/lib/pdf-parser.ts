import {
  resolveGeminiModel,
  getGeminiGenerateContentUrl,
  sanitizeGeminiError,
} from '@/lib/ai-config';

export type QuestionType =
  | 'mcq_single'
  | 'mcq_multiple'
  | 'numerical'
  | 'true_false'
  | 'short_answer'
  | 'long_answer'
  | 'derivation'
  | 'diagram'
  | 'assertion_reason'
  | 'match_following';

export interface ExtractedQuestion {
  id?: string;
  question_number: number;
  question_text: string;
  question_type: QuestionType;
  marks: number;
  negative_marks: number;
  options: { option_letter: string; option_text: string; is_correct: boolean }[];
  numerical_answer?: number | null;
  numerical_tolerance?: number;
  numerical_tolerance_type?: 'exact' | 'absolute' | 'range';
  numerical_unit?: string | null;
  assertion_text?: string | null;
  reason_text?: string | null;
  matching_pairs?: { left: string; right: string }[] | null;
  explanation?: string;
  rubric?: string[];
  allow_handwritten?: boolean;
  allow_typed?: boolean;
  image_url?: string | null;
  ai_confidence: number;
  requires_verification: boolean;
  source_page?: number;
}

export interface ParsedExamData {
  title: string;
  subject: string;
  chapter?: string;
  total_marks: number;
  duration_minutes: number;
  exam_mode: 'teacher_reviewed' | 'instant_quick_test';
  questions: ExtractedQuestion[];
  raw_text: string;
  is_scanned: boolean;
  extraction_method: 'gemini_multimodal' | 'heuristic_fallback';
  ai_status: 'success' | 'failed' | 'not_configured';
  ai_error_details?: string;
  warning?: string;
  diagnostics: {
    text_length: number;
    pages_detected: number;
    is_scanned: boolean;
    gemini_attempted: boolean;
    gemini_model_used?: string;
    questions_count: number;
  };
}

/**
 * Step 1: Extract plain text from PDF buffer
 */
export async function extractTextFromPdf(
  buffer: Buffer
): Promise<{ text: string; numPages: number; isScanned: boolean }> {
  try {
    const pdfModule = await import('pdf-parse');

    // Handle pdf-parse v2 (PDFParse class)
    if (pdfModule.PDFParse) {
      const parser = new (pdfModule as any).PDFParse({ data: buffer });
      const textResult = await parser.getText();
      const rawText =
        typeof textResult === 'string'
          ? textResult
          : typeof textResult?.text === 'string'
          ? textResult.text
          : '';

      // Clean page footer markings added by pdf-parse v2 like "-- 1 of 3 --"
      const cleanedText = rawText.replace(/--\s*\d+\s+of\s+\d+\s*--/gi, '').trim();
      const numPages = Number(textResult?.total) || 1;
      const isScanned = cleanedText.length < 50;

      return { text: cleanedText, numPages, isScanned };
    }

    // Handle legacy functional pdf-parse
    const parseFn = (pdfModule as any).default || pdfModule;
    if (typeof parseFn === 'function') {
      const data = await parseFn(buffer);
      const text = (data.text || '').trim();
      return { text, numPages: data.numpages || 1, isScanned: text.length < 50 };
    }

    return { text: '', numPages: 1, isScanned: true };
  } catch (err: any) {
    console.warn('[PDF Text Extraction] Note: text extraction library encounter:', err?.message || err);
    return { text: '', numPages: 1, isScanned: true };
  }
}

/**
 * Robust JSON parsing that safely repairs unescaped LaTeX backslashes
 * (e.g. \lambda, \sqrt, \alpha, \frac, \theta, \times) which causes JSON.parse to fail.
 */
export function cleanAndParseJson<T = any>(raw: string): T {
  let cleaned = raw.trim();

  // Strip markdown code fences if present
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  }

  // 1. Try direct parsing
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // 2. Repair unescaped LaTeX backslashes
    // Valid JSON escape characters after backslash: " \ / b f n r t u
    try {
      const sanitized = cleaned.replace(/\\(?!["\\/bfnrt]|u[0-9a-fA-F]{4})/g, '\\\\');
      return JSON.parse(sanitized) as T;
    } catch {
      // 3. Extract outermost { ... } or [ ... ]
      const firstBrace = cleaned.indexOf('{');
      const lastBrace = cleaned.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        const slice = cleaned.substring(firstBrace, lastBrace + 1);
        const sanitizedSlice = slice.replace(/\\(?!["\\/bfnrt]|u[0-9a-fA-F]{4})/g, '\\\\');
        return JSON.parse(sanitizedSlice) as T;
      }
      throw new Error('Failed to parse structured JSON from AI output.');
    }
  }
}

/**
 * Normalizes and validates extracted questions to ensure schema compliance
 */
export function normalizeQuestions(rawQuestions: any[]): ExtractedQuestion[] {
  if (!Array.isArray(rawQuestions)) return [];

  const validTypes: QuestionType[] = [
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

  const cleaned: ExtractedQuestion[] = [];

  for (let i = 0; i < rawQuestions.length; i++) {
    const q = rawQuestions[i];
    if (!q || typeof q !== 'object') continue;

    const questionText = typeof q.question_text === 'string' ? q.question_text.trim() : '';
    if (!questionText || questionText.length < 3) {
      // Discard blank or phantom entries
      continue;
    }

    let qType: QuestionType = validTypes.includes(q.question_type) ? q.question_type : 'short_answer';

    // Normalize options
    let options: { option_letter: string; option_text: string; is_correct: boolean }[] = [];
    if (Array.isArray(q.options) && q.options.length > 0) {
      options = q.options
        .filter((o: any) => o && (o.option_text || o.text))
        .map((o: any, oIdx: number) => ({
          option_letter: (o.option_letter || o.letter || String.fromCharCode(65 + oIdx)).toUpperCase(),
          option_text: (o.option_text || o.text || '').trim(),
          is_correct: Boolean(o.is_correct || o.correct),
        }));

      // If options exist, default to mcq_single if not already multiple
      if (options.length >= 2 && qType !== 'mcq_multiple') {
        qType = 'mcq_single';
      }
    }

    const marks = Number(q.marks) > 0 ? Number(q.marks) : qType === 'long_answer' || qType === 'derivation' ? 5 : qType === 'diagram' ? 4 : qType === 'numerical' ? 3 : 1;
    const negativeMarks = Number(q.negative_marks) >= 0 ? Number(q.negative_marks) : 0;

    cleaned.push({
      question_number: cleaned.length + 1,
      question_text: questionText,
      question_type: qType,
      marks,
      negative_marks: negativeMarks,
      options,
      numerical_answer: q.numerical_answer !== undefined && q.numerical_answer !== null ? Number(q.numerical_answer) : null,
      numerical_tolerance: q.numerical_tolerance !== undefined ? Number(q.numerical_tolerance) : 0.01,
      numerical_tolerance_type: q.numerical_tolerance_type || 'exact',
      numerical_unit: q.numerical_unit ? String(q.numerical_unit).trim() : null,
      assertion_text: q.assertion_text ? String(q.assertion_text).trim() : null,
      reason_text: q.reason_text ? String(q.reason_text).trim() : null,
      matching_pairs: Array.isArray(q.matching_pairs) ? q.matching_pairs : null,
      explanation: typeof q.explanation === 'string' ? q.explanation.trim() : '',
      rubric: Array.isArray(q.rubric) ? q.rubric : [],
      allow_handwritten: q.allow_handwritten !== false,
      allow_typed: q.allow_typed !== false,
      image_url: q.image_url || null,
      ai_confidence: Number(q.ai_confidence) || 0.9,
      requires_verification: Boolean(q.requires_verification),
      source_page: Number(q.source_page) || 1,
    });
  }

  return cleaned;
}

/**
 * Step 2: Full Extraction & Parsing Workflow (STRICT SOURCE MODE)
 * Never hallucinates or invents fake questions.
 */
export async function parsePdfToExam(
  buffer: Buffer,
  originalFilename: string
): Promise<ParsedExamData> {
  const { text: extractedText, numPages, isScanned } = await extractTextFromPdf(buffer);
  const apiKey = process.env.GEMINI_API_KEY;

  console.log(`[PDF Extraction Pipeline] File: "${originalFilename}", Size: ${buffer.length} bytes, Pages: ${numPages}, Extracted text length: ${extractedText.length}, Detected as scanned: ${isScanned}`);

  let aiError: string | null = null;
  let modelUsed: string | undefined = undefined;

  // 1. Attempt Gemini parsing if API key is configured
  if (apiKey && apiKey.trim() !== '') {
    try {
      console.log('[PDF Extraction Pipeline] Initiating Gemini multimodal/text examination extraction...');
      const { data: aiResult, model } = await parseWithGemini(buffer, extractedText, isScanned, originalFilename, apiKey);
      modelUsed = model;

      if (aiResult && aiResult.questions && aiResult.questions.length > 0) {
        console.log(`[PDF Extraction Pipeline] Gemini successfully extracted ${aiResult.questions.length} questions using ${model}.`);
        return {
          ...aiResult,
          ai_status: 'success',
          diagnostics: {
            text_length: extractedText.length,
            pages_detected: numPages,
            is_scanned: isScanned,
            gemini_attempted: true,
            gemini_model_used: model,
            questions_count: aiResult.questions.length,
          },
        };
      } else {
        aiError = 'Gemini model returned 0 questions from this document. Source text may lack readable question indicators.';
        console.warn('[PDF Extraction Pipeline] Gemini completed but returned 0 questions.');
      }
    } catch (err: any) {
      aiError = sanitizeGeminiError(err?.message || 'Gemini API call failed', apiKey);
      console.error('[PDF Extraction Pipeline] Gemini parsing error:', aiError);
    }
  } else {
    aiError = 'GEMINI_API_KEY is not configured in environment variables.';
    console.warn('[PDF Extraction Pipeline] GEMINI_API_KEY is missing. Falling back to heuristic text parser.');
  }

  // 2. Fallback: Deterministic Rule-Based Heuristic Parser
  console.log('[PDF Extraction Pipeline] Running deterministic heuristic text parser...');
  const fallbackResult = parseWithHeuristics(extractedText, originalFilename, isScanned);

  const finalQuestions = fallbackResult.questions;
  const warningMessage =
    finalQuestions.length === 0
      ? `No questions could be extracted from this PDF. ${
          aiError ? `[AI Note: ${aiError}]` : ''
        } Please verify the PDF is readable or add questions manually.`
      : `Extracted ${finalQuestions.length} questions via source text parsing. ${
          aiError ? `(AI extraction was unavailable: ${aiError})` : ''
        }`;

  return {
    ...fallbackResult,
    ai_status: apiKey && apiKey.trim() !== '' ? 'failed' : 'not_configured',
    ai_error_details: aiError || undefined,
    warning: warningMessage,
    diagnostics: {
      text_length: extractedText.length,
      pages_detected: numPages,
      is_scanned: isScanned,
      gemini_attempted: Boolean(apiKey && apiKey.trim() !== ''),
      gemini_model_used: modelUsed,
      questions_count: finalQuestions.length,
    },
  };
}

/**
 * AI Parser using Google Gemini with Model Fallback & Multimodal Ingestion
 */
async function parseWithGemini(
  pdfBuffer: Buffer,
  extractedText: string,
  isScanned: boolean,
  filename: string,
  apiKey: string
): Promise<{ data: ParsedExamData; model: string }> {
  const prompt = `
You are an expert examination paper parser for Science, Physics, Chemistry, Mathematics, and Indian competitive exams (JEE / NEET / CBSE / School tests).
Your task is to accurately extract ALL questions from the provided question paper document into structured JSON.

CRITICAL RULES (STRICT SOURCE ACCURACY - NO HALLUCINATIONS):
1. Extract ONLY questions that are genuinely present in the document.
2. ABSOLUTELY NEVER hallucinate, invent, fabricate, or substitute questions.
3. If the paper has 5 questions, extract 5. If 12 questions, extract 12.
4. Support all of the following question types:
   - 'mcq_single': Single correct multiple choice
   - 'mcq_multiple': Multiple correct choices (e.g. JEE Advanced multiple correct)
   - 'numerical': Numerical problem where student enters a number (extract units e.g. "m/s", "J", "N", "kg", and tolerance)
   - 'true_false': True or False statements
   - 'short_answer': Conceptual short questions (1-3 marks)
   - 'long_answer': Detailed descriptive questions (5-10 marks)
   - 'derivation': Scientific derivations, mathematical proofs, or theorem proofs
   - 'diagram': Questions that require drawing or interpreting a diagram
   - 'assertion_reason': Assertion (A) and Reason (R) statements
   - 'match_following': Matching Column I with Column II
5. For subjective questions ('short_answer', 'long_answer', 'derivation', 'diagram'), DO NOT force them into MCQs! Set allow_handwritten: true and options: [].
6. Preserve equations, math symbols (LaTeX), Greek letters (alpha, beta, theta, lambda), superscripts, subscripts, chemical formulas, and marks.
7. If options are on a single line (e.g. (A) 10 (B) 20 (C) 30 (D) 40), parse each option distinctly with its letter and text.
8. Output strictly valid JSON matching this schema:
{
  "title": "Title of paper or subject",
  "subject": "Physics/Chemistry/Mathematics/Biology/General Science",
  "chapter": "Chapter name or General Assessment",
  "total_marks": 50,
  "duration_minutes": 60,
  "exam_mode": "teacher_reviewed",
  "questions": [
    {
      "question_number": 1,
      "question_text": "Complete question text with all conditions and equations",
      "question_type": "mcq_single",
      "marks": 4,
      "negative_marks": 1,
      "options": [
        { "option_letter": "A", "option_text": "...", "is_correct": true },
        { "option_letter": "B", "option_text": "...", "is_correct": false }
      ],
      "numerical_answer": null,
      "numerical_tolerance": 0.01,
      "numerical_unit": null,
      "assertion_text": null,
      "reason_text": null,
      "matching_pairs": null,
      "explanation": "...",
      "rubric": ["Step 1", "Step 2"],
      "allow_handwritten": true,
      "allow_typed": true,
      "ai_confidence": 0.95,
      "requires_verification": false,
      "source_page": 1
    }
  ]
}
`;

  // Build multimodal contents:
  // If buffer is <= 15MB, always include PDF inlineData so Gemini can see diagrams and formatting!
  const parts: any[] = [{ text: prompt }];

  if (pdfBuffer.length <= 15 * 1024 * 1024) {
    parts.push({
      inlineData: {
        mimeType: 'application/pdf',
        data: pdfBuffer.toString('base64'),
      },
    });
  }

  if (extractedText && extractedText.length > 50) {
    parts.push({
      text: `Document Extracted Text Preview:\n${extractedText.slice(0, 30000)}`,
    });
  }

  const resolution = await resolveGeminiModel(apiKey);
  console.log(
    `[Gemini Model Selection] Selected model: ${resolution.selectedModel} (Verified via API: ${resolution.verifiedViaApi})`
  );

  const modelsToTry = resolution.candidatesToTry;
  let lastError: Error | null = null;

  for (const model of modelsToTry) {
    try {
      const url = getGeminiGenerateContentUrl(model, apiKey);
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.1,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        const safeError = sanitizeGeminiError(
          `Gemini (${model}) returned HTTP ${response.status}: ${errorText}`,
          apiKey
        );
        throw new Error(safeError);
      }

      const result = await response.json();
      const rawJson = result.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!rawJson) {
        throw new Error(`Gemini (${model}) returned an empty candidate response.`);
      }

      const parsed = cleanAndParseJson<any>(rawJson);
      const cleanQuestions = normalizeQuestions(parsed.questions || []);

      const calculatedTotal = cleanQuestions.reduce((sum, q) => sum + q.marks, 0);

      const examData: ParsedExamData = {
        title: parsed.title || filename.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
        subject: parsed.subject || 'General Science',
        chapter: parsed.chapter || 'Extracted Assessment',
        total_marks: parsed.total_marks || calculatedTotal || 50,
        duration_minutes: parsed.duration_minutes || Math.max(15, cleanQuestions.length * 3),
        exam_mode: parsed.exam_mode || 'teacher_reviewed',
        questions: cleanQuestions,
        raw_text: extractedText,
        is_scanned: isScanned,
        extraction_method: 'gemini_multimodal',
        ai_status: 'success',
        diagnostics: {
          text_length: extractedText.length,
          pages_detected: 1,
          is_scanned: isScanned,
          gemini_attempted: true,
          gemini_model_used: model,
          questions_count: cleanQuestions.length,
        },
      };

      return { data: examData, model };
    } catch (err: any) {
      const safeMessage = sanitizeGeminiError(err?.message, apiKey);
      lastError = new Error(safeMessage);
      console.warn(`[Gemini Attempt] Model ${model} failed: ${safeMessage}. Trying next fallback...`);
    }
  }

  throw lastError || new Error('All Gemini model extraction attempts failed.');
}

/**
 * Deterministic Heuristic Regex Parser (Strictly source-bound; zero hallucination)
 * Handles Indian exam styles, inline options, subjective questions, and common formats.
 */
export function parseWithHeuristics(
  rawText: string,
  filename: string,
  isScanned: boolean
): ParsedExamData {
  const cleanTitle = filename.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
  const questions: ExtractedQuestion[] = [];

  if (!rawText || rawText.trim().length === 0) {
    return {
      title: cleanTitle || 'Extracted Question Paper',
      subject: 'General Science',
      chapter: 'Question Paper',
      total_marks: 10,
      duration_minutes: 15,
      exam_mode: 'teacher_reviewed',
      questions: [],
      raw_text: '',
      is_scanned: isScanned,
      extraction_method: 'heuristic_fallback',
      ai_status: 'failed',
      diagnostics: {
        text_length: 0,
        pages_detected: 1,
        is_scanned: isScanned,
        gemini_attempted: false,
        questions_count: 0,
      },
    };
  }

  const rawLines = rawText.split(/\r?\n/).map((l) => l.trim());

  // Filter out page numbers, headers, and separator lines
  const lines = rawLines.filter((line) => {
    if (!line) return false;
    if (/^--\s*\d+\s+of\s+\d+\s*--$/i.test(line)) return false;
    if (/^page\s+\d+\s*(of\s+\d+)?$/i.test(line)) return false;
    return true;
  });

  let currentQ: Partial<ExtractedQuestion> | null = null;
  let qCounter = 1;

  // Regex for question beginnings:
  // e.g. "Q1.", "Q.1", "Q 1:", "Question 1:", "Que 1.", "1.", "1)", "(1)", "[1]"
  const questionStartRegex =
    /^(?:Q(?:uestion|ue|\.)?\s*(\d+)[:.-]?|(\d+)[:.)\]]|\[(\d+)\]|\((\d+)\))\s+(.*)/i;

  // Regex for option lines:
  // e.g. "(A) option text", "A. option text", "(a) option text", "a) option text"
  const singleOptionLineRegex =
    /^(?:\(?([A-Da-d])\)[.:]?|([A-Da-d])[.:)])\s+(.*)/;

  // Regex for inline options:
  // e.g. "(A) Option 1 (B) Option 2 (C) Option 3 (D) Option 4"
  const inlineOptionRegex =
    /(?:\(?([A-Da-d])\)[.:]?|([A-Da-d])[.:)])\s+([^()]+?)(?=\s+(?:\(?[A-Da-d]\)[.:]?|[A-Da-d][.:)])|$)/g;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if line is a section header or general instruction to skip
    if (
      /^(?:section|part|group)\s+[-–—]?[A-Z]/i.test(line) ||
      /^(?:general\s+instructions?|instructions?):/i.test(line) ||
      /^(?:time\s*allowed|maximum\s*marks|max\s*marks)/i.test(line)
    ) {
      continue;
    }

    const qMatch = line.match(questionStartRegex);
    if (qMatch) {
      if (currentQ && currentQ.question_text) {
        finalizeHeuristicQuestion(currentQ as ExtractedQuestion, questions);
      }

      const numStr = qMatch[1] || qMatch[2] || qMatch[3] || qMatch[4] || String(qCounter);
      const parsedNum = parseInt(numStr, 10);
      let text = qMatch[5] || '';

      // Check if the question text contains inline options: (A) ... (B) ...
      const inlineMatches = Array.from(text.matchAll(inlineOptionRegex));
      let inlineOpts: { option_letter: string; option_text: string; is_correct: boolean }[] = [];

      if (inlineMatches.length >= 2) {
        // Strip the options part from question text
        const firstOptIndex = text.search(/(?:\(?[A-Da-d]\)[.:]?|[A-Da-d][.:)])\s+/);
        if (firstOptIndex !== -1) {
          const mainText = text.substring(0, firstOptIndex).trim();
          inlineMatches.forEach((m) => {
            const letter = (m[1] || m[2]).toUpperCase();
            const optText = (m[3] || '').trim();
            inlineOpts.push({
              option_letter: letter,
              option_text: optText,
              is_correct: inlineOpts.length === 0,
            });
          });
          text = mainText;
        }
      }

      // Check for marks indicator like "[5 Marks]" or "(3M)" or "[3]"
      const marksMatch = text.match(/\[(\d+)\s*(?:marks?|m)?\]|\((\d+)\s*(?:marks?|m)\)/i);
      const detectedMarks = marksMatch ? parseInt(marksMatch[1] || marksMatch[2], 10) : 1;

      currentQ = {
        question_number: parsedNum || qCounter,
        question_text: text,
        question_type: inlineOpts.length >= 2 ? 'mcq_single' : determineTypeFromText(text),
        marks: detectedMarks,
        negative_marks: 0,
        options: inlineOpts,
        ai_confidence: 0.8,
        requires_verification: true,
        allow_handwritten: true,
        allow_typed: true,
      };
      qCounter++;
      continue;
    }

    // Check for inline options on subsequent lines
    if (currentQ && (!currentQ.options || currentQ.options.length === 0)) {
      const inlineMatches = Array.from(line.matchAll(inlineOptionRegex));
      if (inlineMatches.length >= 2) {
        inlineMatches.forEach((m) => {
          const letter = (m[1] || m[2]).toUpperCase();
          const optText = (m[3] || '').trim();
          currentQ!.options!.push({
            option_letter: letter,
            option_text: optText,
            is_correct: currentQ!.options!.length === 0,
          });
        });
        currentQ.question_type = 'mcq_single';
        continue;
      }
    }

    // Check for single option on line
    const optMatch = line.match(singleOptionLineRegex);
    if (optMatch && currentQ) {
      const letter = (optMatch[1] || optMatch[2]).toUpperCase();
      const optText = (optMatch[3] || '').trim();
      if (!currentQ.options) currentQ.options = [];
      currentQ.options.push({
        option_letter: letter,
        option_text: optText,
        is_correct: currentQ.options.length === 0,
      });
      currentQ.question_type = 'mcq_single';
      continue;
    }

    // Continuation line
    if (currentQ) {
      if (!currentQ.options || currentQ.options.length === 0) {
        currentQ.question_text = (currentQ.question_text || '') + ' ' + line;
        currentQ.question_type = determineTypeFromText(currentQ.question_text || '');
      } else {
        const lastOpt = currentQ.options[currentQ.options.length - 1];
        lastOpt.option_text += ' ' + line;
      }
    }
  }

  if (currentQ && currentQ.question_text) {
    finalizeHeuristicQuestion(currentQ as ExtractedQuestion, questions);
  }

  const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0);

  return {
    title: cleanTitle || 'Extracted Question Paper',
    subject: 'General Science',
    chapter: 'Question Paper',
    total_marks: totalMarks > 0 ? totalMarks : 10,
    duration_minutes: Math.max(15, questions.length * 4),
    exam_mode: 'teacher_reviewed',
    questions,
    raw_text: rawText,
    is_scanned: isScanned,
    extraction_method: 'heuristic_fallback',
    ai_status: 'failed',
    diagnostics: {
      text_length: rawText.length,
      pages_detected: 1,
      is_scanned: isScanned,
      gemini_attempted: false,
      questions_count: questions.length,
    },
  };
}

function determineTypeFromText(text: string): QuestionType {
  const lower = text.toLowerCase();
  if (
    lower.startsWith('derive') ||
    lower.includes('derivation') ||
    lower.includes('prove that') ||
    lower.includes('show that')
  ) {
    return 'derivation';
  }
  if (
    lower.startsWith('draw') ||
    lower.includes('labeled diagram') ||
    lower.includes('diagram showing') ||
    lower.includes('sketch')
  ) {
    return 'diagram';
  }
  if (lower.includes('assertion') && lower.includes('reason')) {
    return 'assertion_reason';
  }
  if (
    lower.includes('match the following') ||
    lower.includes('column i') ||
    lower.includes('column a')
  ) {
    return 'match_following';
  }
  if (
    lower.includes('calculate') ||
    lower.includes('find the value') ||
    lower.includes('determine the magnitude') ||
    lower.includes('how many moles')
  ) {
    return 'numerical';
  }
  if (
    lower.includes('explain in detail') ||
    lower.includes('describe the working') ||
    lower.includes('discuss') ||
    lower.includes('give reasons in detail')
  ) {
    return 'long_answer';
  }
  if (
    lower.includes('define') ||
    lower.includes('state the') ||
    lower.includes('what is') ||
    lower.includes('short note') ||
    lower.includes('differentiate between')
  ) {
    return 'short_answer';
  }
  return 'short_answer';
}

function finalizeHeuristicQuestion(q: ExtractedQuestion, list: ExtractedQuestion[]) {
  const marksMatch = q.question_text.match(/\[(\d+)\s*(?:marks?|m)?\]|\((\d+)\s*(?:marks?|m)\)/i);
  if (marksMatch) {
    q.marks = parseInt(marksMatch[1] || marksMatch[2], 10);
    q.question_text = q.question_text.replace(marksMatch[0], '').trim();
  }

  if (q.marks === 1) {
    if (q.question_type === 'derivation' || q.question_type === 'long_answer') {
      q.marks = 5;
    } else if (q.question_type === 'diagram') {
      q.marks = 4;
    } else if (q.question_type === 'numerical') {
      q.marks = 3;
    } else if (q.question_type === 'short_answer') {
      q.marks = 2;
    }
  }

  // Ensure question text isn't empty
  if (q.question_text && q.question_text.trim().length > 3) {
    list.push(q);
  }
}
