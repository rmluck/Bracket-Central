'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getAllTeams, getTeamsByConference } from '@/lib/load-teams';
import { Team, BracketTeam, BracketSlot, FirstFourMatchup, BRACKET_FORMATS } from '@/types/models';
import RegionSetup from '@/components/RegionSetup';
import FirstFourSetup from '@/components/FirstFourSetup';
import TeamsOutSetup from '@/components/TeamsOutSetup';
import RegionOrderSetup from '@/components/RegionOrderSetup';
import TeamSelectionModal from '@/components/TeamSelectionModal';
import BracketSetupExportModal from '@/components/BracketSetupExportModal';

interface BracketSetupState {
  regions: Record<string, BracketSlot[]>;
  firstFourMatchups: FirstFourMatchup[];
  regionOrder: Record<string, number>;
  selectedTeams: Set<string>;
  firstFourOut: (Team | undefined)[];
  nextFourOut: (Team | undefined)[];
}

export default function BracketSetupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const format = searchParams?.get('format') || 'march-madness-68';
  const bracketFormat = BRACKET_FORMATS[format];

  const [teams] = useState<Team[]>(getAllTeams());
  const [teamsByConference] = useState<Record<string, Team[]>>(getTeamsByConference());
  const [selectedSlot, setSelectedSlot] = useState<{type: 'region' | 'firstFour' | 'justMissed', regionId?: string, slotId?: string, matchupId?: string, position?: number, category?: 'firstFourOut' | 'nextFourOut', index?: number} | null>(null);

  const [showExportModal, setShowExportModal] = useState(false);
  
  const [bracketState, setBracketState] = useState<BracketSetupState>(() => {
    // Initialize regions with empty slots
    const regions: Record<string, BracketSlot[]> = {};
    bracketFormat.regions.forEach(regionName => {
      regions[regionName] = [];
      for (let seed = 1; seed <= 16; seed++) {
        regions[regionName].push({
          id: `${regionName}-${seed}`,
          region: regionName,
          round: 1,
          position: seed,
        });
      }
    });

    // Initialize First Four matchups
    const firstFourMatchups: FirstFourMatchup[] = [
      { id: 'ff-11-1', seed: 11, assignedRegion: '', assignedSlotId: '' },
      { id: 'ff-11-2', seed: 11, assignedRegion: '', assignedSlotId: '' },
      { id: 'ff-16-1', seed: 16, assignedRegion: '', assignedSlotId: '' },
      { id: 'ff-16-2', seed: 16, assignedRegion: '', assignedSlotId: '' },
    ];

    // Initialize region order
    const regionOrder: Record<string, number> = {};

    // Initialize teams just missed arrays
    const firstFourOut: (Team | undefined)[] = new Array(4).fill(undefined);
    const nextFourOut: (Team | undefined)[] = new Array(4).fill(undefined);

    return {
      regions,
      firstFourMatchups,
      regionOrder,
      selectedTeams: new Set(),
      firstFourOut,
      nextFourOut,
    };
  });

  const handleTeamSelect = (team: Team) => {
    if (!selectedSlot || bracketState.selectedTeams.has(team.id)) return;

    const newSelectedTeams = new Set(bracketState.selectedTeams);
    newSelectedTeams.add(team.id);

    if (selectedSlot.type === 'region' && selectedSlot.regionId && selectedSlot.slotId) {
      // Handle region slot selection
      const newRegions = { ...bracketState.regions };
      const regionSlots = [...newRegions[selectedSlot.regionId]];
      const slotIndex = regionSlots.findIndex(slot => slot.id === selectedSlot.slotId);
      
      if (slotIndex !== -1) {
        const bracketTeam: BracketTeam = {
          ...team,
          seed: regionSlots[slotIndex].position
        };
        
        regionSlots[slotIndex] = {
          ...regionSlots[slotIndex],
          team: bracketTeam
        };
        newRegions[selectedSlot.regionId] = regionSlots;
      }

      setBracketState(prev => ({
        ...prev,
        regions: newRegions,
        selectedTeams: newSelectedTeams
      }));
    } else if (selectedSlot.type === 'firstFour' && selectedSlot.matchupId && selectedSlot.position) {
      // Handle First Four team selection
      const newFirstFour = bracketState.firstFourMatchups.map(matchup => {
        if (matchup.id === selectedSlot.matchupId) {
          const bracketTeam: BracketTeam = {
            ...team,
            seed: matchup.seed
          };
          
          if (selectedSlot.position === 1) {
            return { ...matchup, team1: bracketTeam };
          } else {
            return { ...matchup, team2: bracketTeam };
          }
        }
        return matchup;
      });

      setBracketState(prev => ({
        ...prev,
        firstFourMatchups: newFirstFour,
        selectedTeams: newSelectedTeams
      }));
    } else if (selectedSlot.type === 'justMissed' && selectedSlot.category && selectedSlot.index !== undefined) {
      // Handle teams just missed selection
      if (selectedSlot.category === 'firstFourOut') {
        const newFirstFourOut = [...bracketState.firstFourOut];
        newFirstFourOut[selectedSlot.index] = team;
        setBracketState(prev => ({
          ...prev,
          firstFourOut: newFirstFourOut,
          selectedTeams: newSelectedTeams
        }));
      } else if (selectedSlot.category === 'nextFourOut') {
        const newNextFourOut = [...bracketState.nextFourOut];
        newNextFourOut[selectedSlot.index] = team;
        setBracketState(prev => ({
          ...prev,
          nextFourOut: newNextFourOut,
          selectedTeams: newSelectedTeams
        }));
      }
    }

    setSelectedSlot(null);
  };

  const handleRemoveTeam = (teamId: string) => {
    const newSelectedTeams = new Set(bracketState.selectedTeams);
    newSelectedTeams.delete(teamId);

    // Remove from regions
    const newRegions = { ...bracketState.regions };
    Object.keys(newRegions).forEach(regionName => {
      newRegions[regionName] = newRegions[regionName].map(slot => 
        slot.team?.id === teamId ? { ...slot, team: undefined } : slot
      );
    });

    // Remove from First Four
    const newFirstFour = bracketState.firstFourMatchups.map(matchup => ({
      ...matchup,
      team1: matchup.team1?.id === teamId ? undefined : matchup.team1,
      team2: matchup.team2?.id === teamId ? undefined : matchup.team2,
    }));

    // Remove from teams just missed
    const newFirstFourOut = bracketState.firstFourOut.map(team => 
      team?.id === teamId ? undefined : team
    );
    const newNextFourOut = bracketState.nextFourOut.map(team => 
      team?.id === teamId ? undefined : team
    );

    setBracketState(prev => ({
      ...prev,
      regions: newRegions,
      firstFourMatchups: newFirstFour,
      firstFourOut: newFirstFourOut,
      nextFourOut: newNextFourOut,
      selectedTeams: newSelectedTeams
    }));
  };

  const handleJustMissedTeamSelect = (team: Team, category: 'firstFourOut' | 'nextFourOut', index: number) => {
    setSelectedSlot({ type: 'justMissed', category, index });
    // The team selection will be handled by handleTeamSelect
    handleTeamSelect(team);
  };

  const handleJustMissedTeamRemove = (category: 'firstFourOut' | 'nextFourOut', index: number) => {
    setBracketState(prev => {
        const newSelectedTeams = new Set(prev.selectedTeams);
        
        if (category === 'firstFourOut') {
        const team = prev.firstFourOut[index];
        if (team) {
            newSelectedTeams.delete(team.id);
            const newFirstFourOut = [...prev.firstFourOut];
            newFirstFourOut[index] = undefined;
            
            return {
            ...prev,
            firstFourOut: newFirstFourOut,
            selectedTeams: newSelectedTeams
            };
        }
        } else if (category === 'nextFourOut') {
        const team = prev.nextFourOut[index];
        if (team) {
            newSelectedTeams.delete(team.id);
            const newNextFourOut = [...prev.nextFourOut];
            newNextFourOut[index] = undefined;
            
            return {
            ...prev,
            nextFourOut: newNextFourOut,
            selectedTeams: newSelectedTeams
            };
        }
        }
        
        return prev;
    });
    };

  const handleFirstFourAssignment = (matchupId: string, regionName: string, slotId: string) => {
    setBracketState(prev => {
      const newFirstFour = prev.firstFourMatchups.map(matchup => {
        if (!matchupId && matchup.assignedSlotId === slotId) {
          return { ...matchup, assignedRegion: '', assignedSlotId: '' };
        } else if (matchup.id === matchupId) {
          return { ...matchup, assignedRegion: regionName, assignedSlotId: slotId };
        } else if (matchupId && matchup.assignedSlotId === slotId) {
          return { ...matchup, assignedRegion: '', assignedSlotId: '' };
        }
        return matchup;
      });

      return {
        ...prev,
        firstFourMatchups: newFirstFour
      };
    });
  };

  const handleRegionOrderChange = (regionName: string, position: number) => {
    setBracketState(prev => {
      const newRegionOrder = { ...prev.regionOrder };
      
      if (position === 0) {
        delete newRegionOrder[regionName];
      } else {
        newRegionOrder[regionName] = position;
      }
      
      return {
        ...prev,
        regionOrder: newRegionOrder
      };
    });
  };

  const isValidBracket = () => {
    // Check if all region slots are filled or linked to First Four
    for (const regionName of bracketFormat.regions) {
      const slots = bracketState.regions[regionName];
      for (const slot of slots) {
        const isLinkedToFirstFour = bracketState.firstFourMatchups.some(m => m.assignedSlotId === slot.id);
        if (!slot.team && !isLinkedToFirstFour) {
          return false;
        }
      }
    }

    // Check if all First Four matchups have two teams
    for (const matchup of bracketState.firstFourMatchups) {
      if (!matchup.team1 || !matchup.team2) {
        return false;
      }
    }

    // Check if region order is complete
    const orderValues = Object.values(bracketState.regionOrder);
    if (orderValues.length !== 4 || new Set(orderValues).size !== 4) {
      return false;
    }

    return true;
  };

  const handleContinue = () => {
    if (isValidBracket()) {
      localStorage.setItem('bracketSetup', JSON.stringify(bracketState));
      router.push('/bracket/view');
    }
  };

  if (!bracketFormat) {
    return <div>Invalid bracket format</div>;
  }

  return (
    <div className="min-h-screen bg-gray-200 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-black mb-4">Set Up Your Bracket</h1>
          <p className="text-gray-900">Fill in all slots for {bracketFormat.name}</p>

          {/* Export Button */}
          <button
            onClick={() => setShowExportModal(true)}
            className="mt-4 px-6 py-3 bg-blue-400 hover:bg-blue-500 text-white rounded-lg transition-colors flex items-center space-x-2 mx-auto cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Export Bracket Image</span>
          </button>
        </div>

        <div className="space-y-8">
          {/* Main Regions */}
          <div className="grid grid-cols-1 xl:grid-cols-4 lg:grid-cols-2 gap-6">
            {bracketFormat.regions.map(regionName => (
              <RegionSetup
                key={regionName}
                regionName={regionName}
                slots={bracketState.regions[regionName]}
                firstFourMatchups={bracketState.firstFourMatchups}
                onSlotClick={(slotId) => setSelectedSlot({ type: 'region', regionId: regionName, slotId })}
                onRemoveTeam={handleRemoveTeam}
                onFirstFourAssignment={handleFirstFourAssignment}
              />
            ))}
          </div>

          {/* First Four Setup */}
          <FirstFourSetup
            matchups={bracketState.firstFourMatchups}
            onSlotClick={(matchupId, position) => setSelectedSlot({ type: 'firstFour', matchupId, position })}
            onRemoveTeam={handleRemoveTeam}
          />

          {/* Teams Out Setup */}
          <TeamsOutSetup
            firstFourOut={bracketState.firstFourOut}
            nextFourOut={bracketState.nextFourOut}
            onSlotClick={(category, index) => setSelectedSlot({ type: 'justMissed', category, index })}
            onRemoveTeam={handleJustMissedTeamRemove}
            selectedTeams={bracketState.selectedTeams}
          />

          {/* Region Order Setup */}
          <RegionOrderSetup
            regions={bracketFormat.regions}
            regionOrder={bracketState.regionOrder}
            onOrderChange={handleRegionOrderChange}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between mt-8">
          <button
            onClick={() => router.push('/create')}
            className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors cursor-pointer"
          >
            Back to Format Selection
          </button>
          
          <button
            onClick={handleContinue}
            disabled={!isValidBracket()}
            className={`px-6 py-3 rounded-lg transition-colors cursor-pointer ${
              isValidBracket()
                ? 'bg-orange-600 hover:bg-orange-700 text-white'
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            }`}
          >
            Continue to Bracket View
          </button>
        </div>
      </div>

      {/* Team Selection Modal */}
      {selectedSlot && (
        <TeamSelectionModal
          teams={teams}
          teamsByConference={teamsByConference}
          selectedTeams={bracketState.selectedTeams}
          onTeamSelect={handleTeamSelect}
          onClose={() => setSelectedSlot(null)}
        />
      )}

      {/* Export Modal */}
      {showExportModal && (
        <BracketSetupExportModal
          regions={bracketState.regions}
          firstFourMatchups={bracketState.firstFourMatchups}
          firstFourOut={bracketState.firstFourOut}
          nextFourOut={bracketState.nextFourOut}
          regionOrder={bracketState.regionOrder}
          onClose={() => setShowExportModal(false)}
        />
      )}
    </div>
  );
}