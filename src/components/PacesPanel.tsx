import React, { useState, useEffect } from "react";
import "./PacesPanel.css";

interface PaceData {
  pace_range: string;
  vo2_percent: string;
}

interface PacesHistory {
  date: string;
  paces: PaceData;
}

interface PacesPanelProps {
  className?: string;
  selectedUser: "aaron" | "kristin";
  onUserChange: (user: "aaron" | "kristin") => void;
}

const PacesPanel: React.FC<PacesPanelProps> = ({ className = "", selectedUser, onUserChange }) => {
  const [pacesData, setPacesData] = useState<PaceData | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isHidden, setIsHidden] = useState(true);
  const [pacesHistory, setPacesHistory] = useState<PacesHistory[]>([]);
  const [trendModal, setTrendModal] = useState<{ show: boolean; details: string }>({ show: false, details: '' });

  useEffect(() => {
    loadPacesData(selectedUser);
  }, [selectedUser]);

  // Helper to parse pace string "6:46/mi" to total seconds
  const paceToSeconds = (paceStr: string): number | null => {
    // Remove any ellipsis or extra characters
    const cleaned = paceStr.replace(/[…\s]/g, '').trim();
    const match = cleaned.match(/(\d+):(\d+)/);
    if (!match) return null;
    const [_, mins, secs] = match;
    return parseInt(mins) * 60 + parseInt(secs);
  };

  // Get midpoint of pace range "6:46/mi - 6:54/mi", or return the single pace if only one exists
  const getMidpointSeconds = (paceRange: string): number | null => {
    const parts = paceRange.split('-').map(s => s.trim());
    
    // If only one pace, or second part is just ellipsis (like Recovery), use the first one
    if (parts.length === 1 || (parts.length === 2 && (parts[1] === '…' || parts[1] === ''))) {
      return paceToSeconds(parts[0]);
    }
    
    // If range with both values, calculate midpoint
    if (parts.length === 2) {
      const start = paceToSeconds(parts[0]);
      const end = paceToSeconds(parts[1]);
      
      if (start === null || end === null) return null;
      return (start + end) / 2;
    }
    
    return null;
  };

  // Calculate trend for a pace category
  const calculateTrend = (categoryName: string): { arrow: string; change: number; details: string } | null => {
    if (pacesHistory.length < 2) return null;

    // Get most recent entry
    const recent = pacesHistory[pacesHistory.length - 1];
    const recentDate = new Date(recent.date);

    // Find entry from ~7 days ago (look for closest match within 5-9 days back)
    let weekAgo = null;
    let weekAgoIndex = -1;
    for (let i = pacesHistory.length - 2; i >= 0; i--) {
      const entryDate = new Date(pacesHistory[i].date);
      const daysDiff = (recentDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysDiff >= 5 && daysDiff <= 9) {
        weekAgo = pacesHistory[i];
        weekAgoIndex = i;
        break;
      }
    }

    // If no week-old entry found, try to get one from 2+ weeks ago as fallback
    if (!weekAgo && pacesHistory.length >= 3) {
      weekAgoIndex = Math.max(0, pacesHistory.length - 8);
      weekAgo = pacesHistory[weekAgoIndex];
    }

    if (!weekAgo) return null;

    const recentPace = (recent.paces as any)[categoryName]?.pace_range;
    const weekAgoPace = (weekAgo.paces as any)[categoryName]?.pace_range;

    if (!recentPace || !weekAgoPace) return null;

    const recentMid = getMidpointSeconds(recentPace);
    const weekAgoMid = getMidpointSeconds(weekAgoPace);

    if (recentMid === null || weekAgoMid === null) return null;

    const change = recentMid - weekAgoMid; // negative = faster (improvement)
    
    // Format dates for display
    const recentDateStr = new Date(recent.date).toLocaleDateString();
    const weekAgoDateStr = new Date(weekAgo.date).toLocaleDateString();
    
    // Calculate days between
    const daysBetween = Math.round((recentDate.getTime() - new Date(weekAgo.date).getTime()) / (1000 * 60 * 60 * 24));
    
    // Format pace change
    const changeAbs = Math.abs(change);
    const changeMins = Math.floor(changeAbs / 60);
    const changeSecs = Math.round(changeAbs % 60);
    const changeStr = changeMins > 0 ? `${changeMins}:${changeSecs.toString().padStart(2, '0')}` : `${changeSecs}s`;

    let details = `Comparing ${recentDateStr} to ${weekAgoDateStr} (${daysBetween} days ago)\n`;
    details += `Current: ${recentPace}\n`;
    details += `Previous: ${weekAgoPace}\n`;
    
    if (Math.abs(change) < 1) {
      details += `Change: ~${changeStr}/mi (no significant change)`;
      return { arrow: '➖', change: 0, details };
    }
    
    if (change < 0) {
      details += `Improvement: ${changeStr}/mi faster! 🎉`;
      return { arrow: '✅', change: changeAbs, details };
    }
    
    details += `Change: ${changeStr}/mi slower`;
    return { arrow: '⚠️', change: changeAbs, details };
  };

  const loadPacesData = async (user: "aaron" | "kristin") => {
    setLoading(true);
    setError(null);

    try {
      // Add cache-busting query param to ensure fresh data
      const cacheBuster = new Date().getTime();
      const response = await fetch(`${import.meta.env.BASE_URL}data/${user}_paces.json?v=${cacheBuster}`);
      if (!response.ok) {
        throw new Error(`Failed to load paces for ${user}`);
      }

      const history: PacesHistory[] = await response.json();
      setPacesHistory(history);
      
      if (history.length > 0) {
        // Get the most recent paces data
        const latestData = history[history.length - 1];
        setPacesData(latestData.paces);
        setLastUpdated(latestData.date);
      } else {
        setPacesData(null);
        setLastUpdated(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load paces");
      setPacesData(null);
      setLastUpdated(null);
    } finally {
      setLoading(false);
    }
  };

  if (isHidden) {
    return (
      <div className={`paces-panel ${className}`} style={{
        backgroundColor: "var(--card-color)",
        border: "3px solid var(--secondary-color)",
        borderRadius: "0.5rem",
        padding: "0.5em 1em",
        margin: "1em 0",
        position: "sticky",
        top: "0",
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "0.75rem"
      }}>
        <h3 style={{ margin: 0, fontSize: "1.1rem" }}>Training Paces</h3>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            onClick={() => onUserChange("aaron")}
            style={{
              padding: "0.4rem 0.8rem",
              fontSize: "0.9rem",
              fontWeight: selectedUser === "aaron" ? "bold" : "normal",
              backgroundColor: selectedUser === "aaron" ? "var(--secondary-color)" : "transparent",
              color: "var(--text-color)",
              border: "2px solid var(--secondary-color)",
              borderRadius: "0.25rem",
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            Aaron
          </button>
          <button
            onClick={() => onUserChange("kristin")}
            style={{
              padding: "0.4rem 0.8rem",
              fontSize: "0.9rem",
              fontWeight: selectedUser === "kristin" ? "bold" : "normal",
              backgroundColor: selectedUser === "kristin" ? "var(--secondary-color)" : "transparent",
              color: "var(--text-color)",
              border: "2px solid var(--secondary-color)",
              borderRadius: "0.25rem",
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            Kristin
          </button>
        </div>
        <button
          onClick={() => setIsHidden(false)}
          style={{
            padding: "0.4rem 0.8rem",
            fontSize: "0.9rem",
            backgroundColor: "transparent",
            color: "var(--text-color)",
            border: "2px solid var(--secondary-color)",
            borderRadius: "0.25rem",
            cursor: "pointer",
            transition: "all 0.2s"
          }}
        >
          Show
        </button>
      </div>
    );
  }

  return (
    <div className={`paces-panel ${className}`} style={{
      backgroundColor: "var(--card-color)",
      border: "3px solid var(--secondary-color)",
      borderRadius: "0.5rem",
      padding: "1em",
      margin: "1em 0",
      position: "sticky",
      top: "0",
      zIndex: 100
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <h3 style={{ margin: 0, fontSize: "1.1rem" }}>Training Paces</h3>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              onClick={() => onUserChange("aaron")}
              style={{
                padding: "0.4rem 0.8rem",
                fontSize: "0.9rem",
                fontWeight: selectedUser === "aaron" ? "bold" : "normal",
                backgroundColor: selectedUser === "aaron" ? "var(--secondary-color)" : "transparent",
                color: "var(--text-color)",
                border: "2px solid var(--secondary-color)",
                borderRadius: "0.25rem",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
            >
              Aaron
            </button>
            <button
              onClick={() => onUserChange("kristin")}
              style={{
                padding: "0.4rem 0.8rem",
                fontSize: "0.9rem",
                fontWeight: selectedUser === "kristin" ? "bold" : "normal",
                backgroundColor: selectedUser === "kristin" ? "var(--secondary-color)" : "transparent",
                color: "var(--text-color)",
                border: "2px solid var(--secondary-color)",
                borderRadius: "0.25rem",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
            >
              Kristin
            </button>
          </div>
        </div>
        <button
          onClick={() => setIsHidden(true)}
          style={{
            padding: "0.4rem 0.8rem",
            fontSize: "0.9rem",
            backgroundColor: "transparent",
            color: "var(--text-color)",
            border: "2px solid var(--secondary-color)",
            borderRadius: "0.25rem",
            cursor: "pointer",
            transition: "all 0.2s",
            marginLeft: "auto"
          }}
        >
          Hide
        </button>
      </div>
      
      {lastUpdated && (
        <div style={{ 
          fontSize: "0.8rem", 
          color: "var(--text-color)", 
          opacity: 0.7,
          marginBottom: "0.5rem"
        }}>
          updated: {(() => {
              // Parse as UTC by appending 'Z' if not present
              const utcTimestamp = lastUpdated.endsWith('Z') ? lastUpdated : lastUpdated + 'Z';
              const date = new Date(utcTimestamp);
              const now = new Date();
              const diffMs = now.getTime() - date.getTime();
              const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
              const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
              
              if (diffHours < 1) {
                return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
              } else if (diffHours < 24) {
                return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
              } else {
                const diffDays = Math.floor(diffHours / 24);
                return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
              }
            })()}
        </div>
      )}
      
      <div style={{
        fontSize: "0.85rem",
        color: "var(--text-color)",
        opacity: 0.8,
        fontStyle: "italic",
        marginBottom: "0.5rem"
      }}>
        *Paces are added to the current week
      </div>

      {loading && (
        <div style={{ textAlign: "center", padding: "2rem" }}>
          <p>Loading paces...</p>
        </div>
      )}

      {error && (
        <div style={{
          backgroundColor: "#fee",
          border: "1px solid #fcc",
          borderRadius: "0.25rem",
          padding: "1rem",
          marginBottom: "1rem"
        }}>
          <p style={{ color: "#c33", margin: 0 }}>
            ⚠️ {error}
          </p>
        </div>
      )}

      {pacesData && !loading && (
        <>
          {/* Desktop: Horizontal row */}
          <div className="paces-table-horizontal" style={{
            background: "var(--secondary-color)",
            borderRadius: "0.5rem",
            fontFamily: "'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
            fontSize: "1em",
            margin: 0
          }}>
            {[
              { label: "Recovery", synonyms: ["recovery"] },
              { label: "Gen-aerobic", synonyms: ["gen-aerobic", "general aerobic", "aerobic"] },
              { label: "Long/Medium", synonyms: ["long/medium", "long/medium long", "long run", "medium long"] },
              { label: "Marathon", synonyms: ["marathon"] },
              { label: "LT", synonyms: ["lt", "lactate threshold", "threshold"] },
              { label: "VO2max", synonyms: ["vo2max", "vo2 max"] },
            ].map((row, i) => {
              let foundKey = Object.keys(pacesData).find(k =>
                row.synonyms.some(syn => k.toLowerCase().includes(syn))
              );
              let value = foundKey ? (pacesData as any)[foundKey].pace_range : "-";
              let trend = foundKey ? calculateTrend(foundKey) : null;
              
              return (
                <div key={i} className="pace-zone">
                  <span className="pace-zone-label">{row.label}</span>
                  <span className="pace-zone-value">
                    {value || "-"}
                    {trend && (
                      <span 
                        style={{ 
                          marginLeft: '0.5em', 
                          fontSize: '1em',
                          fontWeight: 'bold',
                          cursor: 'pointer'
                        }}
                        title={trend.details}
                        onClick={(e) => {
                          e.stopPropagation();
                          setTrendModal({ show: true, details: trend.details });
                        }}
                      >
                        {trend.arrow}
                      </span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Mobile: Vertical table */}
          <div className="paces-table-vertical" style={{
            background: "var(--secondary-color)",
            borderRadius: "0.5rem",
            padding: "1em",
            fontFamily: "'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
            fontSize: "1em",
            overflowX: "auto",
            margin: 0
          }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
              <tbody>
                {[
                  { label: "Recovery", synonyms: ["recovery"] },
                  { label: "Gen-aerobic", synonyms: ["gen-aerobic", "general aerobic", "aerobic"] },
                  { label: "Long/Medium", synonyms: ["long/medium", "long/medium long", "long run", "medium long"] },
                  { label: "Marathon", synonyms: ["marathon"] },
                  { label: "LT", synonyms: ["lt", "lactate threshold", "threshold"] },
                  { label: "VO2max", synonyms: ["vo2max", "vo2 max"] },
                ].map((row, i) => {
                  let foundKey = Object.keys(pacesData).find(k =>
                    row.synonyms.some(syn => k.toLowerCase().includes(syn))
                  );
                  let value = foundKey ? (pacesData as any)[foundKey].pace_range : "-";
                  let trend = foundKey ? calculateTrend(foundKey) : null;
                  
                  return (
                    <tr key={i}>
                      <td className="pace-label" style={{
                        paddingRight: '1em',
                        fontWeight: 500,
                        textAlign: 'right',
                        borderRight: '2px solid #b3b3b3',
                        minWidth: '7em',
                        verticalAlign: 'middle',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: '10em',
                      }}>{row.label}</td>
                      <td className="pace-value" style={{
                        paddingLeft: '1em',
                        paddingRight: '0.5em',
                        textAlign: 'left',
                        fontVariantNumeric: 'tabular-nums',
                        fontWeight: 600,
                        minWidth: '12em',
                        verticalAlign: 'middle',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: '16em',
                      }}>
                        {value || "-"}
                        {trend && (
                          <span 
                            style={{ 
                              marginLeft: '0.5em', 
                              fontSize: '1em',
                              fontWeight: 'bold',
                              cursor: 'pointer'
                            }}
                            title={trend.details}
                            onClick={(e) => {
                              e.stopPropagation();
                              setTrendModal({ show: true, details: trend.details });
                            }}
                          >
                            {trend.arrow}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {!pacesData && !loading && !error && (
        <div style={{ textAlign: "center", padding: "2rem", color: "var(--disabled-fg-color)" }}>
          <p>No pace data available for {selectedUser}</p>
        </div>
      )}

      {/* Trend Details Modal */}
      {trendModal.show && (
        <>
          <div
            onClick={() => setTrendModal({ show: false, details: '' })}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.5)',
              zIndex: 1000,
            }}
          />
          <div
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'white',
              border: '2px solid var(--secondary-color)',
              borderRadius: '0.5rem',
              padding: '1.5rem',
              boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
              zIndex: 1001,
              maxWidth: '90%',
              minWidth: '300px',
            }}
          >
            <h3 style={{ marginTop: 0, marginBottom: '1rem', color: 'var(--text-color)' }}>Pace Trend Details</h3>
            <pre style={{ 
              whiteSpace: 'pre-wrap', 
              fontFamily: 'inherit',
              margin: '0 0 1rem 0',
              color: 'var(--text-color)',
              fontSize: '0.9rem',
              lineHeight: '1.5'
            }}>
              {trendModal.details}
            </pre>
            <button
              onClick={() => setTrendModal({ show: false, details: '' })}
              style={{
                padding: '0.5rem 1rem',
                background: 'var(--secondary-color)',
                color: 'var(--text-color)',
                border: 'none',
                borderRadius: '0.25rem',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: 'bold',
              }}
            >
              Close
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default PacesPanel;