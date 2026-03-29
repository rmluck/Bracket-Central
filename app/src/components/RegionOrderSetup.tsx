import { useState, useRef, useEffect } from 'react';

interface RegionOrderSetupProps {
  regions: string[];
  regionOrder: Record<string, number>;
  onOrderChange: (regionName: string, position: number) => void;
}

// Custom Position Dropdown Component
const PositionDropdown = ({
  regionName,
  selectedPosition,
  availablePositions,
  onPositionSelect,
  onClear
}: {
  regionName: string;
  selectedPosition: number | null;
  availablePositions: { number: number; description: string }[];
  onPositionSelect: (position: number) => void;
  onClear: () => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<'down' | 'up'>('down');
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - buttonRect.bottom;
      const spaceAbove = buttonRect.top;
      
      if (spaceBelow < 200 && spaceAbove > spaceBelow) {
        setDropdownPosition('up');
      } else {
        setDropdownPosition('down');
      }
    }
  }, [isOpen]);

  const selectedPositionData = availablePositions.find(pos => pos.number === selectedPosition);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-3 bg-gray-300 border border-gray-600 rounded text-gray-400 text-left flex items-center justify-between hover:bg-gray-600 transition-colors cursor-pointer"
      >
        <span>
          {selectedPositionData 
            ? `${selectedPositionData.number} - ${selectedPositionData.description}`
            : 'Click to select position'
          }
        </span>
        <div className="flex items-center space-x-2">
          {selectedPosition && (
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
          <div 
            className={`absolute left-0 z-20 bg-gray-800 border border-gray-600 rounded-md shadow-lg w-full overflow-y-auto ${
              dropdownPosition === 'up' 
                ? 'bottom-full mb-1 max-h-60' 
                : 'top-full mt-1 max-h-60'
            }`}
          >
            <div className="py-1">
              {availablePositions.map(position => (
                <button
                  key={position.number}
                  onClick={() => {
                    onPositionSelect(position.number);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors cursor-pointer ${
                    selectedPosition === position.number
                      ? 'bg-blue-700 text-white'
                      : 'text-white hover:bg-gray-700'
                  }`}
                >
                  <div className="font-medium">{position.number} - {position.description}</div>
                  <div className="text-xs text-gray-400">
                    {position.description === 'Top Left' && 'Region 1'}
                    {position.description === 'Top Right' && 'Region 2'}
                    {position.description === 'Bottom Right' && 'Region 3'}
                    {position.description === 'Bottom Left' && 'Region 4'}
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

export default function RegionOrderSetup({
  regions,
  regionOrder,
  onOrderChange
}: RegionOrderSetupProps) {
    const positions = [
        { number: 1, description: 'Top Left' },
        { number: 2, description: 'Top Right' },
        { number: 3, description: 'Bottom Right' },
        { number: 4, description: 'Bottom Left' }
    ];

    const handlePositionSelect = (regionName: string, position: number) => {
        onOrderChange(regionName, position);
    };

    const handleClearPosition = (regionName: string) => {
        // Remove the region from regionOrder
        onOrderChange(regionName, 0); // You might need to update your parent component to handle 0 as "clear"
    };

    const getAvailablePositions = (currentRegion: string) => {
        const usedPositions = Object.entries(regionOrder)
        .filter(([region, _]) => region !== currentRegion)
        .map(([_, position]) => position);
        
        return positions.filter(pos => !usedPositions.includes(pos.number));
    };

    return (
        <div className="border-5 border-gray-600 rounded-lg p-6">
        <h3 className="text-2xl font-bold text-black mb-4">Region Bracket Positions</h3>
        <p className="text-gray-900 mb-6 text-sm">Assign each region to a position on the bracket</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {regions.map(regionName => {
            const currentPosition = regionOrder[regionName] || null;
            const availablePositions = [
                ...getAvailablePositions(regionName),
                ...(currentPosition ? [positions.find(p => p.number === currentPosition)!] : [])
            ].sort((a, b) => a.number - b.number);

            return (
                <div key={regionName} className="flex items-center space-x-4">
                <span className="text-black font-semibold w-24 shrink-0">{regionName}:</span>
                <div className="flex-1">
                    <PositionDropdown
                    regionName={regionName}
                    selectedPosition={currentPosition}
                    availablePositions={availablePositions}
                    onPositionSelect={(position) => handlePositionSelect(regionName, position)}
                    onClear={() => handleClearPosition(regionName)}
                    />
                </div>
                </div>
            );
            })}
        </div>

        {/* Visual Preview */}
            <div className="mt-6">
            <h4 className="text-lg font-semibold text-black mb-3">Bracket Preview</h4>
            <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                {/* Position 1 - Top Left */}
                {(() => {
                const position = positions.find(p => p.number === 1)!;
                const regionName = Object.keys(regionOrder).find(
                    name => regionOrder[name] === position.number
                );
                return (
                    <div
                    key={position.number}
                    className={`rounded p-3 text-center border-2 transition-colors ${
                        regionName 
                        ? 'bg-blue-400 border-blue-500 text-white' 
                        : 'bg-gray-700 border-gray-600 text-gray-300'
                    }`}
                    >
                    <div className="text-sm opacity-80">{position.description}</div>
                    <div className="font-semibold">
                        {regionName || 'Unassigned'}
                    </div>
                    </div>
                );
                })()}

                {/* Position 2 - Top Right */}
                {(() => {
                const position = positions.find(p => p.number === 2)!;
                const regionName = Object.keys(regionOrder).find(
                    name => regionOrder[name] === position.number
                );
                return (
                    <div
                    key={position.number}
                    className={`rounded p-3 text-center border-2 transition-colors ${
                        regionName 
                        ? 'bg-blue-400 border-blue-500 text-white' 
                        : 'bg-gray-700 border-gray-600 text-gray-300'
                    }`}
                    >
                    <div className="text-sm opacity-80">{position.description}</div>
                    <div className="font-semibold">
                        {regionName || 'Unassigned'}
                    </div>
                    </div>
                );
                })()}

                {/* Position 4 - Bottom Left */}
                {(() => {
                const position = positions.find(p => p.number === 4)!;
                const regionName = Object.keys(regionOrder).find(
                    name => regionOrder[name] === position.number
                );
                return (
                    <div
                    key={position.number}
                    className={`rounded p-3 text-center border-2 transition-colors ${
                        regionName 
                        ? 'bg-blue-400 border-blue-500 text-white' 
                        : 'bg-gray-700 border-gray-600 text-gray-300'
                    }`}
                    >
                    <div className="text-sm opacity-80">{position.description}</div>
                    <div className="font-semibold">
                        {regionName || 'Unassigned'}
                    </div>
                    </div>
                );
                })()}

                {/* Position 3 - Bottom Right */}
                {(() => {
                const position = positions.find(p => p.number === 3)!;
                const regionName = Object.keys(regionOrder).find(
                    name => regionOrder[name] === position.number
                );
                return (
                    <div
                    key={position.number}
                    className={`rounded p-3 text-center border-2 transition-colors ${
                        regionName 
                        ? 'bg-blue-400 border-blue-500 text-white' 
                        : 'bg-gray-700 border-gray-600 text-gray-300'
                    }`}
                    >
                    <div className="text-sm opacity-80">{position.description}</div>
                    <div className="font-semibold">
                        {regionName || 'Unassigned'}
                    </div>
                    </div>
                );
                })()}
            </div>
        </div>
    </div>
  );
}