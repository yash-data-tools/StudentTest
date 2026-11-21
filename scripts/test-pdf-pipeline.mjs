import assert from 'assert';
import {
  cleanAndParseJson,
  normalizeQuestions,
  parseWithHeuristics,
  extractTextFromPdf,
} from '../src/lib/pdf-parser.ts';

console.log('--- STARTING PDF PARSER & EXTRACTION PIPELINE TESTS ---');

// 1. Test cleanAndParseJson with LaTeX backslashes
console.log('\n[TEST 1] Testing cleanAndParseJson with LaTeX unescaped backslashes...');
const latexJson = `
\`\`\`json
{
  "title": "Physics JEE Paper",
  "subject": "Physics",
  "questions": [
    {
      "question_number": 1,
      "question_text": "Find the wavelength \\lambda when frequency is \\nu and speed is c = \\frac{1}{\\sqrt{\\mu_0 \\epsilon_0}}.",
      "question_type": "short_answer",
      "marks": 3,
      "options": []
    }
  ]
}
\`\`\`
`;
const parsedLatex = cleanAndParseJson(latexJson);
assert.strictEqual(parsedLatex.title, 'Physics JEE Paper');
assert.strictEqual(parsedLatex.questions.length, 1);
assert.ok(parsedLatex.questions[0].question_text.includes('\\lambda'));
console.log('✓ cleanAndParseJson correctly repaired unescaped LaTeX backslashes without crashing!');

// 2. Test normalizeQuestions
console.log('\n[TEST 2] Testing normalizeQuestions...');
const rawQuestions = [
  {
    question_number: 1,
    question_text: 'What is the SI unit of electric flux?',
    question_type: 'mcq_single',
    marks: 4,
    negative_marks: 1,
    options: [
      { option_letter: 'A', option_text: 'N m^2 / C', is_correct: true },
      { option_letter: 'B', option_text: 'N / C', is_correct: false },
      { option_letter: 'C', option_text: 'V / m', is_correct: false },
      { option_letter: 'D', option_text: 'J / C', is_correct: false },
    ],
  },
  {
    // Empty question should be filtered out
    question_text: '   ',
    marks: 1,
  },
  {
    question_number: 3,
    question_text: 'Derive lens maker formula for a thin convex lens.',
    question_type: 'derivation',
    marks: 5,
    allow_handwritten: true,
  },
];
const normalized = normalizeQuestions(rawQuestions);
assert.strictEqual(normalized.length, 2);
assert.strictEqual(normalized[0].question_type, 'mcq_single');
assert.strictEqual(normalized[0].options.length, 4);
assert.strictEqual(normalized[1].question_type, 'derivation');
assert.strictEqual(normalized[1].marks, 5);
assert.strictEqual(normalized[1].allow_handwritten, true);
console.log('✓ normalizeQuestions correctly normalized questions and filtered blank entries!');

// 3. Test parseWithHeuristics with typical Indian Exam / JEE question paper text
console.log('\n[TEST 3] Testing parseWithHeuristics with MCQs, inline options, numericals & derivations...');
const sampleExamText = `
CENTRAL TUITION ACADEMY
Class: 12   Subject: Physics
Time: 2 Hours   Max Marks: 70

GENERAL INSTRUCTIONS:
All questions are compulsory.
Section A contains MCQs, Section B contains derivations.

SECTION A

1. The electric potential on the axis of an electric dipole at distance r varies as:
(A) 1/r
(B) 1/r^2
(C) 1/r^3
(D) r

2. A particle moves with velocity v = 2t + 5 m/s. Calculate the acceleration of the particle at t = 2s. [3 Marks]

3. Which of the following statements about magnetic field lines is false?
(a) They form closed continuous loops (b) They do not intersect (c) They start from South pole and end at North pole outside magnet (d) The tangent gives field direction

4. Derive an expression for the energy stored in a parallel plate capacitor of capacitance C with potential difference V. [5 Marks]

5. Draw a labeled ray diagram showing the formation of an image by a compound microscope at least distance of distinct vision. [4 Marks]
`;

const heuristicExam = parseWithHeuristics(sampleExamText, 'Physics_Class12_Exam.pdf', false);
console.log(`Extracted ${heuristicExam.questions.length} questions from sample exam text.`);
assert.strictEqual(heuristicExam.questions.length, 5);

// Question 1: MCQ with multiline options
assert.strictEqual(heuristicExam.questions[0].question_number, 1);
assert.strictEqual(heuristicExam.questions[0].question_type, 'mcq_single');
assert.strictEqual(heuristicExam.questions[0].options.length, 4);
assert.strictEqual(heuristicExam.questions[0].options[0].option_letter, 'A');

// Question 2: Numerical
assert.strictEqual(heuristicExam.questions[1].question_number, 2);
assert.strictEqual(heuristicExam.questions[1].question_type, 'numerical');
assert.strictEqual(heuristicExam.questions[1].marks, 3);

// Question 3: MCQ with inline options on single line
assert.strictEqual(heuristicExam.questions[2].question_number, 3);
assert.strictEqual(heuristicExam.questions[2].question_type, 'mcq_single');
assert.strictEqual(heuristicExam.questions[2].options.length, 4);

// Question 4: Derivation
assert.strictEqual(heuristicExam.questions[3].question_number, 4);
assert.strictEqual(heuristicExam.questions[3].question_type, 'derivation');
assert.strictEqual(heuristicExam.questions[3].marks, 5);

// Question 5: Diagram
assert.strictEqual(heuristicExam.questions[4].question_number, 5);
assert.strictEqual(heuristicExam.questions[4].question_type, 'diagram');
assert.strictEqual(heuristicExam.questions[4].marks, 4);

console.log('✓ parseWithHeuristics successfully extracted all 5 diverse question types with accurate options and marks!');

// 4. Test Zero-Question handling
console.log('\n[TEST 4] Testing zero question edge case (unreadable text)...');
const emptyResult = parseWithHeuristics('This is just an unreadable logo with no questions.', 'ScannedImage.pdf', true);
assert.strictEqual(emptyResult.questions.length, 0);
assert.strictEqual(emptyResult.is_scanned, true);
assert.strictEqual(emptyResult.extraction_method, 'heuristic_fallback');
console.log('✓ Zero-question case handled cleanly without inventing or hallucinating fake questions!');

// 5. Test extractTextFromPdf with minimal valid PDF
console.log('\n[TEST 5] Testing extractTextFromPdf with binary PDF buffer...');
const minimalPdf = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length 55 >>
stream
BT
/F1 12 Tf
100 700 Td
(Q1. State first law of thermodynamics. [2 Marks]) Tj
ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000244 00000 n 
0000000350 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
434
%%EOF`;

const pdfBuffer = Buffer.from(minimalPdf);
const extracted = await extractTextFromPdf(pdfBuffer);
console.log('Extracted text:', JSON.stringify(extracted.text));
assert.ok(extracted.text.includes('thermodynamics'));
console.log('✓ extractTextFromPdf successfully extracted text from PDF buffer!');

console.log('\nALL 5 PIPELINE TESTS PASSED SUCCESSFULLY! ✓');
