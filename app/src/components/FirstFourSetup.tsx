import { useState, useEffect, useRef } from 'react';
import { FirstFourMatchup } from '@/types/models';

interface FirstFourSetupProps {
  matchups: FirstFourMatchup[];
  onSlotClick: (matchupId: string, position: number) => void;
  onRemoveTeam: (teamId: string) => void;
}

const slideInStyles = `
    @keyframes slideInFromLeft {
        0% {
            transform: translateX(-30%);
            opacity: 0;
        }
        100% {
            transform: translateX(0);
            opacity: 1;
        }
    }

    .slide-in-team {
        animation: slideInFromLeft 0.4s ease-out;
    }
`;

export default function FirstFourSetup({
  matchups,
  onSlotClick,
  onRemoveTeam
}: FirstFourSetupProps) {
  const [animatingSlots, setAnimatingSlots] = useState<Set<string>>(new Set());
  const prevMatchupsRef = useRef<FirstFourMatchup[]>([]);

  // Track when teams are added to trigger animations
  useEffect(() => {
    const newAnimatingSlots = new Set<string>();
    const prevMatchups = prevMatchupsRef.current;

    matchups.forEach(matchup => {
      const prevMatchup = prevMatchups.find(p => p.id === matchup.id);
      
      // Check if team1 was added
      if (matchup.team1 && (!prevMatchup || !prevMatchup.team1)) {
        newAnimatingSlots.add(`${matchup.id}-team1`);
      }
      
      // Check if team2 was added
      if (matchup.team2 && (!prevMatchup || !prevMatchup.team2)) {
        newAnimatingSlots.add(`${matchup.id}-team2`);
      }
    });

    if (newAnimatingSlots.size > 0) {
      setAnimatingSlots(newAnimatingSlots);

      setTimeout(() => {
        setAnimatingSlots(new Set());
      }, 400);
    }

    prevMatchupsRef.current = matchups;
  }, [matchups]);

  // Helper function to convert hex to RGB (same as RegionSetup)
  const hexToRgb = (hex: string) => {
    const cleanHex = hex.replace('#', '');
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);
    return { r, g, b };
  };

  const getTeamSlotStyle = (team: any) => {
    if (team && team.primaryColor) {
      const rgb = hexToRgb(team.primaryColor);
      const backgroundColorWithOpacity = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.7)`;

      return {
        backgroundColor: backgroundColorWithOpacity,
        borderColor: `#${team.primaryColor}`,
      };
    }
    return {};
  };

  const getTeamSlotClasses = (team: any) => {
    if (team) {
      return 'p-3 rounded border cursor-pointer transition-colors border-2 overflow-hidden';
    } else {
      return 'p-3 rounded border cursor-pointer transition-colors bg-gray-300 border-gray-600 hover:border-gray-500 overflow-hidden';
    }
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: slideInStyles }} />
      
      <div className="border-5 border-gray-600 rounded-lg p-6">
        <h3 className="text-2xl font-bold text-black mb-4">First Four Matchups</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {matchups.map(matchup => {
            const isTeam1Animating = animatingSlots.has(`${matchup.id}-team1`);
            const isTeam2Animating = animatingSlots.has(`${matchup.id}-team2`);

            return (
              <div key={matchup.id} className="rounded-lg bg-gray-300/50 border border-gray-600 p-4">
                <h4 className="text-lg font-semibold text-black mb-3">
                  {matchup.seed} Seed Matchup {matchup.id.slice(-1)}
                </h4>
                
                <div className="space-y-3">
                  {/* Team 1 */}
                  <div
                    className={getTeamSlotClasses(matchup.team1)}
                    style={getTeamSlotStyle(matchup.team1)}
                    onClick={() => !matchup.team1 && onSlotClick(matchup.id, 1)}
                  >
                    {matchup.team1 ? (
                      <div className={`flex items-center justify-between ${isTeam1Animating ? 'slide-in-team' : ''}`}>
                        <div className="flex items-center space-x-2">
                          <img src={matchup.team1.alternateLogoURL} alt={matchup.team1.name} className="w-6 h-6" />
                          <span className="text-white drop-shadow-sm">{matchup.team1.displayName}</span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveTeam(matchup.team1!.id);
                          }}
                          className="text-white hover:text-red-300 cursor-pointer"
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <div className="text-gray-400">Click to select team</div>
                    )}
                  </div>

                  <div className="text-center text-gray-400">vs</div>

                  {/* Team 2 */}
                  <div
                    className={getTeamSlotClasses(matchup.team2)}
                    style={getTeamSlotStyle(matchup.team2)}
                    onClick={() => !matchup.team2 && onSlotClick(matchup.id, 2)}
                  >
                    {matchup.team2 ? (
                      <div className={`flex items-center justify-between ${isTeam2Animating ? 'slide-in-team' : ''}`}>
                        <div className="flex items-center space-x-2">
                          <img src={matchup.team2.alternateLogoURL} alt={matchup.team2.name} className="w-6 h-6" />
                          <span className="text-white drop-shadow-sm">{matchup.team2.displayName}</span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveTeam(matchup.team2!.id);
                          }}
                          className="text-white hover:text-red-300 cursor-pointer"
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <div className="text-gray-400">Click to select team</div>
                    )}
                  </div>
                </div>

                {/* Assignment Status */}
                {matchup.assignedRegion && (
                  <div className="mt-3 text-sm text-blue-400">
                    → Assigned to {matchup.assignedRegion} Region
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}