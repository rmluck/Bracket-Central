// Script to fetch teams data for different sports
import { DataManager } from '../src/lib/data-manager';

async function main() {
  const dataManager = new DataManager();
  const sport = process.argv[2] as 'ncaamb' | 'nba' | 'nfl' || 'ncaamb';
  const forceRefresh = process.argv.includes('--force');

  try {
    console.log(`Fetching ${sport.toUpperCase()} teams data...`);
    
    const teams = await dataManager.getOrFetchTeams(sport, forceRefresh);    
  } catch (error) {
    console.error('Script failed:', error);
    process.exit(1);
  }
}

main();