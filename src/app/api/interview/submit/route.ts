import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import formidable from 'formidable';
import dbConnect from '../../../../../lib/mongoose';
import Interview from '../../../../../models/Interview';
import Question from '../../../../../models/Question';
import Response from '../../../../../models/Response';
import { authMiddleware, candidateMiddleware, UserPayload } from '../../../../../lib/auth';

export const config = {
  api: {
    bodyParser: false,
  },
};

interface FormData {
  fields: formidable.Fields;
  files: formidable.Files;
}

async function parseFormData(req: NextRequest): Promise<FormData> {
  const form = formidable();
  
  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      resolve({ fields, files });
    });
  });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Authenticate and authorize
  const userOrResponse = await authMiddleware(req);
  if (!(userOrResponse as UserPayload).id) {
    return userOrResponse as NextResponse;
  }
  
  const user = userOrResponse as UserPayload;
  const candidateCheck = candidateMiddleware(user);
  if (candidateCheck) return candidateCheck;
  
  await dbConnect();
  
  try {
    const { fields, files } = await parseFormData(req);
    const interviewId = fields.interviewId as string;
    const questionId = fields.questionId as string;
    const audioFile = files.audio?.[0];
    
    // Validate input
    if (!interviewId || !questionId || !audioFile) {
      return NextResponse.json(
        { success: false, message: 'Interview ID, question ID, and audio file are required' },
        { status: 400 }
      );
    }
    
    // Verify interview exists and belongs to this candidate
    const interview = await Interview.findOne({
      _id: interviewId,
      candidate: user.id,
      status: 'in-progress'
    });
    
    if (!interview) {
      return NextResponse.json(
        { success: false, message: 'Interview not found or not in progress' },
        { status: 404 }
      );
    }
    
    // Verify question exists
    const question = await Question.findById(questionId);
    
    if (!question) {
      return NextResponse.json(
        { success: false, message: 'Question not found' },
        { status: 404 }
      );
    }
    
    // Create directory if it doesn't exist
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'audio');
    await fs.mkdir(uploadDir, { recursive: true });
    
    // Generate unique filename
    const timestamp = Date.now();
    const filename = `interview_${interviewId}_question_${questionId}_${timestamp}.webm`;
    const filepath = path.join(uploadDir, filename);
    
    // Save audio file
    const data = await fs.readFile(audioFile.filepath);
    await fs.writeFile(filepath, data);
    
    // Create response record
    const audioPath = `/uploads/audio/${filename}`;
    const response = await Response.create({
      interview: interviewId,
      question: questionId,
      audioPath
    });
    
    return NextResponse.json({
      success: true,
      data: response
    });
  } catch (error) {
    console.error('Submit response error:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
}