import { useState, useRef } from 'react';
import html2canvas from 'html2canvas-pro';
import { BracketSlot, FirstFourMatchup, Team } from '@/types/models';

interface BracketSetupExportModalProps {
  regions: Record<string, BracketSlot[]>;
  firstFourMatchups: FirstFourMatchup[];
  firstFourOut: (Team | undefined)[];
  nextFourOut: (Team | undefined)[];
  regionOrder: Record<string, number>;
  onClose: () => void;
}

export default function BracketSetupExportModal({
  regions,
  firstFourMatchups,
  firstFourOut,
  nextFourOut,
  regionOrder,
  onClose
}: BracketSetupExportModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  // Get ordered regions based on regionOrder
  const getOrderedRegions = () => {
    const orderedRegions: { name: string; position: number }[] = [];
    Object.entries(regionOrder).forEach(([regionName, position]) => {
      orderedRegions.push({ name: regionName, position });
    });
    return orderedRegions.sort((a, b) => a.position - b.position);
  };

  const generateImage = async () => {
    if (!exportRef.current) return;

    setIsGenerating(true);
    try {
      const canvas = await html2canvas(exportRef.current, {
        backgroundColor: '#f3f4f6',
        scale: 4,
        width: 800,
        height: 1200,
        useCORS: true,
        allowTaint: true
      });
      
      const imageDataUrl = canvas.toDataURL('image/png');
      setGeneratedImage(imageDataUrl);
    } catch (error) {
      console.error('Error generating image:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadImage = () => {
    if (!generatedImage) return;

    const link = document.createElement('a');
    // Use current date and time for unique filename
    const timestamp = new Date().toISOString().replace(/[:.-]/g, '');
    link.download = `bracket-${timestamp}.png`;
    link.href = generatedImage;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyToClipboard = async () => {
    if (!generatedImage) return;

    try {
      const response = await fetch(generatedImage);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob })
      ]);
      alert('Image copied to clipboard!');
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      alert('Failed to copy to clipboard');
    }
  };


// Replace the renderCompactRegion function in BracketSetupExportModal.tsx:

const renderCompactRegion = (regionName: string, slots: BracketSlot[]) => {
  // Helper function to convert hex to RGB
  const hexToRgb = (hex: string) => {
    const cleanHex = hex.replace('#', '');
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);
    return { r, g, b };
  };

  return (
    <div className="rounded-lg">
      <h3 className="text-lg font-bold text-center mb-3 text-black">{regionName}</h3>
      <div className="grid grid-cols-1 gap-1">
        {slots.map(slot => {
          // Check if this slot is linked to a First Four matchup
          const linkedMatchup = firstFourMatchups.find(m => m.assignedSlotId === slot.id);
          
          if (linkedMatchup) {
            // Show First Four matchup with split design
            if (linkedMatchup.team1 && linkedMatchup.team2) {
              // Both teams assigned - show split design
              return (
                <div key={slot.id} className="relative overflow-hidden rounded">
                  <div className="flex">
                    {/* Left team */}
                    <div 
                      className="w-1/2 p-2 flex items-center justify-center border-2"
                      style={{
                        backgroundColor: linkedMatchup.team1.primaryColor 
                          ? `rgba(${hexToRgb(linkedMatchup.team1.primaryColor).r}, ${hexToRgb(linkedMatchup.team1.primaryColor).g}, ${hexToRgb(linkedMatchup.team1.primaryColor).b}, 0.7)`
                          : 'rgba(107, 114, 128, 0.7)',
                        borderColor: linkedMatchup.team1.primaryColor ? `#${linkedMatchup.team1.primaryColor}` : 'rgba(107, 114, 128, 0.7)'
                      }}
                    >
                      <span className="font-bold text-white drop-shadow-sm text-xs mr-2">{slot.position}</span>
                      <img 
                        src={linkedMatchup.team1.alternateLogoURL} 
                        alt={linkedMatchup.team1.name} 
                        className="w-6 h-6"
                      />
                    </div>
                    
                    {/* Right team */}
                    <div 
                      className="w-1/2 p-2 flex items-center justify-center border-2"
                      style={{
                        backgroundColor: linkedMatchup.team2.primaryColor 
                          ? `rgba(${hexToRgb(linkedMatchup.team2.primaryColor).r}, ${hexToRgb(linkedMatchup.team2.primaryColor).g}, ${hexToRgb(linkedMatchup.team2.primaryColor).b}, 0.7)`
                          : 'rgba(107, 114, 128, 0.7)',
                        borderColor: linkedMatchup.team2.primaryColor ? `#${linkedMatchup.team2.primaryColor}` : 'rgba(107, 114, 128, 0.7)'
                      }}
                    >
                      <span className="font-bold text-white drop-shadow-sm text-xs mr-2">{slot.position}</span>
                      <img 
                        src={linkedMatchup.team2.alternateLogoURL} 
                        alt={linkedMatchup.team2.name} 
                        className="w-6 h-6"
                      />
                    </div>
                  </div>
                </div>
              );
            } else {
              // First Four assigned but teams not selected yet
              return (
                <div key={slot.id} className="flex items-center justify-center p-3 bg-orange-100 border border-orange-400 rounded text-xs">
                  <span className="font-bold text-orange-800">{slot.position}</span>
                  <span className="ml-1 text-orange-600">FF</span>
                </div>
              );
            }
          } else if (slot.team) {
            // Show team logo and seed with team's primary color
            const teamStyle = slot.team.primaryColor ? (() => {
              const rgb = hexToRgb(slot.team.primaryColor);
              return {
                backgroundColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.7)`,
                borderColor: `#${slot.team.primaryColor}`,
              };
            })() : {
              backgroundColor: 'rgb(239, 246, 255)', // fallback to blue-50
              borderColor: 'rgb(147, 197, 253)', // fallback to blue-300
            };

            return (
              <div 
                key={slot.id} 
                className="flex items-center justify-center p-1 border-2 rounded text-xs"
                style={teamStyle}
              >
                <span className="font-bold text-white drop-shadow-sm mr-2">{slot.position}</span>
                <img 
                  src={slot.team.alternateLogoURL} 
                  alt={slot.team.location} 
                  className="w-8 h-8"
                />
              </div>
            );
          } else {
            // Empty slot
            return (
              <div key={slot.id} className="flex items-center justify-center p-1 bg-gray-100 border border-gray-300 rounded">
                <span className="font-bold text-gray-500 text-xs">{slot.position}</span>
              </div>
            );
          }
        })}
      </div>
    </div>
  );
};

  // Replace the renderTeamsOutSection function in BracketSetupExportModal.tsx:

