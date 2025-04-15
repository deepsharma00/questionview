import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '../../../../../lib/mongoose';
import User from '../../../../../models/User';

export async function POST(req: NextRequest): Promise<NextResponse> {
  await dbConnect();
  
  try {
    const { username, password } = await req.json();
    
    // Validate input
    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: 'Please provide username and password' },
        { status: 400 }
      );
    }
    
    // Find user
    const user = await User.findOne({ username });
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Invalid credentials' },
        { status: 401 }
      );
    }
    
    // Check password
    const isMatch = await user.matchPassword(password);
    
    if (!isMatch) {
      return NextResponse.json(
        { success: false, message: 'Invalid credentials' },
        { status: 401 }
      );
    }
    
    // Create token
    const token = jwt.sign(
      { id: user._id, username: user.username, role: user.role },
      process.env.JWT_SECRET as string,
      { expiresIn: '1d' }
    );
    
    return NextResponse.json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
}