import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '../../../../../lib/mongoose';
import Interview from '../../../../../models/Interview';
import { authMiddleware, adminMiddleware, UserPayload } from '../../../../../lib/auth';

export async function GET(req: NextRequest) {
  const userOrResponse = await authMiddleware(req);
  if (!(userOrResponse as UserPayload).id) return userOrResponse as NextResponse;
  const user = userOrResponse as UserPayload;
  const adminCheck = adminMiddleware(user);
  if (adminCheck) return adminCheck;

  await dbConnect();
  const interviews = await Interview.find({ status: 'pending' });
  return NextResponse.json({ success: true, data: interviews });
}
