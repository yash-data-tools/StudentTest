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
  numerical_answer?: number;
  numerical_tolerance?: number;
  numerical_tolerance_type?: 'exact' | 'absolute' | 'range';
  numerical_unit?: string;
  assertion_text?: string;
  reason_text?: string;
  matching_pairs?: { left: string; right: string }[];
  explanation?: string;
  rubric?: string[];
  allow_handwritten?: boolean;
  allow_typed?: boolean;
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
  extraction_method: 'local_ai' | 'gemini_multimodal' | 'heuristic_fallback';
  warning?: string;
}

/**
 * Step 1: Extract plain text from PDF buffer
 */
export async function extractTextFromPdf(buffer: Buffer): Promise<{ text: string; numPages: number; isScanned: boolean }> {
  try {
    const pdfModule = await import('pdf-parse');

    // Handle pdf-parse v2 (PDFParse class)
    if (pdfModule.PDFParse) {
      const parser = new (pdfModule as any).PDFParse({ data: buffer });
      const textResult = await parser.getText();
      const text = typeof textResult === 'string' ? textResult.trim() : (textResult?.text || '').trim();
      const isScanned = text.length < 50;
      return { text, numPages: 1, isScanned };
    }

    // Handle legacy functional pdf-parse
    const parseFn = (pdfModule as any).default || pdfModule;
    if (typeof parseFn === 'function') {
      const data = await parseFn(buffer);
      const text = (data.text || '').trim();
      return { text, numPages: data.numpages || 1, isScanned: text.length < 50 };
    }

    return { text: '', numPages: 1, isScanned: true };
  } catch (err) {
    console.warn('PDF text extraction note (proceeding to OCR/heuristic fallback):', err);
    return { text: '', numPages: 1, isScanned: true };
  }
}

/**
 * Step 2: Full Extraction & Parsing Workflow (STRICT SOURCE MODE)
 * Never hallucinates or invents fake questions.
 */
export async function parsePdfToExam(buffer: Buffer, originalFilename: string): Promise<ParsedExamData> {
  const { text: extractedText, isScanned } = await extractTextFromPdf(buffer);
  const apiKey = process.env.GEMINI_API_KEY;

  // If Gemini API is available, use multimodal or text AI parsing
  if (apiKey && apiKey.trim() !== '') {
    try {
      const aiResult = await parseWithGemini(buffer, extractedText, isScanned, originalFilename, apiKey);
      if (aiResult && aiResult.questions?.length > 0) {
        return aiResult;
      }
    } catch (aiErr) {
      console.warn('Gemini parsing note, applying resilient heuristic parser:', aiErr);
    }
  }

  // Fallback: Deterministic Rule-Based Parser (zero cost, strictly from actual text)
  return parseWithHeuristics(extractedText, originalFilename, isScanned);
}

/**
 * AI Parser using Google Gemini (STRICT SOURCE ACCURACY)
 */
