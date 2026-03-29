// Fetches teams from ESPN API for different sports
import { ESPNClient } from './espn-client';
import { ESPNTeamAPIResponse, Team } from '@/types/models';

export class ESPNTeamFetcher {
  private client: ESPNClient;

  constructor() {
    this.client = new ESPNClient();
  }

  async fetchNCAAmBasketballTeams(): Promise<Team[]> {
    const url = 'https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/teams?limit=400';
    return this.fetchTeamsFromURL(url, 'ncaamb');
  }

  private async fetchTeamsFromURL(url: string, sport: Team['sport']): Promise<Team[]> {
    try {
      console.log(`Fetching ${sport.toUpperCase()} teams from ESPN API...`);
      
      const apiResponse: ESPNTeamAPIResponse = await this.client.get(url);
      const teams: Team[] = [];

      // Navigate the ESPN API response structure
      for (const sportData of apiResponse.sports) {
        for (const league of sportData.leagues) {
          for (const teamData of league.teams) {
            const team = teamData.team;
            
            // Extract logo URLs
            let logoURL: string | undefined;
            let alternateLogoURL: string | undefined;
            
            if (team.logos && team.logos.length > 0) {
              logoURL = team.logos[0]?.href;
              if (team.logos.length > 1) {
                alternateLogoURL = team.logos[1]?.href;
              }
            }

            teams.push({
              id: team.id,
              abbreviation: team.abbreviation,
              displayName: team.displayName,
              location: team.location,
              name: team.name,
              conference: team.conference?.name || 'Unknown',
              division: team.division?.name,
              primaryColor: team.color,
              secondaryColor: team.alternateColor,
              logoURL,
              alternateLogoURL,
              sport,
            });
          }
        }
      }

      console.log(`Successfully fetched ${teams.length} ${sport.toUpperCase()} teams`);
      return teams;
    } catch (error) {
      console.error(`Error fetching ${sport.toUpperCase()} teams:`, error);
      throw error;
    }
  }
}