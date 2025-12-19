import React, { useState, useEffect } from 'react';
import { WorkoutLog } from '../lib/supabaseClient';
import { upsertWorkoutLog, fetchWorkoutLog } from '../lib/workoutLogService';
import './WorkoutLogModal.css';

interface WorkoutLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: 'aaron' | 'kristin';
  date: string; // ISO date format
  planWorkout: string; // The prescribed workout text
  onSave?: () => void; // Callback after successful save
}

export const WorkoutLogModal: React.FC<WorkoutLogModalProps> = ({
  isOpen,
  onClose,
  userId,
  date,
  planWorkout,
  onSave,
}) => {
  const [completed, setCompleted] = useState(false);
  const [actualPace, setActualPace] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Load existing log when modal opens
  useEffect(() => {
    if (isOpen) {
      setInitialLoading(true);
      fetchWorkoutLog(userId, date)
        .then((log) => {
          if (log) {
            setCompleted(log.completed);
            setActualPace(log.actual_pace || '');
            setNotes(log.notes || '');
          } else {
            // Reset to defaults if no log exists
            setCompleted(false);
            setActualPace('');
            setNotes('');
          }
        })
        .finally(() => setInitialLoading(false));
    }
  }, [isOpen, userId, date]);

  const handleSave = async () => {
    setLoading(true);
    
    const log: WorkoutLog = {
      user_id: userId,
      date,
      plan_workout: planWorkout,
      completed,
      actual_pace: actualPace.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    const result = await upsertWorkoutLog(log);
    
    setLoading(false);
    
    if (result) {
      onSave?.();
      onClose();
    } else {
      alert('Failed to save workout log. Please try again.');
    }
  };

  const handleCancel = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>Log Workout</h2>
        <div className="modal-date">{new Date(date).toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })}</div>
        
        <div className="modal-workout-prescribed">
          <strong>Prescribed:</strong> {planWorkout || 'Rest day'}
        </div>

        {initialLoading ? (
          <div className="modal-loading">Loading...</div>
        ) : (
          <>
            <div className="modal-field">
              <label>
                <input
                  type="checkbox"
                  checked={completed}
                  onChange={(e) => setCompleted(e.target.checked)}
                />
                {' '}Mark as completed
              </label>
            </div>

            <div className="modal-field">
              <label htmlFor="actual-pace">Actual Pace</label>
              <input
                id="actual-pace"
                type="text"
                placeholder="e.g., 8:20/mi average"
                value={actualPace}
                onChange={(e) => setActualPace(e.target.value)}
              />
            </div>

            <div className="modal-field">
              <label htmlFor="notes">Notes</label>
              <textarea
                id="notes"
                rows={4}
                placeholder="How did it feel? Any observations?"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="modal-buttons">
              <button 
                className="modal-btn modal-btn-cancel" 
                onClick={handleCancel}
                disabled={loading}
              >
                Cancel
              </button>
              <button 
                className="modal-btn modal-btn-save" 
                onClick={handleSave}
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