async function parseWithGemini(
  pdfBuffer: Buffer,
  extractedText: string,
  isScanned: boolean,
  filename: string,
  apiKey: string
): Promise<ParsedExamData> {
  const prompt = `
You are an expert academic examination parser. Convert this question paper into structured interactive test data.

CRITICAL RULES (STRICT SOURCE FIDELITY - NO HALLUCINATIONS):
1. Extract ONLY questions that are genuinely present in the document.
2. ABSOLUTELY NEVER hallucinate, invent, replace, or fabricate questions. If a question is unreadable, do not make one up.
3. If the paper has 5 questions, extract 5. If only 3 are readable, extract 3. If none are readable, return an empty array [].
4. Supported question types:
   - 'mcq_single': Single correct multiple-choice
   - 'mcq_multiple': Multiple correct choices
   - 'numerical': Numerical answers with tolerance and units
   - 'true_false': True / False
   - 'short_answer': Conceptual short questions (1-3 marks)
   - 'long_answer': Detailed descriptive questions (5-10 marks)
   - 'derivation': Mathematical, physics, or scientific derivations / proofs
   - 'diagram': Diagram drawing or interpretation questions
   - 'assertion_reason': Assertion and Reason statement questions
   - 'match_following': Match items in Column A with Column B
5. For subjective questions ('short_answer', 'long_answer', 'derivation', 'diagram'), set allow_handwritten: true and options: []. Do NOT force them into MCQs!
6. For numerical questions, identify numerical answer and units (e.g. "m/s", "Joules", "kg").
7. Preserve equations, math symbols, superscripts, subscripts, chemical formulas, and original marks.
8. Return strictly valid JSON with no markdown formatting:
{
  "title": "Title of paper",
  "subject": "Physics/Chemistry/Mathematics/Biology/General",
  "chapter": "Chapter name or General",
  "total_marks": 50,
  "duration_minutes": 60,
  "exam_mode": "teacher_reviewed",
  "questions": [
    {
      "question_number": 1,
      "question_text": "Full question statement",
      "question_type": "mcq_single",
      "marks": 1,
      "negative_marks": 0.25,
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
      "ai_confidence": 0.95,
      "requires_verification": false,
      "source_page": 1
    }
  ]
}
`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  const contents = isScanned
    ? [
        {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: 'application/pdf',
                data: pdfBuffer.toString('base64'),
              },
            },
          ],
        },
      ]
    : [
        {
          parts: [
            { text: prompt },
            { text: `Question Paper Text Content:\n${extractedText}` },
          ],
        },
      ];

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents,
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.0,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini API returned status ${response.status}: ${await response.text()}`);
  }

  const result = await response.json();
  const rawJson = result.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
  const parsed = JSON.parse(rawJson);

  const cleanQuestions = (parsed.questions || []).map((q: any, idx: number) => ({
    question_number: q.question_number || idx + 1,
    question_text: q.question_text || '',
    question_type: q.question_type || 'short_answer',
    marks: Number(q.marks) || 1,
    negative_marks: Number(q.negative_marks) || 0,
    options: Array.isArray(q.options) ? q.options : [],
    numerical_answer: q.numerical_answer !== undefined ? q.numerical_answer : null,
    numerical_tolerance: q.numerical_tolerance ?? 0.01,
    numerical_unit: q.numerical_unit || null,
    assertion_text: q.assertion_text || null,
    reason_text: q.reason_text || null,
    matching_pairs: q.matching_pairs || null,
    explanation: q.explanation || '',
    rubric: Array.isArray(q.rubric) ? q.rubric : [],
    allow_handwritten: q.allow_handwritten !== false,
    allow_typed: q.allow_typed !== false,
    ai_confidence: q.ai_confidence || 0.9,
    requires_verification: Boolean(q.requires_verification),
    source_page: q.source_page || 1,
  }));

  const calculatedTotal = cleanQuestions.reduce((sum: number, q: any) => sum + q.marks, 0);

  return {
    title: parsed.title || filename.replace(/\.[^/.]+$/, ''),
    subject: parsed.subject || 'General Science',
    chapter: parsed.chapter || 'Extracted Assessment',
    total_marks: parsed.total_marks || calculatedTotal || 50,
    duration_minutes: parsed.duration_minutes || 60,
    exam_mode: parsed.exam_mode || 'teacher_reviewed',
    questions: cleanQuestions,
    raw_text: extractedText,
    is_scanned: isScanned,
    extraction_method: 'gemini_multimodal',
  };
}

/**
 * Deterministic Heuristic Regex Parser (Strictly source-bound; zero hallucination)
 */
function parseWithHeuristics(rawText: string, filename: string, isScanned: boolean): ParsedExamData {
  const cleanTitle = filename.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
  const questions: ExtractedQuestion[] = [];

  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  let currentQ: Partial<ExtractedQuestion> | null = null;
  let qNum = 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect question boundaries: e.g. "Q1.", "1.", "Question 1:", "Q.1", "(1)"
    const qMatch = line.match(/^(?:Q(?:uestion|\.)?\s*(\d+)[:.]?|(\d+)[.)]|\((\d+)\))\s*(.*)/i);
    if (qMatch) {
      if (currentQ && currentQ.question_text) {
        finalizeHeuristicQuestion(currentQ as ExtractedQuestion, questions);
      }

      const num = parseInt(qMatch[1] || qMatch[2] || qMatch[3] || String(qNum), 10);
      const text = qMatch[4] || '';

      // Detect question marks if specified at line end: e.g. "[5 Marks]" or "(3M)" or "[3]"
      const marksMatch = text.match(/\[(\d+)\s*(?:marks?|m)?\]|\((\d+)\s*(?:marks?|m)\)/i);
      const detectedMarks = marksMatch ? parseInt(marksMatch[1] || marksMatch[2], 10) : 1;

      currentQ = {
        question_number: num,
        question_text: text,
        question_type: determineTypeFromText(text),
        marks: detectedMarks,
        negative_marks: 0,
        options: [],
        ai_confidence: 0.8,
        requires_verification: true,
        allow_handwritten: true,
        allow_typed: true,
      };
      qNum++;
      continue;
    }

    // Detect option lines: e.g. "(A) option text" or "A. option text" or "a) option text"
    const optMatch = line.match(/^(?:\(?([A-Da-d])\)[.:]?|([A-Da-d])[.)])\s*(.*)/);
    if (optMatch && currentQ) {
      const letter = (optMatch[1] || optMatch[2]).toUpperCase();
      const optText = optMatch[3] || '';
      if (!currentQ.options) currentQ.options = [];
      currentQ.options.push({
        option_letter: letter,
        option_text: optText,
        is_correct: currentQ.options.length === 0, // provisional
      });
      // If options are found, set type to MCQ
      currentQ.question_type = 'mcq_single';
      continue;
    }

    if (currentQ) {
      if (!currentQ.options || currentQ.options.length === 0) {
        currentQ.question_text = (currentQ.question_text || '') + ' ' + line;
        // Re-evaluate type as more text is added
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

  // STRICT SOURCE POLICY:
  // If 0 questions could be extracted, DO NOT INVENT QUESTIONS!
  // Return empty questions array with an informative warning so admin knows.
  const warning =
    questions.length === 0
      ? 'No readable questions were detected in the source text. You can add questions manually or review the PDF scan quality.'
      : undefined;

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
    warning,
  };
}

function determineTypeFromText(text: string): QuestionType {
  const lower = text.toLowerCase();
  if (lower.startsWith('derive') || lower.includes('derivation') || lower.includes('prove that') || lower.includes('show that')) {
    return 'derivation';
  }
  if (lower.startsWith('draw') || lower.includes('labeled diagram') || lower.includes('diagram showing')) {
    return 'diagram';
  }
  if (lower.includes('assertion') && lower.includes('reason')) {
    return 'assertion_reason';
  }
  if (lower.includes('match the following') || lower.includes('column a') || lower.includes('column i')) {
    return 'match_following';
  }
  if (lower.includes('calculate') || lower.includes('find the value') || lower.includes('determine the magnitude')) {
    return 'numerical';
  }
  if (lower.includes('explain in detail') || lower.includes('describe the working') || lower.includes('discuss')) {
    return 'long_answer';
  }
  if (lower.includes('define') || lower.includes('state the') || lower.includes('what is') || lower.includes('short note')) {
    return 'short_answer';
  }
  return 'short_answer';
}

function finalizeHeuristicQuestion(q: ExtractedQuestion, list: ExtractedQuestion[]) {
  // Clean question text and extract any embedded marks like "(5 marks)"
  const marksMatch = q.question_text.match(/\[(\d+)\s*(?:marks?|m)?\]|\((\d+)\s*(?:marks?|m)\)/i);
  if (marksMatch) {
    q.marks = parseInt(marksMatch[1] || marksMatch[2], 10);
    q.question_text = q.question_text.replace(marksMatch[0], '').trim();
  }

  // Adjust default marks based on question type if not explicitly stated
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

  list.push(q);
}
