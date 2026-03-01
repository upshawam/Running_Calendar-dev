// Modified training plan variants for specific users and weeks
// These are alternative workout schedules due to illness, injury, or other disruptions

export interface ModifiedWeekPlan {
  weekNumber: number;
  dateRange: string;
  description: string;
  totalMiles: string;
  workouts: {
    date: string;
    day: string;
    workout: string;
  }[];
}

export interface UserModifiedPlan {
  userId: "aaron" | "kristin";
  planId: string;
  weeks: ModifiedWeekPlan[];
}

// Aaron's modified Pfitzinger 18/55 plan (weeks 13-19)
// Due to illness and injury, following adjusted schedule
export const aaronPfitz1855Modified: UserModifiedPlan = {
  userId: "aaron",
  planId: "pfitz_18_55_4th",
  weeks: [
    {
      weekNumber: 13,
      dateRange: "3/2 to 3/8",
      description: "Return to structure + controlled HM",
      totalMiles: "~42–48 miles",
      workouts: [
        {
          date: "3/2",
          day: "Mon",
          workout: "Gen Aerobic 8–9 mi (keep easy, confirm HR stability)",
        },
        {
          date: "3/3",
          day: "Tue",
          workout: "LT 7–8 mi w/ 20–25 min at LT (first threshold back)",
        },
        {
          date: "3/4",
          day: "Wed",
          workout: "Rest or cross-train",
        },
        {
          date: "3/5",
          day: "Thu",
          workout: "Recovery + strides 4–5 mi w/ 6×100m",
        },
        {
          date: "3/6",
          day: "Fri",
          workout: "Easy 3–4 mi (shakeout only)",
        },
        {
          date: "3/7",
          day: "Sat",
          workout:
            "Half Marathon Tune-Up (10–13 mi total)\nRun as progression:\n- Miles 1–3 easy\n- Miles 4–10 at Marathon Pace\n- Last 3 miles only if HR stable → HM effort",
        },
        {
          date: "3/8",
          day: "Sun",
          workout: "Long Run 12–14 mi (easy; shortened due to HM)",
        },
      ],
    },
    {
      weekNumber: 14,
      dateRange: "3/9 to 3/15",
      description: "Full LT return + aerobic rebuild",
      totalMiles: "~45–52 miles",
      workouts: [
        {
          date: "3/9",
          day: "Mon",
          workout: "Recovery 6–7 mi",
        },
        {
          date: "3/10",
          day: "Tue",
          workout: "LT 9–10 mi w/ 35–40 min at LT pace",
        },
        {
          date: "3/11",
          day: "Wed",
          workout: "Rest or cross-train",
        },
        {
          date: "3/12",
          day: "Thu",
          workout: "Medium-long run 11–12 mi",
        },
        {
          date: "3/13",
          day: "Fri",
          workout: "Recovery 5–6 mi",
        },
        {
          date: "3/14",
          day: "Sat",
          workout: "Long Run 16–17 mi (easy; no MP yet)",
        },
        {
          date: "3/15",
          day: "Sun",
          workout: "Rest or cross-train",
        },
      ],
    },
    {
      weekNumber: 15,
      dateRange: "3/16 to 3/22",
      description: "Key Marathon-Pace Long Run",
      totalMiles: "~48–55 miles",
      workouts: [
        {
          date: "3/16",
          day: "Mon",
          workout: "Gen Aerobic 9–10 mi",
        },
        {
          date: "3/17",
          day: "Tue",
          workout: "Steady-State 8–9 mi w/ 20–25 min at steady/upper aerobic",
        },
        {
          date: "3/18",
          day: "Wed",
          workout: "Rest or cross-train",
        },
        {
          date: "3/19",
          day: "Thu",
          workout: "Recovery + strides 4–5 mi w/ 6×100m",
        },
        {
          date: "3/20",
          day: "Fri",
          workout: "Easy 4–5 mi (no tune-up race)",
        },
        {
          date: "3/21",
          day: "Sat",
          workout:
            "Marathon-Pace Long Run 17–18 mi w/ 12–14 mi at MP\n(This replaces the missed MP long runs)",
        },
        {
          date: "3/22",
          day: "Sun",
          workout: "Rest or cross-train",
        },
      ],
    },
    {
      weekNumber: 16,
      dateRange: "3/23 to 3/29",
      description: "Peak long run + final LT",
      totalMiles: "~48–54 miles",
      workouts: [
        {
          date: "3/23",
          day: "Mon",
          workout: "Recovery + strides 6–7 mi w/ 6×100m",
        },
        {
          date: "3/24",
          day: "Tue",
          workout: "LT 9–10 mi w/ 25–30 min at LT (shorter than Week 14)",
        },
        {
          date: "3/25",
          day: "Wed",
          workout: "Rest or cross-train",
        },
        {
          date: "3/26",
          day: "Thu",
          workout: "Medium-long run 11–12 mi",
        },
        {
          date: "3/27",
          day: "Fri",
          workout: "Recovery 4–5 mi",
        },
        {
          date: "3/28",
          day: "Sat",
          workout: "Peak Long Run 19–21 mi (easy; optional super shoes)",
        },
        {
          date: "3/29",
          day: "Sun",
          workout: "Rest or cross-train",
        },
      ],
    },
    {
      weekNumber: 17,
      dateRange: "3/30 to 4/5",
      description: "Start taper + light sharpening",
      totalMiles: "~40–46 miles",
      workouts: [
        {
          date: "3/30",
          day: "Mon",
          workout: "Gen Aerobic + strides 7–8 mi w/ 6×10s hills + 6×100m",
        },
        {
          date: "3/31",
          day: "Tue",
          workout: "Recovery 5–6 mi",
        },
        {
          date: "4/1",
          day: "Wed",
          workout: "Rest or cross-train",
        },
        {
          date: "4/2",
          day: "Thu",
          workout: "Recovery + strides 4–5 mi w/ 6×100m",
        },
        {
          date: "4/3",
          day: "Fri",
          workout: "Easy 6–7 mi (no tune-up race)",
        },
        {
          date: "4/4",
          day: "Sat",
          workout: "Long Run 14–15 mi (reduced from 16–17)",
        },
        {
          date: "4/5",
          day: "Sun",
          workout: "Rest or cross-train",
        },
      ],
    },
    {
      weekNumber: 18,
      dateRange: "4/6 to 4/12",
      description: "Taper sharpening",
      totalMiles: "~30–34 miles",
      workouts: [
        {
          date: "4/6",
          day: "Mon",
          workout: "Recovery + strides 6–7 mi w/ 8×100m",
        },
        {
          date: "4/7",
          day: "Tue",
          workout: "Steady 7–8 mi w/ 10–15 min at MP (no VO₂)",
        },
        {
          date: "4/8",
          day: "Wed",
          workout: "Rest or cross-train",
        },
        {
          date: "4/9",
          day: "Thu",
          workout: "Recovery + strides 5–6 mi w/ 6×100m",
        },
        {
          date: "4/10",
          day: "Fri",
          workout: "Rest",
        },
        {
          date: "4/11",
          day: "Sat",
          workout: "Medium-long run 10–11 mi (easy)",
        },
        {
          date: "4/12",
          day: "Sun",
          workout: "Rest",
        },
      ],
    },
    {
      weekNumber: 19,
      dateRange: "4/13 to 4/18",
      description: "Race week",
      totalMiles: "~32–36 miles",
      workouts: [
        {
          date: "4/13",
          day: "Mon",
          workout: "Recovery 5–6 mi",
        },
        {
          date: "4/14",
          day: "Tue",
          workout: "Dress rehearsal 5–6 mi w/ 2 mi at MP",
        },
        {
          date: "4/15",
          day: "Wed",
          workout: "Rest",
        },
        {
          date: "4/16",
          day: "Thu",
          workout: "Recovery + strides 4–5 mi w/ 6×100m",
        },
        {
          date: "4/17",
          day: "Fri",
          workout: "Recovery 2–3 mi",
        },
        {
          date: "4/18",
          day: "Sat",
          workout: "Goal Marathon",
        },
      ],
    },
  ],
};

// Export all modified plans
export const modifiedPlans: UserModifiedPlan[] = [aaronPfitz1855Modified];

// Helper function to get modified plan for a specific user and plan
export function getModifiedPlan(
  userId: "aaron" | "kristin",
  planId: string,
): UserModifiedPlan | undefined {
  return modifiedPlans.find((p) => p.userId === userId && p.planId === planId);
}

// Helper function to check if a specific week has a modified plan
export function hasModifiedWeek(
  userId: "aaron" | "kristin",
  planId: string,
  weekNumber: number,
): boolean {
  const plan = getModifiedPlan(userId, planId);
  return plan?.weeks.some((w) => w.weekNumber === weekNumber) ?? false;
}

// Helper function to get a specific modified week
export function getModifiedWeek(
  userId: "aaron" | "kristin",
  planId: string,
  weekNumber: number,
): ModifiedWeekPlan | undefined {
  const plan = getModifiedPlan(userId, planId);
  return plan?.weeks.find((w) => w.weekNumber === weekNumber);
}
