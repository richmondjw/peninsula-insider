import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');

export const PATHS = {
  clientSecret: path.join(REPO_ROOT, 'ops', 'tokens', 'gsc-client-secret.json'),
  token: path.join(REPO_ROOT, 'ops', 'tokens', 'gsc-token.json'),
  property: path.join(REPO_ROOT, 'ops', 'tokens', 'gsc-property.json'),
  dataDir: path.join(REPO_ROOT, 'ops', 'data', 'seo'),
  logsDir: path.join(REPO_ROOT, 'ops', 'logs', 'seo'),
  reportsDir: path.join(REPO_ROOT, 'ops', 'reports', 'seo'),
  dailyLog: path.join(REPO_ROOT, 'ops', 'reports', 'seo', 'daily-log.md'),
};

export const SCOPES = ['https://www.googleapis.com/auth/webmasters.readonly'];

export const PRIORITY_URLS = [
  'https://peninsulainsider.com.au/',
  'https://peninsulainsider.com.au/eat/best-restaurants/',
  'https://peninsulainsider.com.au/wine/best-cellar-doors/',
  'https://peninsulainsider.com.au/explore/best-walks/',
  'https://peninsulainsider.com.au/stay/best-accommodation/',
  'https://peninsulainsider.com.au/journal/mornington-peninsula-day-trip/',
  'https://peninsulainsider.com.au/journal/mornington-peninsula-in-autumn/',
  'https://peninsulainsider.com.au/journal/mornington-peninsula-with-kids/',
  'https://peninsulainsider.com.au/journal/dog-friendly-mornington-peninsula/',
  'https://peninsulainsider.com.au/places/sorrento/',
  'https://peninsulainsider.com.au/places/red-hill/',
  'https://peninsulainsider.com.au/places/flinders/',
  'https://peninsulainsider.com.au/places/mornington/',
  'https://peninsulainsider.com.au/places/rye/',
];
