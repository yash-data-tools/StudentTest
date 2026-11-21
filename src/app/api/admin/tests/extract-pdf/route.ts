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
      return NextResponse.json({ error: 'No PDF file provided. Please choose a PDF file to upload.' }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Invalid file format. Please upload a valid PDF document.' }, { status: 400 });
    }

    // Limit upload to 25MB for serverless stability
    if (file.size > 25 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'PDF file size exceeds 25MB limit. Please upload a smaller question paper.' },
        { status: 400 }
      );
    }

    console.log(
      `[API /api/admin/tests/extract-pdf] Received: "${file.name}" (${(file.size / 1024).toFixed(1)} KB), User: ${user.username}, GEMINI_API_KEY set: ${Boolean(process.env.GEMINI_API_KEY)}`
    );

    // Convert file to Node buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Run extraction pipeline
    const examData = await parsePdfToExam(buffer, file.name);

    console.log(
      `[API /api/admin/tests/extract-pdf] Result: ${examData.questions.length} questions extracted via ${examData.extraction_method} (AI status: ${examData.ai_status})`
    );

    await logActivity(user.id, 'pdf_paper_extracted', {
      filename: file.name,
      questions_extracted: examData.questions.length,
      method: examData.extraction_method,
      ai_status: examData.ai_status,
    });

    return NextResponse.json({
      success: true,
      examData,
      filename: file.name,
      fileSize: file.size,
      questionsCount: examData.questions.length,
      warning: examData.warning,
      ai_status: examData.ai_status,
      ai_error_details: examData.ai_error_details,
    });
  } catch (error: any) {
    console.error('PDF extraction route error:', error);
    return NextResponse.json(
      {
        error: error?.message || 'Failed to extract exam questions from PDF.',
      },
      { status: 500 }
    );
  }
}
