import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { readLocalDB, saveAnswerAttachment, deleteAnswerAttachment, reorderAnswerAttachments, getAnswerAttachments } from '@/lib/db';
import fs from 'fs';
import path from 'path';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id: attemptId } = await params;
    const db = readLocalDB();
    const attempt = db.test_attempts.find(a => a.id === attemptId && a.student_id === user.id);
    if (!attempt) {
      return NextResponse.json({ error: 'Active exam attempt not found' }, { status: 404 });
    }

    if (attempt.status !== 'in_progress') {
      return NextResponse.json({ error: 'This exam has already been submitted.' }, { status: 400 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const questionId = formData.get('question_id') as string | null;
    const pageOrderStr = formData.get('page_order') as string | null;

    if (!file || !questionId) {
      return NextResponse.json({ error: 'File and question_id are required' }, { status: 400 });
    }

    // Validate mime type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      return NextResponse.json(
        { error: 'Invalid file format. Please upload JPG, PNG, or WebP images.' },
        { status: 400 }
      );
    }

    // Validate size (15MB max)
    if (file.size > 15 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Image size exceeds maximum limit of 15MB.' },
        { status: 400 }
      );
    }

    // Ensure uploads directory exists in both public/uploads and .data/uploads
    const publicDir = path.join(process.cwd(), 'public', 'uploads', 'answers', attemptId);
    const dataDir = path.join(process.cwd(), '.data', 'uploads', 'answers', attemptId);
    fs.mkdirSync(publicDir, { recursive: true });
    fs.mkdirSync(dataDir, { recursive: true });

    const fileExt = path.extname(file.name) || '.jpg';
    const uniqueFileName = `${questionId}_page_${Date.now()}_${Math.random().toString(36).substring(2, 7)}${fileExt}`;
    
    const publicFilePath = path.join(publicDir, uniqueFileName);
    const dataFilePath = path.join(dataDir, uniqueFileName);

    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(publicFilePath, buffer);
    fs.writeFileSync(dataFilePath, buffer);

    const fileUrl = `/uploads/answers/${attemptId}/${uniqueFileName}`;
    const pageOrder = pageOrderStr ? parseInt(pageOrderStr, 10) : undefined;

    const attachment = await saveAnswerAttachment({
      attempt_id: attemptId,
      student_id: user.id,
      test_id: attempt.test_id,
      question_id: questionId,
      file_url: fileUrl,
      storage_path: dataFilePath,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type,
      page_order: pageOrder,
    });

    return NextResponse.json({
      success: true,
      attachment,
    });
  } catch (error: any) {
    console.error('Answer photo upload error:', error);
    return NextResponse.json({ error: 'Failed to upload answer image' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id: attemptId } = await params;
    const { searchParams } = new URL(req.url);
    const attachmentId = searchParams.get('attachment_id');

    if (!attachmentId) {
      return NextResponse.json({ error: 'attachment_id query param is required' }, { status: 400 });
    }

    const success = await deleteAnswerAttachment(attachmentId, user.id);
    if (!success) {
      return NextResponse.json({ error: 'Attachment not found or not owned by student' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Attachment deleted successfully' });
  } catch (error: any) {
    console.error('Delete attachment error:', error);
    return NextResponse.json({ error: 'Failed to delete attachment' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id: attemptId } = await params;
    const body = await req.json();
    const { question_id, ordered_ids } = body;

    if (!question_id || !Array.isArray(ordered_ids)) {
      return NextResponse.json({ error: 'question_id and ordered_ids array are required' }, { status: 400 });
    }

    const updated = await reorderAnswerAttachments(attemptId, question_id, ordered_ids);
    return NextResponse.json({ success: true, attachments: updated });
  } catch (error: any) {
    console.error('Reorder attachments error:', error);
    return NextResponse.json({ error: 'Failed to reorder attachments' }, { status: 500 });
  }
}
