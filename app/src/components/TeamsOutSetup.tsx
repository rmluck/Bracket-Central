import { useState, useEffect, useRef } from 'react';
import { Team } from '@/types/models';

interface TeamsOutSetupProps {
  firstFourOut: (Team | undefined)[];
  nextFourOut: (Team | undefined)[];
  onSlotClick: (category: 'firstFourOut' | 'nextFourOut', index: number) => void;
  onRemoveTeam: (category: 'firstFourOut' | 'nextFourOut', index: number) => void;
  selectedTeams: Set<string>;
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

export default function TeamsOutSetup({
  firstFourOut,
  nextFourOut,
  onSlotClick,
  onRemoveTeam,
  selectedTeams
}: TeamsOutSetupProps) {
  const [animatingSlots, setAnimatingSlots] = useState<Set<string>>(new Set());
  const prevFirstFourOutRef = useRef<(Team | undefined)[]>([]);
  const prevNextFourOutRef = useRef<(Team | undefined)[]>([]);

  // Track when teams are added to trigger animations
  useEffect(() => {
    const newAnimatingSlots = new Set<string>();
    const prevFirstFourOut = prevFirstFourOutRef.current;
    const prevNextFourOut = prevNextFourOutRef.current;

    // Check firstFourOut for new teams
    firstFourOut.forEach((team, index) => {
      const prevTeam = prevFirstFourOut[index];
      if (team && !prevTeam) {
        newAnimatingSlots.add(`firstFourOut-${index}`);
      }
    });

    // Check nextFourOut for new teams
    nextFourOut.forEach((team, index) => {
      const prevTeam = prevNextFourOut[index];
      if (team && !prevTeam) {
        newAnimatingSlots.add(`nextFourOut-${index}`);
      }
    });

    if (newAnimatingSlots.size > 0) {
      setAnimatingSlots(newAnimatingSlots);

      setTimeout(() => {
        setAnimatingSlots(new Set());
      }, 400);
    }

    prevFirstFourOutRef.current = firstFourOut;
    prevNextFourOutRef.current = nextFourOut;
  }, [firstFourOut, nextFourOut]);

  const renderTeamSlot = (team: Team | undefined, category: 'firstFourOut' | 'nextFourOut', index: number) => {
    const slotNumber = index + 1;
    const slotId = `${category}-${index}`;
    const isAnimating = animatingSlots.has(slotId);

    if (team) {
      // Helper function to convert hex to RGB
      const hexToRgb = (hex: string) => {
        const cleanHex = hex.replace('#', '');
        const r = parseInt(cleanHex.substring(0, 2), 16);
        const g = parseInt(cleanHex.substring(2, 4), 16);
        const b = parseInt(cleanHex.substring(4, 6), 16);
        return { r, g, b };
      };

      const teamSlotStyle = team.primaryColor ? (() => {
        const rgb = hexToRgb(team.primaryColor);
        return {
          backgroundColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.7)`,
          borderColor: `#${team.primaryColor}`,
        };
      })() : {};

      return (
        <div
          className="p-3 rounded cursor-pointer transition-colors border-2 overflow-hidden"
          style={teamSlotStyle}
        >
          <div className={`flex items-center justify-between ${isAnimating ? 'slide-in-team' : ''}`}>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-white drop-shadow-sm">{slotNumber}</span>
              <img src={team.alternateLogoURL} alt={team.name} className="w-6 h-6" />
              <span className="truncate text-white drop-shadow-sm">{team.displayName}</span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemoveTeam(category, index);
              }}
              className="text-white hover:text-red-300 cursor-pointer"
            >
              ×
            </button>
          </div>
        </div>
      );
    } else {
      return (
        <div
          className="p-3 rounded border cursor-pointer transition-colors bg-gray-300 border-gray-600 hover:border-gray-500 overflow-hidden"
          onClick={() => onSlotClick(category, index)}
        >
          <div className="text-gray-400">
            <span className="font-bold">{slotNumber}</span> Click to select team
          </div>
        </div>
      );
    }
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: slideInStyles }} />
      
      <div className="border-5 border-gray-600 rounded-lg p-6">
        <h3 className="text-2xl font-bold text-black mb-4">Teams Out</h3>
        <p className="text-gray-900 mb-6 text-sm">Optional: Select teams that just missed the cut</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* First Four Out */}
          <div>
            <h4 className="text-lg font-semibold text-black mb-3">First Four Out</h4>
            <div className="space-y-2">
              {Array.from({ length: 4 }, (_, index) => (
                <div key={`first-four-out-${index}`}>
                  {renderTeamSlot(firstFourOut[index], 'firstFourOut', index)}
                </div>
              ))}
            </div>
          </div>

          {/* Next Four Out */}
          <div>
            <h4 className="text-lg font-semibold text-black mb-3">Next Four Out</h4>
            <div className="space-y-2">
              {Array.from({ length:4 }, (_, index) => (
                <div key={`next-four-out-${index}`}>
                  {renderTeamSlot(nextFourOut[index], 'nextFourOut', index)}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}