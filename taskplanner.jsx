import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, collection, query, onSnapshot, doc, addDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import axios from 'axios';
import { Loader2, Plus, Trash2, CheckCircle, Lightbulb, LogOut, User } from 'lucide-react';

// --- GLOBAL VARIABLES (Provided by the Canvas Environment) ---
// These are used for Firebase setup and authorization.
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : null;
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
// API URL from user's .env file (http://localhost:5002/api)
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

// Utility for exponential backoff (for API calls)
const withRetry = async (fn, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      const delay = Math.pow(2, i) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

const App = () => {
  // --- Core State Management ---
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [tasks, setTasks] = useState([]);

  // --- UI/Interaction State ---
  const [newTaskText, setNewTaskText] = useState('');
  const [loading, setLoading] = useState(true);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState(null);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [showAiModal, setShowAiModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // --- FIREBASE INITIALIZATION AND AUTH ---
  useEffect(() => {
    if (!firebaseConfig) {
      setErrorMessage("Firebase configuration is missing.");
      setLoading(false);
      return;
    }

    try {
      const app = initializeApp(firebaseConfig);
      const firestore = getFirestore(app);
      const firebaseAuth = getAuth(app);

      setDb(firestore);
      setAuth(firebaseAuth);

      onAuthStateChanged(firebaseAuth, async (user) => {
        if (user) {
          setUserId(user.uid);
          setIsAuthReady(true);
        } else {
          // If no user, sign in using the provided token or anonymously
          try {
            if (initialAuthToken) {
              const credentials = await signInWithCustomToken(firebaseAuth, initialAuthToken);
              setUserId(credentials.user.uid);
            } else {
              const credentials = await signInAnonymously(firebaseAuth);
              setUserId(credentials.user.uid);
            }
          } catch (error) {
            console.error("Firebase Auth Error:", error);
            setErrorMessage("Failed to sign in to Firebase. Check console for details.");
          } finally {
            setIsAuthReady(true);
            setLoading(false);
          }
        }
      });
    } catch (e) {
      setErrorMessage(`Firebase Initialization Error: ${e.message}`);
      setLoading(false);
    }
  }, []);

  // --- FIRESTORE DATA LISTENER ---
  useEffect(() => {
    if (!db || !isAuthReady || !userId) return;

    // Use private data path: /artifacts/{appId}/users/{userId}/{your_collection_name}
    const tasksCollectionPath = `artifacts/${appId}/users/${userId}/tasks`;
    const tasksCollectionRef = collection(db, tasksCollectionPath);
    const q = query(tasksCollectionRef);

    setLoading(true);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedTasks = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // Sort tasks: Incomplete first, then by createdAt (latest first)
      fetchedTasks.sort((a, b) => {
        if (a.completed !== b.completed) {
          return a.completed ? 1 : -1;
        }
        const timeA = a.createdAt?.toMillis() || 0;
        const timeB = b.createdAt?.toMillis() || 0;
        return timeB - timeA;
      });
      setTasks(fetchedTasks);
      setLoading(false);
    }, (error) => {
      console.error("Firestore Listener Error:", error);
      setErrorMessage("Failed to fetch tasks in real-time.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [db, userId, isAuthReady]);

  // --- CRUD Operations ---
  const addTask = useCallback(async (text) => {
    if (!db || !userId || text.trim() === '') return;
    try {
      const tasksCollectionPath = `artifacts/${appId}/users/${userId}/tasks`;
      await withRetry(() => addDoc(collection(db, tasksCollectionPath), {
        text: text.trim(),
        completed: false,
        createdAt: serverTimestamp(),
      }));
      setNewTaskText('');
    } catch (error) {
      console.error("Error adding task:", error);
      setErrorMessage("Could not add task. Please try again.");
    }
  }, [db, userId]);

  const toggleTaskCompletion = useCallback(async (taskId, completed) => {
    if (!db || !userId) return;
    try {
      const taskDocPath = `artifacts/${appId}/users/${userId}/tasks/${taskId}`;
      await withRetry(() => updateDoc(doc(db, taskDocPath), {
        completed: !completed,
      }));
    } catch (error) {
      console.error("Error toggling task:", error);
      setErrorMessage("Could not update task status.");
    }
  }, [db, userId]);

  const deleteTask = useCallback(async (taskId) => {
    if (!db || !userId) return;
    try {
      const taskDocPath = `artifacts/${appId}/users/${userId}/tasks/${taskId}`;
      await withRetry(() => deleteDoc(doc(db, taskDocPath)));
    } catch (error) {
      console.error("Error deleting task:", error);
      setErrorMessage("Could not delete task.");
    }
  }, [db, userId]);

  // --- AI Task Generation ---
  const generateTasksFromPrompt = useCallback(async () => {
    if (!aiPrompt.trim() || isGenerating) return;
    setIsGenerating(true);
    setGenerationError(null);
    setAiSuggestions([]);

    try {
      const response = await withRetry(() => axios.post(`${API_URL}/generate-tasks`, {
        prompt: aiPrompt,
      }));

      // Expecting response.data.tasks to be an array of strings
      if (response.data && Array.isArray(response.data.tasks)) {
        setAiSuggestions(response.data.tasks);
      } else {
        setGenerationError('AI returned an unexpected format.');
      }
    } catch (error) {
      console.error("AI Generation Error:", error.response?.data || error.message);
      setGenerationError(error.response?.data?.error || 'Failed to connect to the AI service. Check your backend and API key.');
    } finally {
      setIsGenerating(false);
    }
  }, [aiPrompt]);

  const addAiSuggestion = useCallback((taskText) => {
    addTask(taskText);
    setAiSuggestions(prev => prev.filter(t => t !== taskText));
  }, [addTask]);

  const dismissAiSuggestions = () => {
    setAiSuggestions([]);
    setAiPrompt('');
    setShowAiModal(false);
  };
  
  const handleLogout = useCallback(async () => {
    if (auth) {
      try {
        await signOut(auth);
        setUserId(null);
        setTasks([]);
        setLoading(true); // Will be set to false once onAuthStateChanged handles re-sign in
      } catch (error) {
        console.error("Logout Error:", error);
        setErrorMessage("Failed to log out.");
      }
    }
  }, [auth]);

  // --- UI Components ---

  const TaskItem = useMemo(() => ({ task }) => (
    <div
      className={`flex items-center justify-between p-4 mb-2 rounded-lg shadow-md transition-all duration-300 transform hover:scale-[1.01] ${task.completed ? 'bg-primary-50 border-l-4 border-primary-500' : 'bg-white border-l-4 border-primary-600'}`}
    >
      <div className="flex items-center flex-1 pr-4">
        <button
          onClick={() => toggleTaskCompletion(task.id, task.completed)}
          className={`mr-3 p-1 rounded-full transition-colors duration-200 focus:outline-none ${task.completed ? 'text-primary-500 hover:text-primary-700' : 'text-gray-300 hover:text-primary-400'}`}
          aria-label={task.completed ? "Mark as incomplete" : "Mark as complete"}
        >
          <CheckCircle className={task.completed ? "fill-primary-500" : ""} size={20} />
        </button>
        <span className={`text-gray-800 break-words flex-1 ${task.completed ? 'line-through text-gray-400 italic' : 'font-medium'}`}>
          {task.text}
        </span>
      </div>
      <button
        onClick={() => deleteTask(task.id)}
        className="text-red-400 hover:text-red-600 p-1 rounded-full transition-colors duration-200 focus:outline-none"
        aria-label="Delete task"
      >
        <Trash2 size={20} />
      </button>
    </div>
  ), [toggleTaskCompletion, deleteTask]);


  const AiTaskModal = useMemo(() => () => (
    <div className={`fixed inset-0 z-50 bg-gray-900 bg-opacity-70 flex items-center justify-center p-4 transition-opacity duration-300 ${showAiModal ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 transform transition-transform duration-300 scale-100">
        <h3 className="text-xl font-bold text-primary-700 mb-4 flex items-center">
          <Lightbulb className="mr-2 text-yellow-500" /> AI Task Generator
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Tell the AI what you want to achieve, and it will break it down into actionable tasks.
        </p>

        <input
          type="text"
          value={aiPrompt}
          onChange={(e) => setAiPrompt(e.target.value)}
          placeholder="e.g., 'Plan a weekend trip to the mountains'"
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 mb-4 transition-colors"
          disabled={isGenerating}
        />

        <button
          onClick={generateTasksFromPrompt}
          disabled={isGenerating || aiPrompt.trim() === ''}
          className="w-full bg-primary-600 text-white font-semibold py-3 px-4 rounded-lg shadow-md hover:bg-primary-700 transition-colors duration-200 flex items-center justify-center disabled:bg-primary-300"
        >
          {isGenerating && <Loader2 className="animate-spin mr-2" size={20} />}
          {isGenerating ? 'Generating...' : 'Generate Tasks'}
        </button>

        {generationError && (
          <p className="text-red-500 text-sm mt-3 p-2 bg-red-50 rounded-lg border border-red-200">{generationError}</p>
        )}

        {aiSuggestions.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200 max-h-60 overflow-y-auto">
            <h4 className="font-semibold text-gray-700 mb-2">Suggestions:</h4>
            {aiSuggestions.map((suggestion, index) => (
              <div key={index} className="flex justify-between items-center p-2 mb-1 bg-primary-50 rounded-md border border-primary-200">
                <span className="text-sm text-gray-800 pr-4">{suggestion}</span>
                <button
                  onClick={() => addAiSuggestion(suggestion)}
                  className="text-primary-600 hover:text-primary-800 p-1 rounded-full transition-colors"
                  aria-label="Add suggestion to list"
                >
                  <Plus size={18} />
                </button>
              </div>
            ))}
            <div className="mt-4 flex justify-end space-x-2">
              <button
                onClick={dismissAiSuggestions}
                className="text-gray-600 bg-gray-100 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
              >
                Dismiss
              </button>
              <button
                onClick={() => setAiSuggestions([])}
                className="text-red-600 bg-red-100 py-2 px-4 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium"
              >
                Clear All
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  ), [showAiModal, aiPrompt, isGenerating, generationError, aiSuggestions, generateTasksFromPrompt, addAiSuggestion]);

  // --- Main Render ---
  if (loading || !isAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex items-center text-primary-600">
          <Loader2 className="animate-spin mr-3" size={24} />
          <span className="text-lg font-medium">Loading Application...</span>
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50 p-4">
        <div className="bg-white p-6 rounded-lg shadow-xl border-t-4 border-red-500">
          <h2 className="text-2xl font-bold text-red-600 mb-3">System Error</h2>
          <p className="text-gray-700">{errorMessage}</p>
          {auth?.currentUser && (
             <p className="mt-4 text-sm text-gray-500 flex items-center"><User size={16} className="mr-1"/> User ID: {auth.currentUser.uid}</p>
          )}
        </div>
      </div>
    );
  }

  const incompleteTasks = tasks.filter(t => !t.completed);
  const completedTasks = tasks.filter(t => t.completed);

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <div className="max-w-3xl mx-auto p-4 md:p-8">
        
        {/* Header and User Info */}
        <header className="flex justify-between items-center mb-6 border-b pb-4">
          <h1 className="text-3xl font-extrabold text-primary-800 flex items-center">
            Smart Task Planner
          </h1>
          <div className="flex items-center space-x-3">
            <span className="text-xs font-mono text-gray-500 p-1 bg-gray-100 rounded-md truncate max-w-[100px] sm:max-w-none" title={`User ID: ${userId}`}>
              <User size={14} className="inline mr-1" />
              {userId}
            </span>
            <button
              onClick={handleLogout}
              className="p-2 bg-red-100 text-red-600 rounded-full hover:bg-red-200 transition-colors"
              title="Logout"
            >
              <LogOut size={20} />
            </button>
          </div>
        </header>

        {/* Add New Task Form */}
        <div className="mb-8 p-6 bg-white rounded-xl shadow-lg border-t-4 border-primary-500">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              addTask(newTaskText);
            }}
            className="flex space-x-2"
          >
            <input
              type="text"
              value={newTaskText}
              onChange={(e) => setNewTaskText(e.target.value)}
              placeholder="Add a new task or goal..."
              className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 transition-colors"
              required
            />
            <button
              type="submit"
              className="bg-primary-600 text-white p-3 rounded-lg shadow-md hover:bg-primary-700 transition-colors duration-200 flex items-center justify-center disabled:opacity-50"
              disabled={newTaskText.trim() === ''}
              aria-label="Add Task"
            >
              <Plus size={24} />
            </button>
          </form>

          <button
            onClick={() => {
                setAiPrompt('');
                setAiSuggestions([]);
                setGenerationError(null);
                setShowAiModal(true);
            }}
            className="w-full mt-3 bg-yellow-100 text-yellow-800 py-2 rounded-lg shadow-sm hover:bg-yellow-200 transition-colors duration-200 flex items-center justify-center font-medium"
          >
            <Lightbulb size={20} className="mr-2" />
            Generate Tasks with AI
          </button>
        </div>

        {/* Incomplete Tasks */}
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          Tasks ({incompleteTasks.length})
        </h2>
        {incompleteTasks.length === 0 && completedTasks.length === 0 ? (
            <p className="text-center text-gray-500 p-8 border-dashed border-2 border-gray-300 rounded-lg bg-white">
                You have no tasks! Use the form above or the AI tool to start planning.
            </p>
        ) : incompleteTasks.length === 0 ? (
             <p className="text-center text-primary-500 p-4 border-2 border-primary-200 rounded-lg bg-primary-50 font-medium">
                Great job! All tasks completed.
            </p>
        ) : (
            <div>
                {incompleteTasks.map(task => (
                    <TaskItem key={task.id} task={task} />
                ))}
            </div>
        )}

        {/* Completed Tasks */}
        {completedTasks.length > 0 && (
          <div className="mt-10 pt-4 border-t border-gray-200">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Completed ({completedTasks.length})
            </h2>
            {completedTasks.map(task => (
                <TaskItem key={task.id} task={task} />
            ))}
          </div>
        )}

      </div>
      
      {/* AI Modal */}
      <AiTaskModal />
    </div>
  );
};

export default App;
