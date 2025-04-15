import jwt from 'jsonwebtoken';
import { NextRequest, NextResponse } from 'next/server';

export interface UserPayload {
  id: string;
  username: string;
  role: 'admin' | 'candidate';
}

export function getTokenFromHeader(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization');
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }
  
  return null;
}

export async function verifyToken(token: string): Promise<UserPayload | null> {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as UserPayload;
    return decoded;
  } catch (error) {
    return null;
  }
}

export async function authMiddleware(req: NextRequest): Promise<UserPayload | NextResponse> {
  const token = getTokenFromHeader(req);
  
  if (!token) {
    return NextResponse.json(
      { success: false, message: 'No token, authorization denied' },
      { status: 401 }
    );
  }
  
  const decoded = await verifyToken(token);
  
  if (!decoded) {
    return NextResponse.json(
      { success: false, message: 'Token is not valid' },
      { status: 401 }
    );
  }
  
  return decoded;
}

export function adminMiddleware(user: UserPayload): NextResponse | null {
  if (user.role !== 'admin') {
    return NextResponse.json(
      { success: false, message: 'Not authorized as admin' },
      { status: 403 }
    );
  }
  
  return null;
}

export function candidateMiddleware(user: UserPayload): NextResponse | null {
  if (user.role !== 'candidate') {
    return NextResponse.json(
      { success: false, message: 'Not authorized as candidate' },
      { status: 403 }
    );
  }
  
  return null;
}