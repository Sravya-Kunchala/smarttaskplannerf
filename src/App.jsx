import React, { useState, useEffect } from 'react';
import './App.css';

const API_BASE = 'http://localhost:5001/api';
export default function App() {
  const [goal, setGoal] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [savedPlans, setSavedPlans] = useState([]);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('create');

  useEffect(() => {
    fetchSavedPlans();
  }, []);

  const fetchSavedPlans = async () => {
    try {
      const res = await fetch(`${API_BASE}/plans`);
      const data = await res.json();
      if (data.success) {
        setSavedPlans(data.plans);
      }
    } catch (err) {
      console.error('Failed to fetch plans:', err);
    }
  };

  const generatePlan = async () => {
    if (!goal.trim()) {
      setError('Please enter a goal');
      return;
    }

    setLoading(true);
    setError('');
    setCurrentPlan(null);

    try {
      const res = await fetch(`${API_BASE}/generate-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || data.details || 'Failed to generate plan');
      }

      setCurrentPlan(data.plan);
      fetchSavedPlans();
      setActiveTab('plan');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const deletePlan = async (id) => {
    try {
      await fetch(`${API_BASE}/plans/${id}`, { method: 'DELETE' });
      fetchSavedPlans();
      if (currentPlan?.id === id) {
        setCurrentPlan(null);
        setActiveTab('create');
      }
    } catch (err) {
      console.error('Failed to delete plan:', err);
    }
  };

  const loadPlan = (plan) => {
    setCurrentPlan(plan);
    setActiveTab('plan');
  };

  const getPriorityClass = (priority) => {
    switch (priority) {
      case 'High': return 'priority-high';
      case 'Medium': return 'priority-medium';
      case 'Low': return 'priority-low';
      default: return 'priority-default';
    }
  };

  return (
    <div className="app-container">
      <div className="main-content">
        {/* Header */}
        <div className="header">
          <div className="header-title">
            <span className="sparkle-icon">✨</span>
            <h1>Smart Task Planner</h1>
          </div>
          <p className="header-subtitle">AI-powered project breakdown with timelines & dependencies</p>
        </div>

        {/* Tabs */}
        <div className="tabs">
          <button
            onClick={() => setActiveTab('create')}
            className={`tab ${activeTab === 'create' ? 'tab-active' : ''}`}
          >
            Create Plan
          </button>
          <button
            onClick={() => setActiveTab('saved')}
            className={`tab ${activeTab === 'saved' ? 'tab-active' : ''}`}
          >
            Saved Plans ({savedPlans.length})
          </button>
          {currentPlan && (
            <button
              onClick={() => setActiveTab('plan')}
              className={`tab ${activeTab === 'plan' ? 'tab-active' : ''}`}
            >
              Current Plan
            </button>
          )}
        </div>

        {/* Create Tab */}
        {activeTab === 'create' && (
          <div className="card">
            <div className="form-group">
              <label className="form-label">What's your goal?</label>
              <textarea
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="E.g., Launch a product in 2 weeks, Build a mobile app, Organize a conference..."
                className="textarea"
                rows="4"
              />
            </div>

            {error && (
              <div className="error-box">
                <span className="error-icon">⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <button
              onClick={generatePlan}
              disabled={loading}
              className="btn-primary"
            >
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Generating Plan...
                </>
              ) : (
                <>
                  <span className="btn-icon">✨</span>
                  Generate Smart Plan
                </>
              )}
            </button>
          </div>
        )}

        {/* Saved Plans Tab */}
        {activeTab === 'saved' && (
          <div className="card">
            <h2 className="section-title">Your Saved Plans</h2>
            {savedPlans.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">📋</span>
                <p className="empty-title">No saved plans yet</p>
                <p className="empty-text">Create your first plan to get started!</p>
              </div>
            ) : (
              <div className="plans-list">
                {savedPlans.map((plan) => (
                  <div key={plan.id} className="plan-card" onClick={() => loadPlan(plan)}>
                    <div className="plan-content">
                      <h3 className="plan-title">{plan.goal}</h3>
                      <p className="plan-summary">{plan.summary}</p>
                      <div className="plan-meta">
                        <span>📅 {plan.totalEstimatedDays} days</span>
                        <span>✅ {plan.tasks.length} tasks</span>
                        <span>Created: {new Date(plan.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deletePlan(plan.id);
                      }}
                      className="btn-delete"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Plan View Tab */}
        {activeTab === 'plan' && currentPlan && (
          <div className="plan-view">
            {/* Summary */}
            <div className="card">
              <h2 className="plan-main-title">{currentPlan.goal}</h2>
              <p className="plan-description">{currentPlan.summary}</p>
              
              <div className="stats-grid">
                <div className="stat-card stat-blue">
                  <div className="stat-label">📅 Total Duration</div>
                  <div className="stat-value">{currentPlan.totalEstimatedDays} days</div>
                </div>
                
                <div className="stat-card stat-green">
                  <div className="stat-label">✅ Total Tasks</div>
                  <div className="stat-value">{currentPlan.tasks.length}</div>
                </div>
                
                <div className="stat-card stat-purple">
                  <div className="stat-label">⏱️ Est. Hours</div>
                  <div className="stat-value">
                    {currentPlan.tasks.reduce((sum, t) => sum + t.estimatedHours, 0)}h
                  </div>
                </div>
              </div>
            </div>

            {/* Milestones */}
            {currentPlan.milestones && currentPlan.milestones.length > 0 && (
              <div className="card">
                <h3 className="section-title">🎯 Milestones</h3>
                <div className="milestones-list">
                  {currentPlan.milestones.map((milestone, idx) => (
                    <div key={idx} className="milestone-card">
                      <div className="milestone-name">{milestone.name}</div>
                      <div className="milestone-day">Day {milestone.completionDay}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tasks */}
            <div className="card">
              <h3 className="section-title">📝 Task Breakdown</h3>
              <div className="tasks-list">
                {currentPlan.tasks.map((task) => {
                  const timeline = currentPlan.timeline[task.id];
                  const categoryIcon = {
                    'Planning': '📋',
                    'Development': '💻',
                    'Design': '🎨',
                    'Testing': '🧪',
                    'Marketing': '📢'
                  }[task.category] || '📌';

                  return (
                    <div key={task.id} className="task-card">
                      <div className="task-icon">{categoryIcon}</div>
                      <div className="task-content">
                        <div className="task-header">
                          <h4 className="task-title">
                            {task.id}. {task.title}
                          </h4>
                          <span className={`priority-badge ${getPriorityClass(task.priority)}`}>
                            {task.priority}
                          </span>
                        </div>
                        <p className="task-description">{task.description}</p>
                        
                        <div className="task-meta">
                          <span>⏱️ {task.estimatedHours}h</span>
                          <span>📅 Days {timeline?.startDay}-{timeline?.endDay}</span>
                          <span>🏷️ {task.category}</span>
                          {task.dependencies.length > 0 && (
                            <span>🔗 Depends on: #{task.dependencies.join(', #')}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recommendations */}
            {currentPlan.recommendations && currentPlan.recommendations.length > 0 && (
              <div className="card">
                <h3 className="section-title">💡 Recommendations</h3>
                <ul className="recommendations-list">
                  {currentPlan.recommendations.map((rec, idx) => (
                    <li key={idx} className="recommendation-item">
                      <span className="recommendation-number">{idx + 1}.</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}