# Government Property Viewer

A full-stack web application to view, analyze, and map government-owned and leased properties in the United States. Built with Next.js, TypeScript, Chakra UI, Supabase, and Google Maps API.

## 🎯 Project Overview

This application provides an intuitive interface to explore government property data through:

- **All Properties**: Comprehensive table view with search, filtering, and CSV export
- **Interactive Map**: Visual representation of properties with detailed information cards
- **Owned Properties Dashboard**: Analytics and charts for government-owned buildings
- **Leased Properties Dashboard**: Lease management with Gantt charts and expiration tracking

## 🛠 Tech Stack

| Technology | Purpose | Documentation |
|------------|---------|---------------|
| **Next.js 14** | React framework with App Router | [Next.js Docs](https://nextjs.org/docs) |
| **TypeScript** | Type safety and better DX | [TypeScript Docs](https://www.typescriptlang.org/docs/) |
| **Chakra UI** | Modern component library | [Chakra UI Docs](https://chakra-ui.com/docs) |
| **Supabase** | PostgreSQL database with real-time features | [Supabase Docs](https://supabase.com/docs) |
| **Google Maps API** | Interactive mapping | [Maps JavaScript API](https://developers.google.com/maps/documentation/javascript) |
| **Recharts** | Data visualization | [Recharts Docs](https://recharts.org/en-US/examples) |
| **Vercel** | Deployment platform | [Vercel Docs](https://vercel.com/docs) |

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Supabase project with PostgreSQL database
- Google Maps JavaScript API key

### 1. Clone and Install

```bash
git clone <repository-url>
cd government-property-viewer
npm install
```

### 2. Environment Setup

Copy the example environment file and configure your API keys:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your actual values:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Google Maps API Key
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

### 3. Supabase Setup

1. Create a Supabase project at [Supabase Dashboard](https://supabase.com/dashboard)
2. Go to Settings > API to get your project URL and API keys
3. Create the database schema using the provided SQL file:

```bash
# Run the schema creation script in Supabase SQL Editor
cat supabase/schema.sql
```

4. Set up Row Level Security (RLS) policies if needed
5. Import your CSV data using the provided import script

### 4. Google Maps Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Enable the Maps JavaScript API
3. Create an API key and restrict it to your domain
4. Add the key to your environment variables

### 5. Data Import

Use the provided script to import your CSV data to Supabase:

```bash
npm run import-supabase
```

### 6. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## 📁 Project Structure

```
.
├── app/                          # Next.js App Router
│   ├── components/              # Shared UI components
│   │   └── layout/             # Layout components
│   ├── all-properties/         # All properties table page
│   ├── map/                    # Interactive map page
│   ├── owned-dashboard/        # Federal owned properties analytics
│   ├── leased-dashboard/       # Leased properties dashboard
│   └── api/                    # API routes for data fetching
├── lib/                        # Core utilities and services
│   ├── services/              # API services and data fetching
│   ├── supabaseClient.ts      # Supabase client configuration
│   └── utils/                 # Helper functions
├── types/                      # TypeScript type definitions
├── supabase/                   # Database schema and migrations
│   └── schema.sql             # Database table definitions
├── scripts/                    # Data import and utility scripts
│   └── import-to-supabase.ts  # CSV to Supabase import script
└── public/                     # Static assets
```

## 🔧 Key Features

### All Properties Page
- **Search & Filter**: Real-time search across property names, cities, and states
- **Sortable Columns**: Click headers to sort by any field
- **Pagination**: 25 properties per page with navigation
- **CSV Export**: Download filtered results

### Interactive Map
- **Property Markers**: Color-coded for owned (green) vs leased (blue)
- **Filter Controls**: Toggle between all, owned, or leased properties
- **Property Cards**: Click markers for detailed information
- **Street View Integration**: Direct links to Google Street View

### Owned Properties Dashboard
- **Key Statistics**: Total properties, square footage, averages
- **Construction Timeline**: Bar chart by decade
- **Space Utilization**: Pie chart of occupied vs available space
- **Building Highlights**: Oldest and newest properties

### Leased Properties Dashboard
- **Lease Analytics**: Duration charts and statistics
- **Expiration Tracking**: Upcoming lease renewals
- **Interactive Gantt Chart**: Visual timeline of lease periods
- **Comprehensive Table**: Sortable lease information with status filtering

## 🚀 Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
3. Deploy automatically on push to main branch

### Manual Deployment

```bash
npm run build
npm start
```

## 📊 Database Schema

### Buildings Table
- **Primary Key**: `id` (UUID)
- **Location**: `location_code`, `street_address`, `city`, `state`, `zip_code`
- **Coordinates**: `latitude`, `longitude`
- **Property Details**: `real_property_asset_name`, `installation_name`
- **Specifications**: `building_rentable_square_feet`, `available_square_feet`
- **Construction**: `construction_date`
- **Administrative**: `gsa_region`, `congressional_district`, `building_status`
- **Type**: `owned_or_leased` ('F' for Federal/Owned, 'L' for Leased)

### Leased Properties Table
- **Primary Key**: `id` (UUID)
- **Foreign Key**: `location_code` (references buildings)
- **All building fields** plus lease-specific data:
- **Lease Details**: `lease_number`, `federal_leased_code`
- **Dates**: `lease_effective_date`, `lease_expiration_date`
- **Administrative**: `congressional_district_representative`

### Database Features
- **Indexes**: Optimized for common queries (location, dates, status)
- **Row Level Security**: Configurable access policies
- **Real-time Updates**: Supabase real-time subscriptions
- **Full-text Search**: PostgreSQL search capabilities

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📜 Scripts

```bash
npm run dev             # Start development server
npm run build           # Build for production
npm run start           # Start production server
npm run lint            # Run ESLint
npm run type-check      # TypeScript type checking
npm run import-supabase # Import CSV data to Supabase
```

## 🐛 Troubleshooting

### Common Issues

**Maps not loading**: Verify Google Maps API key and billing account

**Supabase connection errors**: 
- Check project URL and API keys in `.env.local`
- Verify Supabase project is active and not paused
- Ensure RLS policies allow access if enabled

**Build failures**: Run `npm run type-check` to identify TypeScript issues

**Data import issues**:
- Verify CSV files are in the correct format
- Check Supabase service role key permissions
- Ensure database schema is properly created

### Performance Tips

- Properties are paginated to maintain performance
- Map markers use clustering for large datasets
- Charts limit data points for better rendering
- Supabase indexes optimize common query patterns

## 🔒 Security

- Environment variables are properly configured for client/server separation
- Supabase Row Level Security can be enabled for additional data protection
- API keys are restricted to specific domains in production
- Service role key is only used server-side for data imports

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📞 Support

For support and questions:
- Create an issue in the GitHub repository
- Check the troubleshooting section above
- Review the documentation links provided 

## 🗄️ Database Migration

This project has been migrated from Firebase Firestore to Supabase PostgreSQL for:
- **Better Performance**: Optimized queries with proper indexing
- **SQL Capabilities**: Complex joins and aggregations
- **Real-time Features**: Built-in subscriptions and live updates
- **Scalability**: PostgreSQL's proven scalability for large datasets
- **Developer Experience**: Familiar SQL syntax and powerful dashboard 