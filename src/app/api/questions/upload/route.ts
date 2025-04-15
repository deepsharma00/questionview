import { NextRequest, NextResponse } from 'next/server';
import { parse } from 'csv-parse/sync';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import dbConnect from '../../../../../lib/mongoose';
import Question from '../../../../../models/Question';
import { authMiddleware, adminMiddleware, UserPayload } from '../../../../../lib/auth';

interface FormData {
  fields: Record<string, string>;
  files: Record<string, { filepath: string; originalFilename?: string; mimetype?: string }>;
}

async function parseFormData(req: NextRequest): Promise<FormData> {
  const formData = await req.formData();
  const fields: Record<string, string> = {};
  const files: Record<string, { filepath: string; originalFilename?: string; mimetype?: string }> = {};
  
  // Process each form field
  for (const [key, value] of formData.entries()) {
    if (typeof value === 'string') {
      // Handle text fields
      fields[key] = value;
    } else if (value instanceof File) {
      // Handle file uploads
      const tempDir = os.tmpdir();
      const filename = `upload-${Date.now()}-${value.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
      const filepath = path.join(tempDir, filename);
      
      // Write file to temp directory
      const buffer = Buffer.from(await value.arrayBuffer());
      await fs.writeFile(filepath, buffer);
      
      files[key] = {
        filepath,
        originalFilename: value.name,
        mimetype: value.type
      };
    }
  }
  
  return { fields, files };
}

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
    const { fields, files } = await parseFormData(req);
    const techStack = fields.techStack;
    const questions = fields.questions;
    
    // Validate tech stack
    if (!techStack) {
      return NextResponse.json(
        { success: false, message: 'Tech stack is required' },
        { status: 400 }
      );
    }
    
    let questionsToAdd: { text: string; techStack: string; createdBy: string }[] = [];
    
    // Handle direct text input
    if (questions) {
      questionsToAdd = questions.split('\n')
        .map(q => q.trim())
        .filter(q => q.length > 0)
        .map(text => ({
          text,
          techStack,
          createdBy: user.id
        }));
    }
    
    // Handle file upload (CSV or JSON)
    if (files && files.file) {
      const file = files.file;
      const content = await fs.readFile(file.filepath, 'utf8');
      
      if (file.mimetype === 'text/csv' || file.originalFilename?.endsWith('.csv')) {
        // Parse CSV
        const records = parse(content, { columns: true, skip_empty_lines: true });
        
        records.forEach((record: any) => {
          if (record.question) {
            questionsToAdd.push({
              text: record.question,
              techStack,
              createdBy: user.id
            });
          }
        });
      } else if (file.mimetype === 'application/json' || file.originalFilename?.endsWith('.json')) {
        // Parse JSON
        const jsonData = JSON.parse(content);
        
        if (Array.isArray(jsonData)) {
          jsonData.forEach((item: any) => {
            if (item.question || item.text) {
              questionsToAdd.push({
                text: item.question || item.text,
                techStack,
                createdBy: user.id
              });
            }
          });
        }
      }
      
      // Clean up temporary file
      try {
        await fs.unlink(file.filepath);
      } catch (error) {
        console.error('Error removing temp file:', error);
      }
    }
    
    if (questionsToAdd.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No valid questions provided' },
        { status: 400 }
      );
    }
    
    // Save questions to database
    await Question.insertMany(questionsToAdd);
    
    return NextResponse.json({
      success: true,
      message: `${questionsToAdd.length} questions added successfully`,
      count: questionsToAdd.length
    });
  } catch (error) {
    console.error('Question upload error:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
}