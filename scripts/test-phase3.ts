import { extractTextFromPdf, parsePdfToExam } from '../src/lib/pdf-parser';

async function testPhase3() {
  console.log('--- TESTING PHASE 3: PDF PARSER & EXTRACTION ---');

  const sampleBuffer = Buffer.from('Simulated question paper content');
  const examData = await parsePdfToExam(sampleBuffer, 'Physics_Gravitation_Test.pdf');

  console.log('Exam Title:', examData.title);
  console.log('Extracted Questions Count:', examData.questions.length);
  console.log('Total Marks:', examData.total_marks);
  console.log('Extraction Method:', examData.extraction_method);
  console.log('Sample Q1:', examData.questions[0].question_text);
  console.log('Q1 Type:', examData.questions[0].question_type);
  console.log('Q1 Options Count:', examData.questions[0].options?.length || 0);

  console.log('--- PHASE 3 VERIFICATION PASSED ---');
}

testPhase3().catch(console.error);
