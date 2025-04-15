import { NextResponse } from 'next/server';
import dbConnect from '../../../../../lib/mongoose';
import Question from '../../../../../models/Question';

export async function GET() {
  await dbConnect();
  // Get distinct tech stacks from questions
  const techStacks = await Question.distinct('techStack');
  return NextResponse.json({ techStacks });
}