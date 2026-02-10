// src/app/api/ga4/route.ts
import { NextResponse } from 'next/server';
import { getGA4Client, getSheetsClient } from '@/lib/google-auth';

// Helper to format date YYYY-MM-DD
const formatDate = (date: Date) => date.toISOString().split('T')[0];

async function getPropertyId(siteName?: string | null) {
  try {
    const sheets = await getSheetsClient();
    // Parse ID from URL
    const url = process.env.GOOGLE_SHEET_URL;
    let spreadsheetId = url?.match(/\/d\/(.*?)\//)?.[1];
    
    // If not matching pattern (e.g. at end of URL), try another way
    if (!spreadsheetId && url && url.includes('/d/')) {
        const parts = url.split('/d/');
        if (parts.length > 1) {
            spreadsheetId = parts[1].split('/')[0];
        }
    }
    
    if (!spreadsheetId) {
        console.warn('Invalid Spreadsheet URL:', url);
        throw new Error('Spreadsheet ID not found');
    }

    // First, get the sheet name (title) of the first sheet
    const metaResponse = await sheets.spreadsheets.get({
        spreadsheetId,
        includeGridData: false,
    });
    
    const firstSheetTitle = metaResponse.data.sheets?.[0]?.properties?.title;
    
    if (!firstSheetTitle) {
        throw new Error('No sheets found');
    }

    // Now fetch values from the first sheet
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${firstSheetTitle}!A:B`, // Use the actual sheet title
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) return null;

    // Header row usually exists, so skip index 0
    // rows: [['SiteName', 'PropertyID'], ['GrowUp', '12345'], ...]
    
    // If siteName is provided, find it. Otherwise return the first valid one.
    if (siteName) {
        const found = rows.find(row => row[0] === siteName);
        return found ? found[1] : null;
    } else {
        // Return first data row (index 1)
        // Ensure index 1 exists
        return rows.length > 1 ? rows[1][1] : null;
    }
  } catch (error: any) {
    console.error('Error fetching property ID from sheet:', error);
    // Return error message for debugging via API response
    throw error;
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let propertyId = searchParams.get('propertyId');
    
    // If no Property ID, try to fetch from Google Sheet
    if (!propertyId) {
        try {
            const fetchedId = await getPropertyId();
            if (fetchedId) {
                propertyId = fetchedId;
            } else {
                 return NextResponse.json({ error: 'Property ID not found in Sheet' }, { status: 400 });
            }
        } catch (sheetError: any) {
            return NextResponse.json({ error: `Sheet Error: ${sheetError.message}` }, { status: 500 });
        }
    }

    const client = getGA4Client();

    // Date ranges: Last 365 days vs Previous 365 days
    // We want 1 year trend.
    const today = new Date();
    const last365DaysStart = new Date(today);
    last365DaysStart.setDate(today.getDate() - 365);
    
    const prev365DaysEnd = new Date(last365DaysStart);
    prev365DaysEnd.setDate(last365DaysStart.getDate() - 1);
    
    const prev365DaysStart = new Date(prev365DaysEnd);
    prev365DaysStart.setDate(prev365DaysEnd.getDate() - 365);

    const dateRanges = [
      { startDate: formatDate(last365DaysStart), endDate: 'today' },
      { startDate: formatDate(prev365DaysStart), endDate: formatDate(prev365DaysEnd) }
    ];

    // 1. KPI Report (Overall totals for the year)
    const kpiRequest = {
      property: `properties/${propertyId}`,
      dateRanges,
      metrics: [
        { name: 'activeUsers' },
        { name: 'sessions' },
        { name: 'conversions' },
        { name: 'averageSessionDuration' }
      ]
    };

    // 2. Trend Report (Monthly active users for last 365 days)
    const trendRequest = {
      property: `properties/${propertyId}`,
      dateRanges: [dateRanges[0]],
      dimensions: [{ name: 'yearMonth' }], 
      metrics: [{ name: 'activeUsers' }, { name: 'sessions' }],
      orderBys: [{ dimension: { dimensionName: 'yearMonth' } }]
    };

    // 3. Device Report (Yearly aggregation)
    const deviceRequest = {
      property: `properties/${propertyId}`,
      dateRanges: [dateRanges[0]],
      dimensions: [{ name: 'deviceCategory' }],
      metrics: [{ name: 'activeUsers' }]
    };

    const [kpiResponse, trendResponse, deviceResponse] = await Promise.all([
      client.runReport(kpiRequest),
      client.runReport(trendRequest),
      client.runReport(deviceRequest)
    ]);

    // Process KPI Data
    const currentRows = kpiResponse[0].rows?.[0];
    const prevRows = kpiResponse[0].rows?.[1]; // This might be undefined if not enough history

    const kpiData = {
      users: {
        value: currentRows?.metricValues?.[0]?.value || '0',
        prev: prevRows?.metricValues?.[0]?.value || '0'
      },
      sessions: {
        value: currentRows?.metricValues?.[1]?.value || '0',
        prev: prevRows?.metricValues?.[1]?.value || '0'
      },
      conversions: {
        value: currentRows?.metricValues?.[2]?.value || '0',
        prev: prevRows?.metricValues?.[2]?.value || '0'
      },
      avgDuration: {
        value: currentRows?.metricValues?.[3]?.value || '0',
        prev: prevRows?.metricValues?.[3]?.value || '0'
      }
    };

    // Process Trend Data
    const trendData = trendResponse[0].rows?.map(row => {
      const ym = row.dimensionValues?.[0]?.value || ''; // YYYYMM
      // Format to YYYY/MM
      const name = ym.length === 6 ? `${ym.substring(0, 4)}/${ym.substring(4, 6)}` : ym;
      return {
        name,
        users: parseInt(row.metricValues?.[0]?.value || '0'),
        sessions: parseInt(row.metricValues?.[1]?.value || '0')
      };
    }) || [];

    // Process Device Data
    const deviceData = deviceResponse[0].rows?.map((row, index) => ({
      name: row.dimensionValues?.[0]?.value || 'Unknown',
      value: parseInt(row.metricValues?.[0]?.value || '0'),
      color: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'][index % 4] // Blue, Green, Amber, Red
    })) || [];

    return NextResponse.json({
      kpi: kpiData,
      trend: trendData,
      device: deviceData,
      propertyId // Return ID for verification
    });

  } catch (error: any) {
    console.error('GA4 API Error:', error);
    // Return detailed error message if possible to debug via UI console
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
