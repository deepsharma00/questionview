'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  username: string;
  role: string;
}

interface Interview {
  _id: string;
  techStack: string;
  status: string;
}

interface Question {
  _id: string;
  text: string;
}

export default function CandidateDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [techStacks, setTechStacks] = useState<string[]>([]);
  const [selectedStack, setSelectedStack] = useState('');
  const [activeInterview, setActiveInterview] = useState<Interview | null>(null);
  const [interviewMode, setInterviewMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const router = useRouter();
  
  useEffect(() => {
    // Check if user is logged in and is candidate
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      router.push('/');
      return;
    }
    
    const parsedUser = JSON.parse(storedUser);
    if (parsedUser.role !== 'candidate') {
      router.push('/');
      return;
    }
    
    setUser(parsedUser);
    
    // Fetch tech stacks and check for active interview
    fetchTechStacks();
    checkActiveInterview();
  }, [router]);
  
  const fetchTechStacks = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/questions/stacks', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setTechStacks(data.data);
        if (data.data.length > 0) {
          setSelectedStack(data.data[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching tech stacks:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const checkActiveInterview = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch('/api/interview/candidate/active', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      
      if (data.success && data.data) {
        setActiveInterview(data.data);
        if (data.data.status === 'in-progress') {
          setInterviewMode(true);
        }
      }
    } catch (error) {
      console.error('Error checking active interview:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const joinInterview = async () => {
    if (!activeInterview || activeInterview.status !== 'pending') {
      setError('No pending interview available to join');
      return;
    }
    
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch(`/api/interview/${activeInterview._id}/join`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setActiveInterview({
          ...activeInterview,
          status: 'in-progress'
        });
        setInterviewMode(true);
      } else {
        setError(data.message || 'Failed to join interview');
      }
    } catch (error) {
      console.error('Error joining interview:', error);
      setError('An error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/');
  };
  
  if (!user) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }
  
  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex-shrink-0 flex items-center">
              <h1 className="text-xl font-bold">AI Interview Platform</h1>
            </div>
            <div className="flex items-center">
              <span className="mr-4">Welcome, {user.username}</span>
              <button
                onClick={handleLogout}
                className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {interviewMode ? (
          <InterviewInterface interviewId={activeInterview?._id || ''} />
        ) : (
          <div className="bg-white shadow-md rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-6">Candidate Dashboard</h2>
            
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}
            
            {activeInterview ? (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">Your Interview</h3>
                <div className="bg-gray-50 p-4 rounded border">
                  <p className="mb-2">
                    <strong>Tech Stack:</strong> {activeInterview.techStack}
                  </p>
                  <p className="mb-4">
                    <strong>Status:</strong>{' '}
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        activeInterview.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : activeInterview.status === 'in-progress'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {activeInterview.status}
                    </span>
                  </p>
                  
                  {activeInterview.status === 'pending' && (
                    <button
                      onClick={joinInterview}
                      className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                      disabled={loading}
                    >
                      {loading ? 'Joining...' : 'Join Interview'}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">No Active Interview</h3>
                <p className="text-gray-600">
                  You don't have any active interviews at the moment. Please wait for an administrator to start an interview for you.
                </p>
              </div>
            )}
            
            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-2">Available Tech Stacks</h3>
              {loading ? (
                <p>Loading tech stacks...</p>
              ) : techStacks.length > 0 ? (
                <ul className="bg-gray-50 p-4 rounded border">
                  {techStacks.map((stack) => (
                    <li key={stack} className="mb-2 last:mb-0">
                      {stack}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No tech stacks available.</p>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

interface InterviewInterfaceProps {
  interviewId: string;
}

function InterviewInterface({ interviewId }: InterviewInterfaceProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [completed, setCompleted] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  useEffect(() => {
    fetchQuestions();
  }, [interviewId]);
  
  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch(`/api/interview/${interviewId}/questions`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setQuestions(data.data);
      } else {
        setError(data.message || 'Failed to fetch questions');
      }
    } catch (error) {
      console.error('Error fetching questions:', error);
      setError('An error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
        
        // Stop all tracks in the stream
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorderRef.current.start();
      setRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      setError('Failed to access microphone. Please ensure you have granted permission.');
    }
  };
  
  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };
  
  const submitAnswer = async () => {
    if (!audioBlob) {
      setError('Please record an answer first');
      return;
    }
    
    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
      
      const formData = new FormData();
      formData.append('interviewId', interviewId);
      formData.append('questionId', questions[currentQuestionIndex]._id);
      formData.append('audio', audioBlob, 'recording.webm');
      
      const response = await fetch('/api/interview/submit', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Move to next question or complete
        if (currentQuestionIndex < questions.length - 1) {
          setCurrentQuestionIndex(currentQuestionIndex + 1);
          setAudioBlob(null);
        } else {
          // All questions answered
          await completeInterview();
        }
      } else {
        setError(data.message || 'Failed to submit answer');
      }
    } catch (error) {
      console.error('Error submitting answer:', error);
      setError('An error occurred');
    } finally {
      setSubmitting(false);
    }
  };
  
  const completeInterview = async () => {
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`/api/interview/${interviewId}/complete`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setCompleted(true);
      } else {
        setError(data.message || 'Failed to complete interview');
      }
    } catch (error) {
      console.error('Error completing interview:', error);
      setError('An error occurred');
    }
  };
  
  if (loading) {
    return <div className="bg-white shadow-md rounded-lg p-6">Loading interview questions...</div>;
  }
  
  if (completed) {
    return (
      <div className="bg-white shadow-md rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Interview Completed</h2>
        <div className="bg-green-100 text-green-700 p-4 rounded mb-6">
          <p>Thank you for completing the interview. Your responses have been recorded.</p>
          <p className="mt-2">The administrator will review your answers and may provide feedback.</p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }
  
  if (questions.length === 0) {
    return (
      <div className="bg-white shadow-md rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">No Questions Available</h2>
        <p>There are no questions available for this interview. Please contact an administrator.</p>
      </div>
    );
  }
  
  const currentQuestion = questions[currentQuestionIndex];
  
  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-6">Interview in Progress</h2>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-semibold">Question {currentQuestionIndex + 1} of {questions.length}</h3>
          <span className="text-sm text-gray-500">
            {Math.round((currentQuestionIndex / questions.length) * 100)}% complete
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div 
            className="bg-blue-600 h-2.5 rounded-full" 
            style={{ width: `${(currentQuestionIndex / questions.length) * 100}%` }}
          ></div>
        </div>
      </div>
      
      <div className="bg-gray-50 p-6 rounded-lg mb-6">
        <p className="text-lg">{currentQuestion.text}</p>
      </div>
      
      <div className="mb-6">
        <h4 className="font-medium mb-2">Your Answer:</h4>
        
        {audioBlob ? (
          <div className="mb-4">
            <audio src={URL.createObjectURL(audioBlob)} controls className="w-full"></audio>
          </div>
        ) : (
          <div className="bg-gray-100 p-4 rounded-lg text-center mb-4">
            {recording ? (
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-red-500 animate-pulse flex items-center justify-center mb-2">
                  <span className="text-white">REC</span>
                </div>
                <p>Recording in progress...</p>
              </div>
            ) : (
              <p>No recording yet. Click the button below to start recording your answer.</p>
            )}
          </div>
        )}
        
        <div className="flex space-x-4">
          {!recording && !audioBlob && (
            <button
              onClick={startRecording}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              disabled={submitting}
            >
              Start Recording
            </button>
          )}
          
          {recording && (
            <button
              onClick={stopRecording}
              className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              disabled={submitting}
            >
              Stop Recording
            </button>
          )}
          
          {audioBlob && (
            <>
              <button
                onClick={() => setAudioBlob(null)}
                className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                disabled={submitting}
              >
                Discard & Re-record
              </button>
              
              <button
                onClick={submitAnswer}
                className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                disabled={submitting}
              >
                {submitting ? 'Submitting...' : 'Submit Answer'}
              </button>
            </>
          )}
        </div>
      </div>
      
      <div className="text-sm text-gray-500">
        <p>Note: Please speak clearly and directly into your microphone.</p>
        <p>Your answers will be evaluated after the interview is complete.</p>
      </div>
    </div>
  );
}