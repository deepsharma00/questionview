'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface User {
  id: string;
  username: string;
  role: string;
}

interface Interview {
  _id: string;
  candidate: string | User;
  techStack: string;
  status: string;
  startedAt: string;
  endedAt?: string;
}

export default function AdminDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'questions' | 'interviews' | 'reports'>('questions');
  const [interviews, setInterviews] = useState<Interview[]>([]);
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
    
    setUser(parsedUser);
    
    // Fetch active interviews
    fetchInterviews();
  }, [router]);
  
  const fetchInterviews = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch('/api/interview/list', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setInterviews(data.data);
      } else {
        setError(data.message || 'Failed to fetch interviews');
      }
    } catch (error) {
      console.error('Error fetching interviews:', error);
      setError('Failed to fetch interviews');
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
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-bold">AI Interview Platform</h1>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <button
                  onClick={() => setActiveTab('questions')}
                  className={`${
                    activeTab === 'questions'
                      ? 'border-indigo-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                >
                  Questions
                </button>
                <button
                  onClick={() => setActiveTab('interviews')}
                  className={`${
                    activeTab === 'interviews'
                      ? 'border-indigo-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                >
                  Interviews
                </button>
                <button
                  onClick={() => setActiveTab('reports')}
                  className={`${
                    activeTab === 'reports'
                      ? 'border-indigo-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                >
                  Reports
                </button>
              </div>
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
        {activeTab === 'questions' && <QuestionsPanel />}
        {activeTab === 'interviews' && <InterviewsPanel />}
        {activeTab === 'reports' && <ReportsPanel />}
      </main>
    </div>
  );
}

// Questions Panel Component
function QuestionsPanel() {
  const [techStack, setTechStack] = useState('');
  const [questions, setQuestions] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [questionsList, setQuestionsList] = useState<any[]>([]);
  const [selectedStack, setSelectedStack] = useState('');
  const [techStacks, setTechStacks] = useState<string[]>([]);
  
  useEffect(() => {
    fetchTechStacks();
  }, []);
  
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
          fetchQuestions(data.data[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching tech stacks:', error);
    }
  };
  
  const fetchQuestions = async (stack: string) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch(`/api/questions/${stack}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setQuestionsList(data.data);
      }
    } catch (error) {
      console.error('Error fetching questions:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ text: '', type: '' });
    
    try {
      const token = localStorage.getItem('token');
      
      const formData = new FormData();
      formData.append('techStack', techStack);
      
      if (questions) {
        formData.append('questions', questions);
      }
      
      if (file) {
        formData.append('file', file);
      }
      
      const response = await fetch('/api/questions/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessage({ text: data.message, type: 'success' });
        setQuestions('');
        setFile(null);
        
        // Refresh tech stacks and questions
        fetchTechStacks();
        if (techStack === selectedStack) {
          fetchQuestions(selectedStack);
        } else {
          setSelectedStack(techStack);
          fetchQuestions(techStack);
        }
      } else {
        setMessage({ text: data.message || 'Upload failed', type: 'error' });
      }
    } catch (error) {
      console.error('Upload error:', error);
      setMessage({ text: 'An error occurred during upload', type: 'error' });
    } finally {
      setLoading(false);
    }
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };
  
  const handleStackChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const stack = e.target.value;
    setSelectedStack(stack);
    fetchQuestions(stack);
  };
  
  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-6">Upload Interview Questions</h2>
      
      {message.text && (
        <div
          className={`p-4 mb-4 rounded ${
            message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}
        >
          {message.text}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="mb-8">
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="techStack">
            Tech Stack
          </label>
          <input
            id="techStack"
            type="text"
            value={techStack}
            onChange={(e) => setTechStack(e.target.value)}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            placeholder="e.g., React, Node.js, Python"
            required
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="questions">
            Questions (one per line)
          </label>
          <textarea
            id="questions"
            value={questions}
            onChange={(e) => setQuestions(e.target.value)}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            rows={5}
            placeholder="Enter questions, one per line"
          ></textarea>
        </div>
        
        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="file">
            Or Upload CSV/JSON File
          </label>
          <input
            id="file"
            type="file"
            onChange={handleFileChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            accept=".csv,.json"
          />
          <p className="text-sm text-gray-500 mt-1">
            CSV format should have a column named 'question'. JSON should be an array of objects with a 'question' field.
          </p>
        </div>
        
        <div>
          <button
            type="submit"
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            disabled={loading || (!questions && !file)}
          >
            {loading ? 'Uploading...' : 'Upload Questions'}
          </button>
        </div>
      </form>
      
      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-4">View Questions</h3>
        
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="stackSelect">
            Select Tech Stack
          </label>
          <select
            id="stackSelect"
            value={selectedStack}
            onChange={handleStackChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          >
            {techStacks.map((stack) => (
              <option key={stack} value={stack}>
                {stack}
              </option>
            ))}
          </select>
        </div>
        
        {loading ? (
          <p>Loading questions...</p>
        ) : questionsList.length > 0 ? (
          <div className="border rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Question
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date Added
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {questionsList.map((question) => (
                  <tr key={question._id}>
                    <td className="px-6 py-4 whitespace-normal text-sm text-gray-500">
                      {question.text}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(question.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>No questions found for this tech stack.</p>
        )}
      </div>
    </div>
  );
}

// Interviews Panel Component
function InterviewsPanel() {
  const [candidates, setCandidates] = useState<User[]>([]);
  const [techStacks, setTechStacks] = useState<string[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState('');
  const [selectedStack, setSelectedStack] = useState('');
  const [activeInterviews, setActiveInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ text: '', type: '' });
  
  useEffect(() => {
    fetchCandidates();
    fetchTechStacks();
    fetchActiveInterviews();
  }, []);
  
  const fetchCandidates = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/users/candidates', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setCandidates(data.data);
        if (data.data.length > 0) {
          setSelectedCandidate(data.data[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching candidates:', error);
    }
  };
  
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
    }
  };
  
  const fetchActiveInterviews = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch('/api/interview/active', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setActiveInterviews(data.data);
      }
    } catch (error) {
      console.error('Error fetching active interviews:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const startInterview = async () => {
    if (!selectedCandidate || !selectedStack) {
      setMessage({ text: 'Please select both candidate and tech stack', type: 'error' });
      return;
    }
    
    try {
      setLoading(true);
      setMessage({ text: '', type: '' });
      
      const token = localStorage.getItem('token');
      
      const response = await fetch('/api/interview/start', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          candidateId: selectedCandidate,
          techStack: selectedStack
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessage({ text: 'Interview started successfully', type: 'success' });
        fetchActiveInterviews();
      } else {
        setMessage({ text: data.message || 'Failed to start interview', type: 'error' });
      }
    } catch (error) {
      console.error('Error starting interview:', error);
      setMessage({ text: 'An error occurred', type: 'error' });
    } finally {
      setLoading(false);
    }
  };
  
  const endInterview = async (interviewId: string) => {
    try {
      setLoading(true);
      
      const token = localStorage.getItem('token');
      
      const response = await fetch(`/api/interview/${interviewId}/end`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessage({ text: 'Interview ended successfully', type: 'success' });
        fetchActiveInterviews();
      } else {
        setMessage({ text: data.message || 'Failed to end interview', type: 'error' });
      }
    } catch (error) {
      console.error('Error ending interview:', error);
      setMessage({ text: 'An error occurred', type: 'error' });
    } finally {
      setLoading(false);
    }
  };
  
  const evaluateInterview = async (interviewId: string) => {
    try {
      setLoading(true);
      
      const token = localStorage.getItem('token');
      
      const response = await fetch('/api/interview/evaluate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          interviewId
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessage({ text: 'Evaluation started. This may take some time.', type: 'success' });
        fetchActiveInterviews();
      } else {
        setMessage({ text: data.message || 'Failed to start evaluation', type: 'error' });
      }
    } catch (error) {
      console.error('Error evaluating interview:', error);
      setMessage({ text: 'An error occurred', type: 'error' });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-6">Manage Interviews</h2>
      
      {message.text && (
        <div
          className={`p-4 mb-4 rounded ${
            message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}
        >
          {message.text}
        </div>
      )}
      
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4">Start New Interview</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="candidate">
              Select Candidate
            </label>
            <select
              id="candidate"
              value={selectedCandidate}
              onChange={(e) => setSelectedCandidate(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            >
              {candidates.length === 0 && <option value="">No candidates available</option>}
              {candidates.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.username}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="techStack">
              Select Tech Stack
            </label>
            <select
              id="techStack"
              value={selectedStack}
              onChange={(e) => setSelectedStack(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            >
              {techStacks.length === 0 && <option value="">No tech stacks available</option>}
              {techStacks.map((stack) => (
                <option key={stack} value={stack}>
                  {stack}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <button
          onClick={startInterview}
          disabled={loading || !selectedCandidate || !selectedStack}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
        >
          {loading ? 'Processing...' : 'Start Interview'}
        </button>
      </div>
      
      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-4">Active Interviews</h3>
        
        {loading ? (
          <p>Loading interviews...</p>
        ) : activeInterviews.length > 0 ? (
          <div className="border rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Candidate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tech Stack
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Started
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {activeInterviews.map((interview) => (
                  <tr key={interview._id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {typeof interview.candidate === 'string'
                        ? interview.candidate
                        : interview.candidate.username}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {interview.techStack}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          interview.status === 'in-progress'
                            ? 'bg-green-100 text-green-800'
                            : interview.status === 'completed'
                            ? 'bg-blue-100 text-blue-800'
                            : interview.status === 'evaluated'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {interview.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(interview.startedAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {interview.status === 'in-progress' && (
                        <button
                          onClick={() => endInterview(interview._id)}
                          className="text-red-600 hover:text-red-900 mr-2"
                        >
                          End
                        </button>
                      )}
                      {interview.status === 'completed' && (
                        <button
                          onClick={() => evaluateInterview(interview._id)}
                          className="text-blue-600 hover:text-blue-900 mr-2"
                        >
                          Evaluate
                        </button>
                      )}
                      {interview.status === 'evaluated' && (
                        <Link
                          href={`/admin/report/${interview._id}`}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          View Report
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>No active interviews found.</p>
        )}
      </div>
    </div>
  );
}

// Reports Panel Component
function ReportsPanel() {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchEvaluatedInterviews();
  }, []);
  
  const fetchEvaluatedInterviews = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch('/api/interview/evaluated', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setInterviews(data.data);
      }
    } catch (error) {
      console.error('Error fetching evaluated interviews:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-6">Interview Reports</h2>
      
      {loading ? (
        <p>Loading reports...</p>
      ) : interviews.length > 0 ? (
        <div className="border rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Candidate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tech Stack
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {interviews.map((interview) => (
                <tr key={interview._id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {typeof interview.candidate === 'string'
                      ? interview.candidate
                      : interview.candidate.username}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {interview.techStack}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(interview.startedAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <Link
                      href={`/admin/report/${interview._id}`}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      View Report
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p>No evaluated interviews found.</p>
      )}
    </div>
  );
}