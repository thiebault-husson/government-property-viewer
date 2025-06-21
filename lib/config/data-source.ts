// Data source configuration - change this single line to switch between Firebase and CSV
export const DATA_SOURCE: 'firebase' | 'csv' = 'csv';

// You can also use environment variables for this
// export const DATA_SOURCE = (process.env.NEXT_PUBLIC_DATA_SOURCE as 'firebase' | 'csv') || 'csv'; 