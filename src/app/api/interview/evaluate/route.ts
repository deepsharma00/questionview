import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import axios from 'axios';
import dbConnect from '../../../../../lib/mongoose';
import Interview from '../../../../../models/Interview';
import Response from '../../../../../models/Response';
import Question from '../../../../../models/Question';
import { authMiddleware, adminMiddleware, UserPayload } from '../../../../../lib/auth';

// Function to transcribe audio using Whisper.cpp
async function transcribeAudio(audioPath: string): Promise<string> {
  // Path to the audio file on the server
  const fullPath = path.join(process.cwd(), 'public', audioPath);
  
  return new Promise((resolve, reject) => {
    // Assuming whisper.cpp is installed and available as 'whisper' command
    // Adjust the command based on your actual setup
    const whisper = spawn('whisper', [fullPath, '--output_format', 'txt']);
    
    let output = '';
    let error = '';
    
    whisper.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    whisper.stderr.on('data', (data) => {
      error += data.toString();
    });
    
    whisper.on('close', (code) => {
      if (code !== 0) {
        console.error(`Whisper process exited with code ${code}`);
        console.error(error);
        reject(new Error(`Transcription failed with code ${code}`));
      } else {
        resolve(output.trim());
      }
    });
  });
}

interface EvaluationResult {
  score: number | null;
  justification: string | null;
}

// Function to evaluate answer using HuggingFace API
async function evaluateAnswer(question: string, transcription: string): Promise<EvaluationResult> {
  try {
    const API_URL = "[https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2";](https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2";)
    
    const response = await axios.post(
      API_URL,
      {
        inputs: `<s>[INST] You are an expert interviewer evaluating a candidate's response to a technical interview question. 
        
Question: "${question}"

Candidate's Answer: "${transcription}"

Evaluate the answer on a scale from 1 to 10, where 1 is completely incorrect and 10 is perfect. 
Provide a score and a detailed justification for your score.
Format your response as:
Score: [number between 1-10]
Justification: [your detailed justification] [/INST]</s>`
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );
    
    const result = response.data[0].generated_text;
    
    // Extract score and justification using regex
    const scoreMatch = result.match(/Score:\s*(\d+)/i);
    const justificationMatch = result.match(/Justification:\s*([\s\S]+)$/i);
    
    const score = scoreMatch ? parseInt(scoreMatch[1]) : null;
    const justification = justificationMatch ? justificationMatch[1].trim() : null;
    
    return { score, justification };
  } catch (error) {
    console.error('LLM evaluation error:', error);
    throw new Error('Failed to evaluate answer with LLM');
  }
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
    const { interviewId } = await req.json();
    
    if (!interviewId) {
      return NextResponse.json(
        { success: false, message: 'Interview ID is required' },
        { status: 400 }
      );
    }
    
    // Find interview and check if it's completed
    const interview = await Interview.findById(interviewId);
    
    if (!interview) {
      return NextResponse.json(
        { success: false, message: 'Interview not found' },
        { status: 404 }
      );
    }
    
    if (interview.status !== 'completed') {
      return NextResponse.json(
        { success: false, message: 'Interview must be completed before evaluation' },
        { status: 400 }
      );
    }
    
    // Find all responses for this interview
    const responses = await Response.find({ interview: interviewId });
    
    if (responses.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No responses found for this interview' },
        { status: 404 }
      );
    }
    
    // Process each response
    const evaluationPromises = responses.map(async (response) => {
      // Skip if already evaluated
      if (response.transcription && response.score && response.justification) {
        return response;
      }
      
      try {
        // Get question text
        const question = await Question.findById(response.question);
        
        if (!question) {
          console.error(`Question not found for response ${response._id}`);
          return response;
        }
        
        // Transcribe audio
        const transcription = await transcribeAudio(response.audioPath);
        
        // Evaluate answer
        const { score, justification } = await evaluateAnswer(question.text, transcription);
        
        // Update response
        response.transcription = transcription;
        response.score = score;
        response.justification = justification;
        await response.save();
        
        return response;
      } catch (error) {
        console.error(`Error processing response ${response._id}:`, error);
        return response;
      }
    });
    
    await Promise.all(evaluationPromises);
    
    // Update interview status
    interview.status = 'evaluated';
    await interview.save();
    
    return NextResponse.json({
      success: true,
      message: 'Interview evaluation completed'
    });
  } catch (error) {
    console.error('Evaluation error:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
}