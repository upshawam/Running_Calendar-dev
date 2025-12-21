import PlanPicker from "./PlanPicker";
import { PlanSummary } from "types/app";
import "./PlanAndDate.css";

interface Props {
  availablePlans: PlanSummary[];
  selectedPlan: PlanSummary;
  selectedPlanChangeHandler: (p: PlanSummary) => void;
}

const PlanAndDate = ({
  selectedPlan,
  selectedPlanChangeHandler,
  availablePlans,
}: Props) => {
  return (
    <div className="plan-and-date">
      <PlanPicker
        availablePlans={availablePlans}
        selectedPlan={selectedPlan}
        planChangeHandler={selectedPlanChangeHandler}
      />
    </div>
  );
};

export default PlanAndDate;
