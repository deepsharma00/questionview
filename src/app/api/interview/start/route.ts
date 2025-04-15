import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '../../../../../lib/mongoose';
import Interview from '../../../../../models/Interview';
import User from '../../../../../models/User';
import { authMiddleware, adminMiddleware, UserPayload } from '../../../../../lib/auth';

export async function POST(req: NextRequest): Promise<NextResponse> {
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
    const { candidateId, techStack } = await req.json();
    
    // Validate input
    if (!candidateId || !techStack) {
      return NextResponse.json(
        { success: false, message: 'Candidate ID and tech stack are required' },
        { status: 400 }
      );
    }
    
    // Verify candidate exists and is a candidate
    const candidate = await User.findById(candidateId);
    
    if (!candidate || candidate.role !== 'candidate') {
      return NextResponse.json(
        { success: false, message: 'Invalid candidate' },
        { status: 400 }
      );
    }
    
    // Check if candidate already has an active interview
    const activeInterview = await Interview.findOne({
      candidate: candidateId,
      status: { $in: ['pending', 'in-progress'] }
    });
    
    if (activeInterview) {
      return NextResponse.json(
        { success: false, message: 'Candidate already has an active interview' },
        { status: 400 }
      );
    }
    
    // Create new interview
    const interview = await Interview.create({
      candidate: candidateId,
      techStack,
      status: 'pending',
      startedAt: new Date()
    });
    
    return NextResponse.json({
      success: true,
      data: interview
    });
  } catch (error) {
    console.error('Start interview error:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
}