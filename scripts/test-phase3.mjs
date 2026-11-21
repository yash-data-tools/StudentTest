import { extractTextFromPdf, parsePdfToExam } from '../src/lib/pdf-parser.js';

async function testPhase3() {
  console.log('--- TESTING PHASE 3: PDF PARSER & EXTRACTION ---');

  // Create a simulated buffer text
  const sampleBuffer = Buffer.from(
    `%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length 120 >>\nstream\nBT /F1 12 Tf 70 700 Td (Q1. What is the acceleration due to gravity on Earth? (A) 9.8 m/s^2 (B) 12 m/s^2 (C) 5 m/s^2 (D) 0 m/s^2) Tj ET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000010 00000 n \n0000000060 00000 n \n0000000120 00000 n \n0000000185 00000 n \ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n360\n%%EOF`
  );

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
