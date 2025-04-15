import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '../../../../../../lib/mongoose';
import Interview from '../../../../../../models/Interview';
import Response from '../../../../../../models/Response';
import User from '../../../../../../models/User';
import { authMiddleware, adminMiddleware, UserPayload } from '../../../../../../lib/auth';

interface ReportResponse {
  id: string;
  question: string;
  audioPath: string;
  transcription: string;
  score: number | string;
  justification: string;
}

interface ReportData {
  interview: {
    id: string;
    techStack: string;
    status: string;
    startedAt?: Date;
    endedAt?: Date;
    candidate: string;
  };
  responses: ReportResponse[];
}

export async function GET(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
): Promise<NextResponse> {
  // Authenticate and authorize
  const userOrResponse = await authMiddleware(req);
  if (!(userOrResponse as UserPayload).id) {
    return userOrResponse as NextResponse;
  }
  
  const user = userOrResponse as UserPayload;
  const adminCheck = adminMiddleware(user);
  if (adminCheck) return adminCheck;
  
  await dbConnect();
  
  try {
    const { sessionId } = params;
    
    if (!sessionId) {
      return NextResponse.json(
        { success: false, message: 'Session ID is required' },
        { status: 400 }
      );
    }
    
    // Find interview
    const interview = await Interview.findById(sessionId);
    
    if (!interview) {
      return NextResponse.json(
        { success: false, message: 'Interview not found' },
        { status: 404 }
      );
    }
    
    // Get candidate info
    const candidate = await User.findById(interview.candidate, 'username');
    
    // Find all responses with populated questions
    const responses = await Response.find({ interview: sessionId })
      .populate('question')
      .sort({ createdAt: 1 });
    
    // Format report data
    const report: ReportData = {
      interview: {
        id: interview._id.toString(),
        techStack: interview.techStack,
        status: interview.status,
        startedAt: interview.startedAt,
        endedAt: interview.endedAt,
        candidate: candidate ? candidate.username : 'Unknown'
      },
      responses: responses.map(r => ({
        id: r._id.toString(),
        question: r.question ? (r.question as any).text : 'Unknown',
        audioPath: r.audioPath,
        transcription: r.transcription || 'Not transcribed yet',
        score: r.score || 'Not evaluated yet',
        justification: r.justification || 'Not evaluated yet'
      }))
    };
    
    return NextResponse.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Report error:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
}