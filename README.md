# iCloud Photo Browser

A fast, lightweight, and native-feeling desktop application built with Electron, React, and Vite for browsing your local iCloud Photo Library backups.

## Features

- **Blazing Fast Native Thumbnails**: Leverages a custom C++ native macOS addon (`macos-thumbnail`) using `ImageIO` and `AVFoundation` to generate thumbnails for `.HEIC` images and `.MOV`/`.MP4` videos instantly, without the overhead of heavy Node.js image processing libraries like sharp.
- **Native Video Playback**: Supports playing macOS-native HEVC/H.265 encoded `.mov` files directly in the browser through precise byte-range HTTP streaming.
- **Large Library Support**: Built on top of a SQLite metadata database (`better-sqlite3`) allowing instantaneous sorting and pagination for libraries with tens of thousands of photos.
- **Modern UI**: A sleek, dark-mode native aesthetics UI built with React, Vite, and CSS variables.

## Getting Started

### Prerequisites

- **macOS** (Required for the native thumbnail features leveraging CoreGraphics/AVFoundation)
- **Node.js** v18+
- Apple Xcode Command Line Tools (for `node-gyp` native module compilation)

### Installation

1. Clone the repository
   ```bash
   git clone https://github.com/jaff521/icloud-browser.git
   cd icloud-browser
   ```

2. Install dependencies
   ```bash
   npm install
   
   # Build the native macOS thumbnail generator addon
   cd native-thumbnail
   npm install
   npx node-gyp rebuild
   cd ..
   ```

3. Run in development mode
   ```bash
   npm run dev
   ```

## Packaging for Distribution

You can package the app into a macOS `.dmg` file for sharing and installation.

```bash
npm run build
```

This will run TypeScript checks, build the Vite frontend, compile the native addon, and package everything via `electron-builder` (with ASAR disabled to ensure native C++ libraries link perfectly).

The packaged `.dmg` installer will be available in the `release/` folder.

## Technologies Used

- **Frontend**: React 18, Vite, TypeScript
- **Backend/Desktop**: Electron, Node.js
- **Database**: better-sqlite3
- **Native Modules**: node-addon-api (C++ / Objective-C++ with Foundation, AVFoundation, ImageIO macOS frameworks)

## License
MIT
