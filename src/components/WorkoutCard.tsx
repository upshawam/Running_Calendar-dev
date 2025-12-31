import React, { useState, useEffect } from "react";
import { render } from "../ch/rendering";
import { Dateline } from "./Dateline";
import { useDrag, DragSourceMonitor } from "react-dnd";
import { ItemTypes } from "../ch/ItemTypes";
import { DragHandle } from "./DragHandle";
import { DayDetails, Units } from "types/app";
import { WorkoutLogModal } from "./WorkoutLogModal";
import { fetchWorkoutLog } from "../lib/workoutLogService";
import { WorkoutLog } from "../lib/supabaseClient";

interface Props {
  dayDetails: DayDetails;
  date: Date;
  units: Units;
  swap: (d1: Date, d2: Date) => void;
  paceData?: any;
  isCurrentWeek?: boolean;
  userId: 'aaron' | 'kristin';
}

function renderDesc(
  dayDetails: DayDetails,
  from: Units,
  to: Units,
): React.ReactElement {
  let [title, desc] = render(dayDetails, from, to);
  // Only render the description if it differs from the title
  // In the ical file we always render both and we automatically render the description using the same text as title if description is empty
  desc = title.replace(/\s/g, "") === desc.replace(/\s/g, "") ? "" : desc;
  return (
    <>
      <p>
        <span className="workout-title">{title}</span>
      </p>
      {desc && 
        <p>
          <span className="workout-description">{desc}</span>
        </p>
      }
    </>
  );
}

function matchPaceType(title: string, paceData: any): string | null {
  if (!title || !paceData) return null;
  const titleLower = title.toLowerCase();
  
  const paceTypes = [
    { label: "Recovery", synonyms: ["recovery"] },
    { label: "Gen-aerobic", synonyms: ["gen-aerobic", "general aerobic", "aerobic"] },
    { label: "Long/Medium", synonyms: ["long/medium", "long/medium long", "long run", "medium long", "med-long"] },
    { label: "Marathon", synonyms: ["marathon"] },
    { label: "LT", synonyms: ["lt", "lactate threshold", "threshold"] },
    { label: "VO2max", synonyms: ["vo2max", "vo2 max"] },
  ];
  
  for (const paceType of paceTypes) {
    if (paceType.synonyms.some(syn => titleLower.includes(syn))) {
      const foundKey = Object.keys(paceData).find(k =>
        paceType.synonyms.some(syn => k.toLowerCase().includes(syn))
      );
      if (foundKey && paceData[foundKey].pace_range) {
        return paceData[foundKey].pace_range;
      }
    }
  }
  return null;
}

export const WorkoutCard = ({ dayDetails, date, units, paceData, isCurrentWeek, userId }: Props) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [workoutLog, setWorkoutLog] = useState<WorkoutLog | null>(null);

  // Format date as ISO string for database
  const dateStr = date.toISOString().split('T')[0];

  // Load workout log data
  useEffect(() => {
    if (userId) {
      fetchWorkoutLog(userId, dateStr).then(setWorkoutLog);
    }
  }, [userId, dateStr]);

  // Reload log data after modal saves
  const handleLogSaved = () => {
    fetchWorkoutLog(userId, dateStr).then(setWorkoutLog);
  };

  const [{ isDragging }, drag, preview] = useDrag({
    type: ItemTypes.DAY,
    item: { date: date, dayDetails: dayDetails, units: units },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
      canDrag: dayDetails !== undefined,
    }),
    end: (item: { date: Date } | undefined, monitor: DragSourceMonitor) => {
      const dropResult = monitor.getDropResult();
      if (item && dropResult) {
      }
    },
  });

  const paceInfo = isCurrentWeek ? matchPaceType(dayDetails.title, paceData) : null;

  // Get plan workout title for the modal
  const [title] = render(dayDetails, dayDetails.sourceUnits, units);

  // Handle click to open modal
  const handleCardClick = (e: React.MouseEvent) => {
    // Don't open modal if clicking the drag handle
    if ((e.target as HTMLElement).closest('.drag-handle')) {
      return;
    }
    setIsModalOpen(true);
  };
  
  return (
    <>
      <div 
        ref={preview} 
        className={`workout-card ${isDragging ? "dragging" : ""} ${workoutLog?.completed ? "completed" : ""}`}
        style={{ display: 'flex', flexDirection: 'column', cursor: 'pointer', minWidth: 0, width: '100%' }}
        onClick={handleCardClick}
      >
        <Dateline $date={date} />
        {workoutLog?.completed && (
          <div style={{
            position: 'absolute',
            top: '0.5rem',
            right: '0.5rem',
            fontSize: '1.2rem',
          }}>✓</div>
        )}
        <div className="workout-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div ref={drag} className="drag-handle">
            <DragHandle viewBox="0 0 32 36" />
          </div>
          <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
            {renderDesc(dayDetails, dayDetails.sourceUnits, units)}
          </div>
          {paceInfo && (
            <div style={{ 
              textAlign: 'center',
              fontSize: '0.75rem', 
              color: '#666', 
              fontStyle: 'italic',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              paddingTop: '0.25rem',
              borderTop: '1px solid #eee',
              marginTop: '0.25rem',
              maxWidth: '100%',
              minWidth: 0,
            }}>{paceInfo}</div>
          )}
          {workoutLog?.actual_pace && (
            <div style={{
              textAlign: 'center',
              fontSize: '0.75rem',
              color: '#28a745',
              fontWeight: 600,
              marginTop: '0.25rem',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '100%',
              minWidth: 0,
            }}>
              Actual: {workoutLog.actual_pace}
            </div>
          )}
          {workoutLog?.notes && (
            <div style={{
              fontSize: '0.7rem',
              color: '#666',
              fontStyle: 'italic',
              marginTop: '0.25rem',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '100%',
              minWidth: 0,
            }}>
              💬 {workoutLog.notes}
            </div>
          )}
        </div>
      </div>

      <WorkoutLogModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        userId={userId}
        date={dateStr}
        planWorkout={title}
        onSave={handleLogSaved}
      />
    </>
  );
};
