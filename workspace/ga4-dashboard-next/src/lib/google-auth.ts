import { JWT } from 'google-auth-library';
import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { google } from 'googleapis';

const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
// Vercel env vars might escape newlines or wrap in quotes
const privateKey = process.env.GOOGLE_PRIVATE_KEY
  ?.replace(/\\n/g, '\n')
  .replace(/^"|"$/g, '');

if (!clientEmail || !privateKey) {
  throw new Error('Missing GOOGLE_CLIENT_EMAIL or GOOGLE_PRIVATE_KEY environment variables');
}

const jwtClient = new JWT({
  email: clientEmail,
  key: privateKey,
  scopes: [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive",
    "https://www.googleapis.com/auth/analytics.readonly"
  ],
});

export const getGA4Client = () => {
  return new BetaAnalyticsDataClient({
    authClient: jwtClient,
  });
};

export const getSheetsClient = async () => {
  return google.sheets({ version: 'v4', auth: jwtClient });
};
