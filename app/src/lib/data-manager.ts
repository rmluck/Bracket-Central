// Manages saving and loading team data
import { promises as fs } from 'fs';
import path from 'path';
import { Team } from '@/types/models';

export class DataManager {
  private dataDir: string;

  constructor() {
    this.dataDir = path.join(process.cwd(), 'src', 'data');
  }

  async ensureDataDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
    } catch (error) {
      // Directory might already exist, ignore error
    }
  }

  async saveTeamsToFile(teams: Team[], sport: string): Promise<void> {
    await this.ensureDataDirectory();
    const filename = `${sport}_teams.json`;
    const filePath = path.join(this.dataDir, filename);
    
    try {
      await fs.writeFile(filePath, JSON.stringify(teams, null, 2));
      console.log(`${sport.toUpperCase()} teams data saved to ${filePath}`);
    } catch (error) {
      console.error(`Error saving ${sport} teams to file:`, error);
      throw error;
    }
  }

  async loadTeamsFromFile(sport: string): Promise<Team[]> {
    const filename = `${sport}_teams.json`;
    const filePath = path.join(this.dataDir, filename);
    
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      const teams = JSON.parse(data) as Team[];
      console.log(`Loaded ${teams.length} ${sport.toUpperCase()} teams from file`);
      return teams;
    } catch (error) {
      console.log(`${sport.toUpperCase()} teams file not found, will need to fetch from API`);
      return [];
    }
  }

  async getOrFetchTeams(sport: 'ncaamb' | 'nba' | 'nfl', forceRefresh = false): Promise<Team[]> {
    if (!forceRefresh) {
      const existingTeams = await this.loadTeamsFromFile(sport);
      if (existingTeams.length > 0) {
        return existingTeams;
      }
    }

    // Import fetcher dynamically to avoid issues in browser environment
    const { ESPNTeamFetcher } = await import('./espn-fetcher');
    const fetcher = new ESPNTeamFetcher();
    
    let teams: Team[];
    switch (sport) {
      case 'ncaamb':
        teams = await fetcher.fetchNCAAmBasketballTeams();
        break;
      default:
        throw new Error(`Unsupported sport: ${sport}`);
    }

    await this.saveTeamsToFile(teams, sport);
    return teams;
  }
}