import { NextResponse } from 'next/server';
import dbConnect from '../../../../../lib/mongoose';
import User from '../../../../../models/User';

export async function GET() {
  await dbConnect();
  const candidates = await User.find({ role: 'candidate' }).select('_id username');
  return NextResponse.json({
    success: true,
    data: candidates.map(u => ({ id: u._id, username: u.username }))
  });
}
