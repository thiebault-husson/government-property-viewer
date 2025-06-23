# Government Property Viewer

A full-stack web application to view, analyze, and map government-owned and leased properties in the United States. Built with Next.js, TypeScript, Chakra UI, Firebase Firestore, and Google Maps API.

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
| **Firebase Firestore** | NoSQL database | [Firestore Docs](https://firebase.google.com/docs/firestore) |
| **Google Maps API** | Interactive mapping | [Maps JavaScript API](https://developers.google.com/maps/documentation/javascript) |
| **Recharts** | Data visualization | [Recharts Docs](https://recharts.org/en-US/examples) |
| **Vercel** | Deployment platform | [Vercel Docs](https://vercel.com/docs) |

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Firebase project with Firestore enabled
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
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Google Maps API Key
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

### 3. Firebase Setup

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Firestore Database
3. Create two collections:
   - `buildings` - for government-owned buildings
   - `leasedProperties` - for leased properties
4. Import your CSV data using the provided import script

### 4. Google Maps Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Enable the Maps JavaScript API
3. Create an API key and restrict it to your domain
4. Add the key to your environment variables

### 5. Data Import

Use the provided script to import your CSV data to Firestore:

```bash
npm run import-data
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
│   └── leased-dashboard/       # Leased properties dashboard
├── lib/                        # Core utilities and services
│   ├── firebase/              # Firebase configuration
│   ├── services/              # API services and data fetching
│   └── utils/                 # Helper functions
├── types/                      # TypeScript type definitions
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
- **Comprehensive Table**: Sortable lease information

## 🚀 Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Manual Deployment

```bash
npm run build
npm start
```

## 📊 Data Schema

### Owned Properties
- Location details (address, coordinates)
- Building specifications (square footage, construction date)
- Administrative info (congressional district, status)

### Leased Properties
- All owned property fields
- Lease-specific data (effective/expiration dates, lease numbers)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📜 Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # TypeScript type checking
npm run import-data  # Import CSV data to Firestore
```

## 🐛 Troubleshooting

### Common Issues

**Maps not loading**: Verify Google Maps API key and billing account
**Firebase connection errors**: Check project ID and API keys
**Build failures**: Run `npm run type-check` to identify TypeScript issues

### Performance Tips

- Properties are paginated to maintain performance
- Map markers use clustering for large datasets
- Charts limit data points for better rendering

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📞 Support

For support and questions:
- Create an issue in the GitHub repository
- Check the troubleshooting section above
- Review the documentation links provided 

## Database Structure

The application uses Firebase Firestore with two main collections:

- `buildings` - for government-owned buildings
- `leasedProperties` - for leased government properties 