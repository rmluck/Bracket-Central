import teamsData from '@/data/ncaamb_teams.json';
import { Team } from '@/types/models';

export function getAllTeams(): Team[] {
  return teamsData as Team[];
}

export function getTeamsByConference(): Record<string, Team[]> {
  const teams = getAllTeams();
  return teams.reduce((acc, team) => {
    const conference = team.conference || 'Unknown';
    if (!acc[conference]) {
      acc[conference] = [];
    }
    acc[conference].push(team);
    return acc;
  }, {} as Record<string, Team[]>);
}

export function searchTeams(query: string): Team[] {
  const teams = getAllTeams();
  const searchTerm = query.toLowerCase();
  
  return teams.filter(team => 
    team.displayName.toLowerCase().includes(searchTerm) ||
    team.name.toLowerCase().includes(searchTerm) ||
    team.location.toLowerCase().includes(searchTerm) ||
    team.abbreviation.toLowerCase().includes(searchTerm)
  );
}

export function getTeamById(id: string): Team | undefined {
  const teams = getAllTeams();
  return teams.find(team => team.id === id);
}