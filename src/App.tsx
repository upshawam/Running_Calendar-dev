import React, { useState } from "react";
import { repo } from "./ch/planrepo";
import { endOfWeek, addWeeks, isAfter } from "date-fns";
import { RacePlan } from "./ch/dategrid";
import { build, swap, swapDow } from "./ch/planbuilder";
import { CalendarGrid } from "./components/CalendarGrid";
import { toIcal } from "./ch/icalservice";
import { toCsv } from "./ch/csvService";
import { download } from "./ch/downloadservice";
import PlanAndDate from "./components/PlanAndDate";
import UndoButton from "./components/UndoButton";
import PacesPanel from "./components/PacesPanel";
import history from "./defy/history";
import { supabaseConfigured } from "./lib/supabaseClient";
import {
  useQueryParams,
  StringParam,
  DateParam,
  NumberParam,
} from "use-query-params";
import { PlanDetailsCard } from "./components/PlanDetailsCard";
import { WeekStartsOn, WeekStartsOnValues } from "./ch/datecalc";
import { useMountEffect } from "./ch/hooks";
import { Units, PlanSummary, dayOfWeek } from "types/app";
import { getLocaleUnits } from "./ch/localize";

const STORAGE_KEY = "rc_plan_selection";

const persistSelection = (plan: PlanSummary, date: Date, units: Units) => {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ planId: plan.id, date: date.toISOString(), units }),
    );
  } catch (_) {
    /* ignore storage issues */
  }
};

const loadSelection = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as {
      planId?: string;
      date?: string;
      units?: Units;
    };
    const plan = parsed.planId ? repo.find(parsed.planId) : undefined;
    const date = parsed.date ? new Date(parsed.date) : undefined;
    const units = parsed.units === "mi" || parsed.units === "km" ? parsed.units : undefined;
    if (plan && date && units) return { plan, date, units };
  } catch (_) {
    /* ignore parse errors */
  }
  return undefined;
};

