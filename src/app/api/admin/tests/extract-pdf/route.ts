import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, logActivity } from '@/lib/auth';
import { parsePdfToExam } from '@/lib/pdf-parser';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get('pdf_file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No PDF file provided.' }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Please upload a valid PDF document.' }, { status: 400 });
    }

    // Convert file to Node buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Parse PDF using AI or local OCR extraction
    const examData = await parsePdfToExam(buffer, file.name);

    await logActivity(user.id, 'pdf_paper_extracted', {
      filename: file.name,
      questions_extracted: examData.questions.length,
      method: examData.extraction_method,
    });

    return NextResponse.json({
      success: true,
      examData,
      filename: file.name,
      fileSize: file.size,
    });
  } catch (error: any) {
    console.error('PDF extraction route error:', error);
    return NextResponse.json({ error: 'Failed to extract exam questions from PDF.' }, { status: 500 });
  }
}
