'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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
    startedAt?: string;
    endedAt?: string;
    candidate: string;
  };
  responses: ReportResponse[];
}

export default function ReportPage({ params }: { params: { id: string } }) {
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const router = useRouter();
  
  useEffect(() => {
    // Check if user is logged in and is admin
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      router.push('/');
      return;
    }
    
    const parsedUser = JSON.parse(storedUser);
    if (parsedUser.role !== 'admin') {
      router.push('/');
      return;
    }
    
    fetchReport();
  }, [router, params.id]);
  
  const fetchReport = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch(`/api/interview/report/${params.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setReport(data.data);
      } else {
        setError(data.message || 'Failed to fetch report');
      }
    } catch (error) {
      console.error('Error fetching report:', error);
      setError('An error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading report...</div>;
  }
  
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-white shadow-md rounded-lg p-6 max-w-lg w-full">
          <h2 className="text-xl font-semibold mb-4 text-red-600">Error</h2>
          <p className="mb-6">{error}</p>
          <Link href="/admin" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }
  
  if (!report) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-white shadow-md rounded-lg p-6 max-w-lg w-full">
          <h2 className="text-xl font-semibold mb-4">Report Not Found</h2>
          <p className="mb-6">The requested interview report could not be found.</p>
          <Link href="/admin" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Interview Report</h1>
          <Link href="/admin" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
            Back to Dashboard
          </Link>
        </div>
        
        <div className="bg-white shadow-md rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Interview Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="mb-2">
                <span className="font-medium">Candidate:</span> {report.interview.candidate}
              </p>
              <p className="mb-2">
                <span className="font-medium">Tech Stack:</span> {report.interview.techStack}
              </p>
            </div>
            <div>
              <p className="mb-2">
                <span className="font-medium">Status:</span>{' '}
                <span
                  className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    report.interview.status === 'evaluated'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {report.interview.status}
                </span>
              </p>
              <p className="mb-2">
                <span className="font-medium">Date:</span>{' '}
                {report.interview.startedAt
                  ? new Date(report.interview.startedAt).toLocaleString()
                  : 'N/A'}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white shadow-md rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-6">Responses & Evaluation</h2>
          
          {report.responses.length === 0 ? (
            <p>No responses recorded for this interview.</p>
          ) : (
            <div className="space-y-8">
              {report.responses.map((response, index) => (
                <div key={response.id} className="border-b pb-8 last:border-b-0 last:pb-0">
                  <h3 className="text-lg font-medium mb-4">
                    Question {index + 1}: {response.question}
                  </h3>
                  
                  <div className="mb-4">
                    <h4 className="font-medium mb-2">Audio Response:</h4>
                    <audio src={response.audioPath} controls className="w-full"></audio>
                  </div>
                  
                  <div className="mb-4">
                    <h4 className="font-medium mb-2">Transcription:</h4>
                    <div className="bg-gray-50 p-4 rounded">
                      {response.transcription || 'Not transcribed yet'}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium mb-2">Score:</h4>
                      <div className="bg-gray-50 p-4 rounded">
                        {typeof response.score === 'number' ? (
                          <div className="flex items-center">
                            <span
                              className={`text-2xl font-bold ${
                                response.score >= 7
                                  ? 'text-green-600'
                                  : response.score >= 4
                                  ? 'text-yellow-600'
                                  : 'text-red-600'
                              }`}
                            >
                              {response.score}
                            </span>
                            <span className="text-gray-500 ml-2">/ 10</span>
                          </div>
                        ) : (
                          response.score
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-2">Justification:</h4>
                      <div className="bg-gray-50 p-4 rounded">
                        {response.justification || 'Not evaluated yet'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}