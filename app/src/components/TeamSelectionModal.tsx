import { useState } from 'react';
import { Team } from '@/types/models';

interface TeamSelectionModalProps {
  teams: Team[];
  teamsByConference: Record<string, Team[]>;
  selectedTeams: Set<string>;
  onTeamSelect: (team: Team) => void;
  onClose: () => void;
}

// Custom Conference Dropdown Component
const ConferenceDropdown = ({
  teamsByConference,
  selectedConference,
  onConferenceSelect,
  onClear
}: {
  teamsByConference: Record<string, Team[]>;
  selectedConference: string;
  onConferenceSelect: (conference: string) => void;
  onClear: () => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const conferences = Object.keys(teamsByConference).sort();

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-3 bg-gray-700 border border-gray-600 rounded text-white text-left flex items-center justify-between hover:bg-gray-600 transition-colors"
      >
        <span>
          {selectedConference 
            ? `${selectedConference} (${teamsByConference[selectedConference]?.length || 0} teams)`
            : 'Select by conference...'
          }
        </span>
        <div className="flex items-center space-x-2">
          {selectedConference && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              className="text-gray-400 hover:text-white"
            >
              ×
            </button>
          )}
          <svg 
            className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute left-0 top-full mt-1 z-20 bg-gray-800 border border-gray-600 rounded-md shadow-lg w-full max-h-64 overflow-y-auto">
            <div className="py-1">
              {conferences.map(conference => (
                <button
                  key={conference}
                  onClick={() => {
                    onConferenceSelect(conference);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors cursor-pointer ${
                    selectedConference === conference
                      ? 'bg-blue-700 text-white'
                      : 'text-white hover:bg-gray-700'
                  }`}
                >
                  <div className="font-medium">{conference}</div>
                  <div className="text-xs text-gray-400">
                    {teamsByConference[conference]?.length || 0} teams
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

export default function TeamSelectionModal({
  teams,
  teamsByConference,
  selectedTeams,
  onTeamSelect,
  onClose
}: TeamSelectionModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedConference, setSelectedConference] = useState('');

  const filteredTeams = searchTerm
    ? teams.filter(team =>
        team.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        team.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        team.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        team.abbreviation.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : selectedConference
    ? teamsByConference[selectedConference] || []
    : [];

  const availableTeams = filteredTeams.filter(team => !selectedTeams.has(team.id));

  const handleConferenceSelect = (conference: string) => {
    setSelectedConference(conference);
    setSearchTerm('');
  };

  const handleClearConference = () => {
    setSelectedConference('');
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    if (value) {
      setSelectedConference('');
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-200/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-2xl w-[80vw] max-h-[80vh] overflow-hidden">
        <div className="p-6 border-b border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-white">Select Team</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-2xl cursor-pointer"
            >
              ×
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative mb-4">
            <input
              type="text"
              placeholder="Search teams..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 pr-10"
            />
            {searchTerm && (
              <button
                onClick={() => handleSearchChange('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
              >
                ×
              </button>
            )}
          </div>

          {/* Custom Conference Dropdown */}
          <ConferenceDropdown
            teamsByConference={teamsByConference}
            selectedConference={selectedConference}
            onConferenceSelect={handleConferenceSelect}
            onClear={handleClearConference}
          />
        </div>

        {/* Teams List */}
        <div className="p-6 overflow-y-auto min-h-65 max-h-96">
          {availableTeams.length > 0 ? (
            <div className="space-y-2">
              {availableTeams.map(team => (
                <div
                  key={team.id}
                  onClick={() => onTeamSelect(team)}
                  className="flex items-center space-x-3 p-3 bg-gray-700 hover:bg-gray-600 rounded cursor-pointer transition-colors"
                >
                  <img
                    src={team.logoURL}
                    alt={team.name}
                    className="w-8 h-8"
                    onError={(e) => {
                      e.currentTarget.src = '/placeholder-team-logo.png';
                    }}
                  />
                  <div className="flex-1">
                    <div className="text-white font-semibold">{team.fullName}</div>
                    <div className="text-gray-400 text-sm">{team.conference}</div>
                  </div>
                  <div className="text-gray-500 text-sm">{team.abbreviation}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-400 py-8">
              {searchTerm || selectedConference ? 'No teams found' : 'Search for teams or select a conference'}
            </div>
          )}
        </div>

        {/* Active Filter Display */}
        {(searchTerm || selectedConference) && (
          <div className="px-6 py-3 border-t border-gray-700 bg-gray-900">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">
                {searchTerm && `Searching: "${searchTerm}"`}
                {selectedConference && `Conference: ${selectedConference}`}
              </span>
              <span className="text-gray-500">
                {availableTeams.length} teams found
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}