const renderTeamsOutSection = () => {
  const hasTeamsOut = firstFourOut.some(team => team) || nextFourOut.some(team => team);
  if (!hasTeamsOut) return null;

  // Helper function to convert hex to RGB
  const hexToRgb = (hex: string) => {
    const cleanHex = hex.replace('#', '');
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);
    return { r, g, b };
  };

  const renderTeamSlot = (team: Team | undefined) => {
    if (!team) return null;

    const teamStyle = team.primaryColor ? (() => {
      const rgb = hexToRgb(team.primaryColor);
      return {
        backgroundColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.7)`,
        borderColor: `#${team.primaryColor}`,
      };
    })() : {
      backgroundColor: 'rgb(239, 246, 255)', // fallback to blue-50
      borderColor: 'rgb(147, 197, 253)', // fallback to blue-300
    };

    return (
      <div 
        className="flex items-center justify-center p-2 border-2 rounded text-xs mb-1"
        style={teamStyle}
      >
        <img 
          src={team.alternateLogoURL || team.logoURL} 
          alt={team.name} 
          className="w-6 h-6"
        />
      </div>
    );
  };

  return (
    <div className="rounded-lg px-12">
      <div className="grid grid-cols-2 gap-4">
        {/* First Four Out Column */}
        <div>
          <div className="text-xs font-semibold text-gray-700 text-center mb-2">First Four Out</div>
          <div className="space-y-1">
            {firstFourOut.map((team, index) => (
              <div key={index}>
                {renderTeamSlot(team)}
              </div>
            ))}
          </div>
        </div>

        {/* Next Four Out Column */}
        <div>
          <div className="text-xs font-semibold text-gray-700 text-center mb-2">Next Four Out</div>
          <div className="space-y-1">
            {nextFourOut.map((team, index) => (
              <div key={index}>
                {renderTeamSlot(team)}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-[full] h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-black">Export Bracket</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl cursor-pointer"
            >
              ×
            </button>
          </div>

          {!generatedImage ? (
            <>
              {/* Preview of what will be exported */}
              <div 
                ref={exportRef}
                className="bg-gray-100 p-6 mx-auto"
                style={{ width: '800px', minHeight: '1175px' }}
              >
                <div className="text-center mb-3">
                  <h1 className="text-2xl font-bold text-black mb-2">March Madness Bracket</h1>
                  <div className="text-sm text-gray-600">{new Date().toLocaleDateString()}</div>
                </div>

                {/* Regions Grid */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                  {getOrderedRegions().map(({ name, position }) => (
                    <div key={name}>
                      {renderCompactRegion(name, regions[name] || [])}
                    </div>
                  ))}
                </div>

                {/* Teams Out Section */}
                <div className="mt-4">
                  {renderTeamsOutSection()}
                </div>
              </div>

              <div className="mt-6 text-center">
                <button
                  onClick={generateImage}
                  disabled={isGenerating}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors cursor-pointer"
                >
                  {isGenerating ? 'Generating Image...' : 'Generate Image'}
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Generated Image Display */}
              <div className="text-center mb-6">
                <img 
                  src={generatedImage} 
                  alt="Exported Bracket" 
                  className="max-w-full h-auto mx-auto border border-gray-300 rounded"
                  style={{ maxHeight: '600px' }}
                />
              </div>

              <div className="flex justify-center space-x-4">
                <button
                  onClick={downloadImage}
                  className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors cursor-pointer"
                >
                  Download Image
                </button>
                <button
                  onClick={copyToClipboard}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors cursor-pointer"
                >
                  Copy to Clipboard
                </button>
                <button
                  onClick={() => {
                    setGeneratedImage(null);
                  }}
                  className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors cursor-pointer"
                >
                  Edit Preview
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}