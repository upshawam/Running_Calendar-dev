import PlanPicker from "./PlanPicker";
import { PlanSummary } from "types/app";
import "./PlanAndDate.css";

interface Props {
  availablePlans: PlanSummary[];
  selectedPlan: PlanSummary;
  selectedPlanChangeHandler: (p: PlanSummary) => void;
  planEndDate: Date;
  onPlanEndDateChange: (date: Date) => void;
}

const PlanAndDate = ({
  selectedPlan,
  selectedPlanChangeHandler,
  availablePlans,
  planEndDate,
  onPlanEndDateChange,
}: Props) => {
  return (
    <div className="plan-and-date">
      <PlanPicker
        availablePlans={availablePlans}
        selectedPlan={selectedPlan}
        planChangeHandler={selectedPlanChangeHandler}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <h3 style={{ margin: 0, whiteSpace: 'nowrap' }}>Race date:</h3>
        <input
          type="date"
          value={planEndDate.toISOString().split('T')[0]}
          onChange={(e) => {
            const [year, month, day] = e.target.value.split('-').map(Number);
            const date = new Date(year, month - 1, day);
            onPlanEndDateChange(date);
          }}
          style={{
            padding: '0.4rem 0.6rem',
            fontSize: 'inherit',
            fontFamily: 'inherit',
            border: '1px solid var(--secondary-color)',
            borderRadius: '0.25rem',
            backgroundColor: 'var(--card-color)',
            color: 'var(--text-color)',
          }}
        />
      </div>
    </div>
  );
};

export default PlanAndDate;
