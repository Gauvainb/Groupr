# Groupr

A mobile app for sport shooters — iOS & Android — built with React Native (Expo).

## Features

- **Session logging** — date, discipline, distance (m/yd), shot count, score, ammo description, notes
- **Group analysis** — log group sizes in mm per session, automatic MOA calculation at shooting distance
- **Equipment tracker** — manage your firearms (type, caliber, optic) and link them to sessions
- **Performance charts** — score % trend and average group size trend across sessions
- **Offline-first** — all data stored locally on device via SQLite (no account required)

## Tech stack

| Layer | Choice |
|---|---|
| Framework | React Native + Expo SDK 52 |
| Navigation | React Navigation v6 (bottom tabs + native stack) |
| Database | expo-sqlite v15 (WAL mode, async API) |
| Charts | react-native-chart-kit + react-native-svg |
| UI | Dark tactical theme (#0D1117 base, amber accent) |
| Language | TypeScript |

## Getting started

```bash
# 1. Install dependencies
npm install

# 2. Sync Expo-compatible native package versions
npx expo install

# 3. Start dev server
npx expo start

# Run on a device or simulator
npx expo start --ios      # requires macOS + Xcode
npx expo start --android  # requires Android Studio / emulator
```

Scan the QR code with **Expo Go** (iOS / Android) to run instantly on your phone.

## Project structure

```
App.tsx                   # Entry: SQLiteProvider + NavigationContainer
src/
  constants/theme.ts      # Colours, spacing, radius tokens
  types/index.ts          # Shared TypeScript types
  db/database.ts          # SQLite schema init + all CRUD helpers
  navigation/
    AppNavigator.tsx      # Bottom tabs + nested stacks
  screens/
    HomeScreen.tsx        # Dashboard with key stats
    SessionsScreen.tsx    # Session list
    AddSessionScreen.tsx  # New session form
    SessionDetailScreen.tsx # Session info + group entry + MOA
    AnalysisScreen.tsx    # Line charts (score & group trends)
    EquipmentScreen.tsx   # Firearm list
    AddEquipmentScreen.tsx # Add firearm form
```

## Web preview

A browser-based UI for testing the app without a device or simulator lives in `web-preview/`.

```bash
cd web-preview
npm install
npm run dev
```

The dev server binds to `0.0.0.0:5173`. Open the **Network** URL shown in the terminal (e.g. `http://<your-machine-ip>:5173`) — not the `localhost` one, which only works when your browser runs on the same machine as the server.

## MOA calculation

`MOA = sizeMm / (distanceMeters × 0.02908)`

Where 1 MOA ≈ 29.08 mm at 100 m. Yards are converted to metres before the calculation.
