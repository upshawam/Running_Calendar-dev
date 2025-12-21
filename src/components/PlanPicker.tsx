import React from "react";
import { useState, useRef, useEffect } from "react";
import { PlanSummary } from "types/app";
import "./PlanAndDate.css";

interface Props {
  availablePlans: PlanSummary[];
  selectedPlan: PlanSummary;
  planChangeHandler: (p: PlanSummary) => void;
}

const PlanPicker = ({
  availablePlans,
  selectedPlan,
  planChangeHandler,
}: Props) => {
  const [openDropdowns, setOpenDropdowns] = useState<{ [key: string]: boolean }>({});
  const [menuPositions, setMenuPositions] = useState<{ [key: string]: { top: number; left: number } }>({});
  const dropdownRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const triggerRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});

  const getDistance = (type: string): number => {
    switch (type) {
      case "Base": return 0;
      case "5K": return 5;
      case "10K": return 10;
      case "15K/10M": return 15;
      case "Half Marathon": return 21.1;
      case "Marathon": return 42.2;
      case "Multiple Distances": return 50;
      default: return 100;
    }
  };

  const getMileage = (name: string): number => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes("more than 85")) return 100;
    if (lowerName.includes("up to 55")) return 55;
    const match = name.match(/(\d+)\s*(?:to\s*(\d+))?\s*miles?/i);
    if (match) {
      return parseInt(match[2] || match[1]);
    }
    if (lowerName.includes("novice") || lowerName.includes("beginner") || lowerName.includes("couch")) {
      return 10;
    }
    if (lowerName.includes("intermediate")) {
      return 30;
    }
    if (lowerName.includes("advanced")) {
      return 50;
    }
    return 20;
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      let isInside = false;
      Object.values(dropdownRefs.current).forEach((ref) => {
        if (ref && ref.contains(target)) {
          isInside = true;
        }
      });
      if (!isInside) {
        setOpenDropdowns({});
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCustomSelect = (plan: PlanSummary, categoryLabel: string) => {
    planChangeHandler(plan);
    setOpenDropdowns({ ...openDropdowns, [categoryLabel]: false });
  };

  const toggleDropdown = (categoryLabel: string) => {
    // Ensure only one dropdown is open at a time
    const isOpen = !!openDropdowns[categoryLabel];
    
    if (!isOpen) {
      // Opening: calculate position
      const trigger = triggerRefs.current[categoryLabel];
      if (trigger) {
        const rect = trigger.getBoundingClientRect();
        setMenuPositions({
          [categoryLabel]: {
            top: rect.bottom + window.scrollY,
            left: rect.left + window.scrollX,
          }
        });
      }
      setOpenDropdowns({ [categoryLabel]: true });
    } else {
      // Closing
      setOpenDropdowns({});
    }
  };

  const categories = [
    { label: "5K/10K Plans", types: ["5K", "10K", "15K/10M", "Base", "Multiple Distances"] },
    { label: "Half Marathon Plans", types: ["Half Marathon"] },
    { label: "Marathon Plans", types: ["Marathon"] },
  ];

  return (
    <div className="plan-picker-container">
      {categories.map((category) => {
        const categoryPlans = availablePlans
          .filter((p) => category.types.includes(p.type))
          .filter((p) => p.id !== "none");
        const groupedPlans = categoryPlans.reduce((groups, plan) => {
          const groupKey = plan.subcategory ? `${plan.coach} - ${plan.subcategory}` : plan.coach;
          if (!groups[groupKey]) groups[groupKey] = [];
          groups[groupKey].push(plan);
          return groups;
        }, {} as Record<string, PlanSummary[]>);

        const isOpen = openDropdowns[category.label] || false;
        const selectedInCategory = categoryPlans.find((p) => p.id === selectedPlan.id);
        const displayText = selectedInCategory ? selectedInCategory.name : category.label;

        return (
          <div
            key={category.label}
            className="custom-dropdown"
            ref={(el) => {
              if (el) dropdownRefs.current[category.label] = el;
            }}
          >
            <button
              ref={(el) => {
                if (el) triggerRefs.current[category.label] = el;
              }}
              className="dropdown-trigger"
              onClick={() => toggleDropdown(category.label)}
              aria-expanded={isOpen}
            >
              <span className="dropdown-text">{displayText}</span>
              <span className={`dropdown-arrow ${isOpen ? "open" : ""}`}>▼</span>
            </button>

            {isOpen && (
              <div 
                className="dropdown-menu"
                style={{
                  top: menuPositions[category.label]?.top || 0,
                  left: menuPositions[category.label]?.left || 0,
                } as React.CSSProperties}
              >
                {Object.keys(groupedPlans)
                  .sort((a, b) => {
                    const minDistA = Math.min(...groupedPlans[a].map((p) => getDistance(p.type)));
                    const minDistB = Math.min(...groupedPlans[b].map((p) => getDistance(p.type)));
                    return minDistA - minDistB;
                  })
                  .map((group) => (
                    <div key={group} className="dropdown-group">
                      <div className="group-header">{group}</div>
                      {groupedPlans[group]
                        .sort((a, b) => {
                          const mileageA = getMileage(a.name);
                          const mileageB = getMileage(b.name);
                          if (mileageA !== mileageB) return mileageA - mileageB;
                          const distA = getDistance(a.type);
                          const distB = getDistance(b.type);
                          if (distA !== distB) return distA - distB;
                          return a.name.localeCompare(b.name);
                        })
                        .map((plan) => (
                          <button
                            key={plan.id}
                            className={`dropdown-option ${selectedPlan.id === plan.id ? "selected" : ""}`}
                            onClick={() => handleCustomSelect(plan, category.label)}
                          >
                            {plan.name}
                          </button>
                        ))}
                    </div>
                  ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default PlanPicker;
