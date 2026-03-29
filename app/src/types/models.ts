// ESPN API response types
export interface ESPNTeamAPIResponse {
  sports: {
    leagues: {
      teams: {
        team: {
          id: string;
          abbreviation: string;
          displayName: string;
          location: string;
          name: string;
          conference: {
            name: string;
          };
          division?: {
            name: string;
          };
          color: string;
          alternateColor: string;
          logos: {
            href: string;
            rel: string[];
          }[];
        };
      }[];
    }[];
  }[];
}

export interface Team {
  id: string;
  abbreviation: string;
  displayName: string;
  fullName: string;
  location: string;
  name: string;
  conference: string;
  division?: string;
  primaryColor: string;
  secondaryColor: string;
  logoURL?: string;
  alternateLogoURL?: string;
  sport: 'ncaamb'; // Add other sports as needed
}

export interface BracketTeam extends Team {
  seed: number;
}

export interface BracketSlot {
  id: string;
  team?: BracketTeam;
  region: string;
  round: number;
  position: number;
  isFirstFour?: boolean; // Filled by First Four winners in March Madness
  nextSlotId?: string; // ID of the next slot in the bracket (for winners)
}

export interface FirstFourMatchup {
  id: string;
  seed: number; // Typically 11 or 16
  team1?: BracketTeam;
  team2?: BracketTeam;
  assignedRegion: string;
  assignedSlotId: string; // The slot in the main bracket where the winner will be placed
}

export interface Region {
  id: string;
  name: string;
  bracketSlots: BracketSlot[];
}

export interface BracketFormat {
  id: string;
  name: string;
  totalTeams: number;
  regions: string[];
  teamsPerRegion: number;
  rounds: number;
}

export const BRACKET_FORMATS: Record<string, BracketFormat> = {
  'march-madness-68': {
    id: 'march-madness-68',
    name: 'March Madness (68 Teams)',
    totalTeams: 68,
    regions: ['East', 'West', 'South', 'Midwest'],
    teamsPerRegion: 16,
    rounds: 7
  }
}