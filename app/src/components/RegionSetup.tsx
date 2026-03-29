import { useState, useEffect, useRef } from 'react';
import { BracketSlot, FirstFourMatchup } from '@/types/models';

// FirstFourDropdown component stays the same...
const FirstFourDropdown = ({ 
  slot, 
  availableMatchups, 
  onFirstFourAssignment, 
  regionName 
}: {
  slot: BracketSlot;
  availableMatchups: FirstFourMatchup[];
  onFirstFourAssignment: (matchupId: string, regionName: string, slotId: string) => void;
  regionName: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const filteredMatchups = availableMatchups.filter(m => m.seed === slot.position);

  if (filteredMatchups.length === 0) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="text-xs bg-blue-500 hover:bg-blue-400 text-white rounded mt-2 mr-1 px-2 py-1 transition-colors flex items-center space-x-1 cursor-pointer"
      >
        <span>Link First Four</span>
        <svg 
          className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          <div className="absolute right-0 top-full mt-1 z-20 bg-gray-800 border border-gray-600 rounded-md shadow-lg min-w-48">
            <div className="py-1">
              {filteredMatchups.map(matchup => (
                <button
                  key={matchup.id}
                  onClick={() => {
                    onFirstFourAssignment(matchup.id, regionName, slot.id);
                    setIsOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-white hover:bg-gray-700 transition-colors cursor-pointer"
                >
                  {matchup.id.replace('ff-', '').replace('-', ' ').toUpperCase()}
                  <div className="text-xs text-gray-400">
                    {matchup.team1?.abbreviation || 'TBD'} vs {matchup.team2?.abbreviation || 'TBD'}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

interface RegionSetupProps {
    regionName: string;
    slots: BracketSlot[];
    firstFourMatchups: FirstFourMatchup[];
    onSlotClick: (slotId: string) => void;
    onRemoveTeam: (teamId: string) => void;
    onFirstFourAssignment: (matchupId: string, regionName: string, slotId: string) => void;
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

    @keyframes slideInFromLeftSplit {
        0% {
            transform: translateX(-20%);
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

    .slide-in-split {
        animation: slideInFromLeftSplit 0.4s ease-out;
    }
`;

export default function RegionSetup({
  regionName,
  slots,
  firstFourMatchups,
  onSlotClick,
  onRemoveTeam,
  onFirstFourAssignment
}: RegionSetupProps) {
    const [animatingSlots, setAnimatingSlots] = useState<Set<string>>(new Set());
    const prevSlotsRef = useRef<BracketSlot[]>([]);
    const prevFirstFourRef = useRef<FirstFourMatchup[]>([]);

    // Track when teams are added to trigger animations - only for newly added teams
    useEffect(() => {
        const newAnimatingSlots = new Set<string>();
        const prevSlots = prevSlotsRef.current;
        const prevFirstFour = prevFirstFourRef.current;

        // Check for newly added teams in slots
        slots.forEach(slot => {
            const prevSlot = prevSlots.find(p => p.id === slot.id);
            // Only animate if this slot didn't have a team before but now does
            if (slot.team && (!prevSlot || !prevSlot.team)) {
                newAnimatingSlots.add(slot.id);
            }
        });

        // Check for newly added First Four assignments
        firstFourMatchups.forEach(matchup => {
            const prevMatchup = prevFirstFour.find(p => p.id === matchup.id);
            
            // Only animate if this matchup has a slot assigned and either:
            // 1. It didn't have a slot assigned before, OR
            // 2. It now has teams but didn't before
            if (matchup.assignedSlotId) {
                const hadAssignmentBefore = prevMatchup?.assignedSlotId;
                const hasTeamsNow = matchup.team1 || matchup.team2;
                const hadTeamsBefore = prevMatchup?.team1 || prevMatchup?.team2;
                
                if (!hadAssignmentBefore || (hasTeamsNow && !hadTeamsBefore)) {
                    newAnimatingSlots.add(matchup.assignedSlotId);
                }
            }
        });

        if (newAnimatingSlots.size > 0) {
            setAnimatingSlots(newAnimatingSlots);

            // Remove animation class after animation completes
            setTimeout(() => {
                setAnimatingSlots(new Set());
            }, 400); // Match animation duration
        }

        // Update refs for next comparison
        prevSlotsRef.current = slots;
        prevFirstFourRef.current = firstFourMatchups;
    }, [slots, firstFourMatchups]);

  const getSlotDisplay = (slot: BracketSlot) => {
    const isAnimating = animatingSlots.has(slot.id);

    if (slot.team) {
      // Normal single team slot
      return (
        <div className={`flex items-center justify-between ${isAnimating ? 'slide-in-team' : ''}`}>
          <div className="flex items-center space-x-2">
            <span className="font-bold text-white drop-shadow-sm">{slot.position}</span>
            <img src={slot.team.alternateLogoURL} alt={slot.team.name} className="w-6 h-6" />
            <span className="truncate text-white drop-shadow-sm">{slot.team.displayName}</span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemoveTeam(slot.team!.id);
            }}
            className="text-white hover:text-red-300 cursor-pointer"
          >
            ×
          </button>
        </div>
      );
    } else if (slot.isFirstFour) {
      // First Four matchup slot - show both teams split
      const matchup = firstFourMatchups.find(m => m.assignedSlotId === slot.id);
      
      if (matchup && matchup.team1 && matchup.team2) {
        return (
          <div className={`relative overflow-hidden rounded ${isAnimating ? 'slide-in-split' : ''}`}>
            {/* Split background */}
            <div className="flex">
              {/* Left team */}
              <div 
                className="w-1/2 p-3 flex items-center space-x-1 border-2"
                style={{
                  backgroundColor: matchup.team1.primaryColor 
                    ? `rgba(${hexToRgb(matchup.team1.primaryColor).r}, ${hexToRgb(matchup.team1.primaryColor).g}, ${hexToRgb(matchup.team1.primaryColor).b}, 0.7)`
                    : 'rgba(107, 114, 128, 0.7)',
                  borderColor: matchup.team1.primaryColor ? `#${matchup.team1.primaryColor}` : 'rgba(107, 114, 128, 0.7)'
                }}
              >
                <span className="font-bold text-white drop-shadow-sm text-sm">{slot.position}</span>
                <img src={matchup.team1.alternateLogoURL} alt={matchup.team1.name} className="w-4 h-4" />
                <span className="truncate text-white drop-shadow-sm text-xs">{matchup.team1.abbreviation}</span>
              </div>
              
              {/* Right team */}
              <div 
                className="w-1/2 p-3 flex items-center space-x-1 border-2"
                style={{
                  backgroundColor: matchup.team2.primaryColor 
                    ? `rgba(${hexToRgb(matchup.team2.primaryColor).r}, ${hexToRgb(matchup.team2.primaryColor).g}, ${hexToRgb(matchup.team2.primaryColor).b}, 0.7)`
                    : 'rgba(107, 114, 128, 0.7)',
                  borderColor: matchup.team2.primaryColor ? `#${matchup.team2.primaryColor}` : 'rgba(107, 114, 128, 0.7)'
                }}
              >
                <img src={matchup.team2.alternateLogoURL} alt={matchup.team2.name} className="w-4 h-4" />
                <span className="truncate text-white drop-shadow-sm text-xs">{matchup.team2.abbreviation}</span>
              </div>
            </div>
            
            {/* Remove button overlay */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    // Clear the First Four assignment by passing empty matchupId
                    onFirstFourAssignment('', regionName, slot.id);
                }}
                className="absolute top-3 right-2 text-white hover:text-blue-300 cursor-pointer bg-black/50 rounded-full w-5 h-5 flex items-center justify-center text-xs"
                >
                ×
                </button>
          </div>
        );
      } else {
        // First Four linked but no teams selected yet
        return (
            <div className="relative">
                <div className="text-blue-400 p-2">
                    <span className="font-bold">{slot.position}</span> First Four Winner
                    <div className="text-xs">Teams not selected yet</div>
                </div>
                
                {/* Remove button for unassigned First Four */}
                <button
                    onClick={(e) => {
                    e.stopPropagation();
                    // Clear the First Four assignment by passing empty matchupId
                    onFirstFourAssignment('', regionName, slot.id);
                    }}
                    className="absolute top-1 right-1 text-white hover:text-blue-300 cursor-pointer bg-black bg-opacity-50 rounded-full w-5 h-5 flex items-center justify-center text-xs"
                >
                    ×
                </button>
            </div>
        );
      }
    } else {
      // Empty slot
      return (
        <div className="text-gray-400">
          <span className="font-bold">{slot.position}</span> Click to select team
        </div>
      );
    }
  };

  // Helper function to convert hex to RGB
  const hexToRgb = (hex: string) => {
    const cleanHex = hex.replace('#', '');
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);
    return { r, g, b };
  };

  const getSlotStyle = (slot: BracketSlot) => {
    if (slot.team && slot.team.primaryColor) {
        const rgb = hexToRgb(slot.team.primaryColor);
        const backgroundColorWithOpacity = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.7)`;

        return {
            backgroundColor: backgroundColorWithOpacity,
            borderColor: `#${slot.team.primaryColor}`,
        };
    } else if (slot.isFirstFour) {
        // First Four slots don't need background since we handle it inside the display
        return {};
    }
    return {};
  };

  const getSlotClasses = (slot: BracketSlot) => {
    if (slot.team) {
        return 'p-3 rounded border cursor-pointer transition-colors border-2 overflow-hidden';
    } else if (slot.isFirstFour) {
        return 'rounded cursor-pointer transition-colors overflow-hidden';
    } else {
        return 'p-3 rounded border cursor-pointer transition-colors bg-gray-300 border-gray-600 hover:border-gray-500 overflow-hidden';
    }
    };

  const canLinkToFirstFour = (slot: BracketSlot) => {
    return (slot.position === 11 || slot.position === 16) && !slot.team && !slot.isFirstFour;
  };

  const availableFirstFourMatchups = firstFourMatchups.filter(
    m => !m.assignedSlotId && slots.some(s => s.position === m.seed)
  );

  // Update slot isFirstFour status based on assignments
  const slotsWithFirstFour = slots.map(slot => {
    const isLinkedToFirstFour = firstFourMatchups.some(m => m.assignedSlotId === slot.id);
    return { ...slot, isFirstFour: isLinkedToFirstFour };
  });

  return (
    <>
        <style dangerouslySetInnerHTML={{__html: slideInStyles }} />

        <div className="border-5 border-gray-600 rounded-lg p-6">
        <h3 className="text-2xl font-bold text-black mb-4">{regionName} Region</h3>
        <div className="space-y-2">
            {slotsWithFirstFour.map(slot => (
            <div key={slot.id} className="relative">
                <div
                    className={getSlotClasses(slot)}
                    style={getSlotStyle(slot)}
                    onClick={() => !slot.team && !slot.isFirstFour && onSlotClick(slot.id)}
                >
                    {getSlotDisplay(slot)}
                </div>
                
                {/* Custom First Four Dropdown */}
                {canLinkToFirstFour(slot) && availableFirstFourMatchups.length > 0 && (
                <div className="absolute right-0 top-0 mt-1 mr-1">
                    <FirstFourDropdown
                    slot={slot}
                    availableMatchups={availableFirstFourMatchups}
                    onFirstFourAssignment={onFirstFourAssignment}
                    regionName={regionName}
                    />
                </div>
                )}
            </div>
            ))}
        </div>
        </div>
    </>
  );
}