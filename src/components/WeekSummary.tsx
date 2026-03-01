import React, { useState } from "react";
import { renderDist, getWeekDistance } from "../ch/rendering";
import StartIcon from "../svg/icons02/start.svg";
import FinishIcon from "../svg/icons02/finish.svg";
import HighMileageIcon from "../svg/highMileage.svg";
import { RacePlan } from "../ch/dategrid";
import { Week, DayDetails, Units } from "types/app";
import { hasModifiedWeek, getModifiedWeek } from "../data/modifiedPlans";
import { ModifiedPlanPopout } from "./ModifiedPlanPopout";

interface Props {
  desc: string;
  week: Week<DayDetails>;
  units: Units;
  racePlan: RacePlan;
  isFirstWeek: boolean;
  isLastWeek: boolean;
  isHighestMileage: boolean;
  selectedUser: "aaron" | "kristin";
  planId: string;
  // removed isCurrentWeek
}

export const WeekSummary = ({
  week,
  units,
  isFirstWeek,
  isLastWeek,
  isHighestMileage,
  selectedUser,
  planId,
}: Props) => {
  const distance = getWeekDistance(week, units);
  const [showModifiedPlan, setShowModifiedPlan] = useState(false);
  
  // Check if this week has a modified plan for this user
  const hasModified = hasModifiedWeek(selectedUser, planId, week.weekNum);
  const modifiedWeek = hasModified ? getModifiedWeek(selectedUser, planId, week.weekNum) : undefined;
  
  const handleModifiedClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowModifiedPlan(true);
  };
  
  return (
    <>
      <div className="week-summary" key={"week:" + week.weekNum}>
        <p>
          <strong>{`Week ${week.weekNum}`}</strong>
          {hasModified && (
            <>
              {" "}
              <a
                href="#"
                onClick={handleModifiedClick}
                style={{
                  fontSize: "0.85rem",
                  color: "#4a90e2",
                  textDecoration: "none",
                  fontWeight: "normal",
                }}
              >
                modified
              </a>
            </>
          )}
        </p>
        {distance[0] > 0 && <p>{renderDist(distance, units, units)}</p>}
        {isFirstWeek && <img src={StartIcon} alt={"Start"} />}
        {isLastWeek && <img src={FinishIcon} alt="Finish" />}
        {isHighestMileage && <img src={HighMileageIcon} alt="Highest Mileage" />}
        {isHighestMileage && (
          <p>
            <small>Highest Mileage</small>
          </p>
        )}
      </div>
      {showModifiedPlan && modifiedWeek && (
        <ModifiedPlanPopout
          weekPlan={modifiedWeek}
          onClose={() => setShowModifiedPlan(false)}
        />
      )}
    </>
  );
};
