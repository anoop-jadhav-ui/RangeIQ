# RangeIQ

Smart range prediction for Electric Vehicles.

![RangeIQ](https://img.shields.io/badge/version-1.0.0-blue) ![Next.js](https://img.shields.io/badge/Next.js-14-black) ![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)

## Overview

RangeIQ is a Progressive Web App (PWA) that provides accurate range predictions for electric vehicles based on real-world conditions. It factors in battery state, weather, terrain, driving style, and more to give you confidence in your EV journey.

## Features

- **Smart Range Prediction** - Real-time range estimates based on current conditions
- **Route Planning** - Plan trips with energy consumption breakdown
- **Weather Integration** - Accounts for temperature and wind impact on range
- **OBD Connection** - Connect via Bluetooth OBD-II adapter for live vehicle data
- **Offline Support** - Works offline as a PWA
- **Dark Mode** - Full dark mode support

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Maps**: Leaflet / React-Leaflet
- **Charts**: Recharts
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/rangeiq.git
cd rangeiq

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:8080`

### Build for Production

```bash
npm run build
npm start
```

## Project Structure

```
├── src/
│   ├── app/                 # Next.js app router pages
│   │   ├── page.tsx         # Dashboard
│   │   ├── route/           # Route planning
│   │   └── settings/        # Settings page
│   ├── components/
│   │   ├── ui/              # Reusable UI components
│   │   └── dashboard/       # Dashboard-specific components
│   ├── services/
│   │   ├── api/             # API client
│   │   ├── obd/             # OBD Bluetooth connection
│   │   └── prediction/      # Range prediction logic
│   ├── store/               # Zustand state stores
│   └── types/               # TypeScript types
├── api/                     # Azure Functions backend
└── public/                  # Static assets
```

## Configuration

### Environment Variables

Create a `.env.local` file for local development:

```env
NEXT_PUBLIC_API_URL=http://localhost:7071/api
```

### Vehicle Settings

Configure your EV variant and battery settings in the Settings page for accurate predictions.

## OBD Connection

RangeIQ supports Bluetooth OBD-II adapters for live vehicle data:

1. Pair your OBD-II adapter with your device
2. Open RangeIQ and tap "Connect OBD" on the dashboard
3. Select your adapter from the list

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

ISC License

---

Built with ❤️ for EV enthusiasts
