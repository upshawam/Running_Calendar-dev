import React from "react";
import { ModifiedWeekPlan } from "../data/modifiedPlans";
import "../components/ModifiedPlanPopout.css";

interface ModifiedPlanPopoutProps {
  weekPlan: ModifiedWeekPlan;
  onClose: () => void;
}

export const ModifiedPlanPopout: React.FC<ModifiedPlanPopoutProps> = ({
  weekPlan,
  onClose,
}) => {
  return (
    <div className="modified-plan-overlay" onClick={onClose}>
      <div
        className="modified-plan-popout"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modified-plan-header">
          <h3>Modified Week {weekPlan.weekNumber}</h3>
          <button className="close-button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="modified-plan-info">
          <div className="info-row">
            <strong>Dates:</strong> {weekPlan.dateRange}
          </div>
          <div className="info-row">
            <strong>Total:</strong> {weekPlan.totalMiles}
          </div>
          <div className="info-row">
            <strong>Focus:</strong> {weekPlan.description}
          </div>
        </div>

        <div className="modified-plan-workouts">
          {weekPlan.workouts.map((workout, index) => (
            <div key={index} className="workout-row">
              <div className="workout-date">
                <strong>{workout.date}</strong>
                <span className="workout-day">{workout.day}</span>
              </div>
              <div className="workout-details">{workout.workout}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
