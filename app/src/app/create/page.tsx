'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface BracketOption {
  id: string;
  name: string;
  description: string;
  teams: number;
}

const bracketOptions: BracketOption[] = [
  {
    id: 'march-madness-68',
    name: 'March Madness (68 Teams)',
    description: 'Full NCAA Tournament bracket',
    teams: 68
  }
];

export default function CreateBracketPage() {
  const router = useRouter();
  const [selectedOption, setSelectedOption] = useState<string>('');

  const handleContinue = () => {
    if (selectedOption) {
      router.push(`/bracket/setup?format=${selectedOption}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-200 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-black mb-4">Choose Your Bracket Format</h1>
          <p className="text-gray-900">Select the tournament format you want to create</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {bracketOptions.map((option) => (
            <div
              key={option.id}
              className={`p-6 rounded-lg border-2 cursor-pointer transition-all ${
                selectedOption === option.id
                  ? 'bg-blue-600 border-blue-600'
                  : 'bg-blue-400 border-blue-600 hover:bg-blue-500'
              }`}
              onClick={() => setSelectedOption(option.id)}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xl font-semibold text-white">{option.name}</h3>
                <span className="text-blue-600 font-bold">{option.teams} teams</span>
              </div>
              <p className="text-gray-200 text-sm mb-4">{option.description}</p>
            </div>
          ))}
        </div>

        <div className="flex justify-between">
          <Link
            href="/"
            className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            Back to Home
          </Link>
          
          <button
            onClick={handleContinue}
            disabled={!selectedOption}
            className={`px-6 py-3 rounded-lg transition-colors ${
              selectedOption
                ? 'bg-blue-400 hover:bg-blue-500 text-white cursor-pointer'
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            }`}
          >
            Continue to Team Selection
          </button>
        </div>
      </div>
    </div>
  );
}