const App = () => {
  const [{ u, p, d }, setq] = useQueryParams({
    u: StringParam,
    p: StringParam,
    d: DateParam,
    s: NumberParam,
  });
  const [selectedUnits, setSelectedUnits] = useState<Units>(
    u === "mi" || u === "km" ? u : getLocaleUnits(),
  );
  var [selectedPlan, setSelectedPlan] = useState(repo.find(p || ""));
  var [racePlan, setRacePlan] = useState<RacePlan | undefined>(undefined);
  var [undoHistory, setUndoHistory] = useState([] as RacePlan[]);
  // Always use Monday as week start
  const weekStartsOn = WeekStartsOnValues.Monday;
  var [planEndDate, setPlanEndDate] = useState(
    d && isAfter(d, new Date())
      ? d
      : addWeeks(endOfWeek(new Date(), { weekStartsOn: weekStartsOn }), 20),
  );
  var [selectedUser, setSelectedUser] = useState<"aaron" | "kristin">("aaron");
  const [showAdvanced, setShowAdvanced] = useState(false);

  useMountEffect(() => {
    // Prefer URL params; otherwise fall back to last saved selection; otherwise defaults
    const saved = loadSelection();
    const planFromUrl = p ? repo.find(p) : undefined;
    const planToLoad = planFromUrl || saved?.plan || selectedPlan;
    const dateFromUrl = d && isAfter(d, new Date()) ? d : undefined;
    const dateToLoad = dateFromUrl || saved?.date || planEndDate;
    const unitsFromUrl = u === "mi" || u === "km" ? u : undefined;
    const unitsToLoad = unitsFromUrl || saved?.units || selectedUnits;

    if (planToLoad) {
      setSelectedPlan(planToLoad);
      setPlanEndDate(dateToLoad);
      setSelectedUnits(unitsToLoad);
      initialLoad(planToLoad, dateToLoad, unitsToLoad, weekStartsOn);
    }
  });

  const [, forceUpdate] = React.useReducer((x) => x + 1, 0);
  React.useEffect(() => {
    // listen for changes to the URL and force the app to re-render
    history.listen(() => {
      forceUpdate();
    });
  }, []);

  const getParams = (
    units: Units,
    plan: PlanSummary,
    date: Date,
    weekStartsOn: WeekStartsOn,
  ) => {
    return {
      u: units,
      p: plan.id,
      d: date,
      s: weekStartsOn,
    };
  };

  const initialLoad = async (
    plan: PlanSummary,
    endDate: Date,
    units: Units,
    weekStartsOn: WeekStartsOn,
  ) => {
    const racePlan = build(await repo.fetch(plan), endDate, weekStartsOn);
    setRacePlan(racePlan);
    setUndoHistory([...undoHistory, racePlan]);
    setq(getParams(units, plan, endDate, weekStartsOn));
  };

  const onSelectedPlanChange = async (plan: PlanSummary) => {
    const racePlan = build(await repo.fetch(plan), planEndDate, weekStartsOn);
    setSelectedPlan(plan);
    setRacePlan(racePlan);
    setUndoHistory([racePlan]);
    setq(getParams(selectedUnits, plan, planEndDate, weekStartsOn));
    persistSelection(plan, planEndDate, selectedUnits);
  };

  const onSelectedEndDateChange = async (date: Date) => {
    const racePlan = build(await repo.fetch(selectedPlan), date, weekStartsOn);
    setPlanEndDate(date);
    setRacePlan(racePlan);
    setUndoHistory([racePlan]);
    setq(getParams(selectedUnits, selectedPlan, date, weekStartsOn));
    persistSelection(selectedPlan, date, selectedUnits);
  };

  const onSelectedUnitsChanged = (u: Units) => {
    setSelectedUnits(u);
    setq(getParams(u, selectedPlan, planEndDate, weekStartsOn));
    persistSelection(selectedPlan, planEndDate, u);
  };

  function swapDates(d1: Date, d2: Date): void {
    if (racePlan) {
      const newRacePlan = swap(racePlan, d1, d2);
      setRacePlan(newRacePlan);
      setUndoHistory([...undoHistory, newRacePlan]);
    }
  }

  function doSwapDow(dow1: dayOfWeek, dow2: dayOfWeek) {
    if (racePlan) {
      const newRacePlan = swapDow(racePlan, dow1, dow2);
      setRacePlan(newRacePlan);
      setUndoHistory([...undoHistory, newRacePlan]);
    }
  }

  function downloadIcalHandler() {
    if (racePlan) {
      const eventsStr = toIcal(racePlan, selectedUnits);
      if (eventsStr) {
        download(eventsStr, "plan", "ics");
      }
    }
  }

  function downloadCsvHandler() {
    if (racePlan) {
      const eventsStr = toCsv(racePlan, selectedUnits, weekStartsOn);
      if (eventsStr) {
        download(eventsStr, "plan", "csv");
      }
    }
  }

  function undoHandler() {
    if (undoHistory?.length >= 0) {
      undoHistory.pop();
    }
    setRacePlan(undoHistory[undoHistory.length - 1]);
  }

  return (
    <>
      {!supabaseConfigured && (
        <div
          style={{
            background: "#fff3cd",
            color: "#664d03",
            border: "1px solid #ffeeba",
            padding: "0.75rem 1rem",
            margin: "0.5rem",
            borderRadius: "6px",
            fontSize: "0.9rem",
          }}
        >
          Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your env (e.g., .env.local) and restart the dev server.
        </div>
      )}
      <PacesPanel selectedUser={selectedUser} onUserChange={setSelectedUser} />
      <PlanAndDate
        availablePlans={repo.available}
        selectedPlan={selectedPlan}
        selectedPlanChangeHandler={onSelectedPlanChange}
        planEndDate={planEndDate}
        onPlanEndDateChange={onSelectedEndDateChange}
      />
      
      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        style={{
          margin: "0.5rem",
          padding: "0.5rem 1rem",
          backgroundColor: showAdvanced ? "var(--secondary-color)" : "transparent",
          color: "var(--text-color)",
          border: "2px solid var(--secondary-color)",
          borderRadius: "0.25rem",
          cursor: "pointer",
          fontSize: "0.9rem",
          fontWeight: "bold",
          transition: "all 0.2s"
        }}
      >
        {showAdvanced ? "Hide Advanced" : "Show Advanced"}
      </button>

      {showAdvanced && (
        <>
          <div className="controls-row">
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <h3 style={{ margin: 0, whiteSpace: 'nowrap' }}>Units:</h3>
              <button
                onClick={() => onSelectedUnitsChanged('mi')}
                style={{
                  padding: '0.4rem 0.8rem',
                  backgroundColor: selectedUnits === 'mi' ? 'var(--secondary-color)' : 'transparent',
                  color: 'var(--text-color)',
                  border: '2px solid var(--secondary-color)',
                  borderRadius: '0.25rem',
                  cursor: 'pointer',
                  fontWeight: selectedUnits === 'mi' ? 'bold' : 'normal',
                  transition: 'all 0.2s'
                }}
              >
                mi
              </button>
              <button
                onClick={() => onSelectedUnitsChanged('km')}
                style={{
                  padding: '0.4rem 0.8rem',
                  backgroundColor: selectedUnits === 'km' ? 'var(--secondary-color)' : 'transparent',
                  color: 'var(--text-color)',
                  border: '2px solid var(--secondary-color)',
                  borderRadius: '0.25rem',
                  cursor: 'pointer',
                  fontWeight: selectedUnits === 'km' ? 'bold' : 'normal',
                  transition: 'all 0.2s'
                }}
              >
                km
              </button>
            </div>
          </div>
          <PlanDetailsCard racePlan={racePlan} />
          <div className="second-toolbar">
            <button className="app-button" onClick={downloadIcalHandler}>Download iCal</button>
            <button className="app-button" onClick={downloadCsvHandler}>Download CSV</button>
            <UndoButton
              disabled={undoHistory.length <= 1}
              undoHandler={undoHandler}
            />
          </div>
        </>
      )}
      <div className="main-ui">
        {racePlan && (
          <CalendarGrid
            racePlan={racePlan}
            units={selectedUnits}
            weekStartsOn={weekStartsOn}
            swapDates={swapDates}
            swapDow={doSwapDow}
            selectedUser={selectedUser}
          />
        )}
      </div>
    </>
  );
};

export default App;
