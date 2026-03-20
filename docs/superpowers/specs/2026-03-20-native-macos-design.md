# Native macOS Architecture Spec for iCloud Browser

## 1. Overview
The goal of this initiative is to elevate the web-based Electron React application ("iCloud Browser") to a first-class macOS desktop citizen. This involves discarding generic web-UI paradigms in favor of native macOS visual language (Vibrancy, hidden titlebars, SF Symbols) and integrating deeply with the macOS operating system (QuickLook, Context Menus, Native Drag & Drop, Share Picker).

## 2. Visual Architecture

### 2.1 Window Controls & Toolbar
- **Frameless Window**: Set `titleBarStyle: 'hiddenInset'` in the Electron `BrowserWindow` to remove the default OS title bar while keeping the traffic light buttons (Close, Minimize, Zoom).
- **Draggable Toolbar**: Implement a custom React `<Toolbar />` component at the top of the app using `-webkit-app-region: drag`.
- **Segmented Controls**: The toolbar will house native-looking segmented controls for layout switching (e.g., Grid Size, Sort Order) and a search input.

### 2.2 Sidebar (Vibrancy & Typography)
- **Vibrancy**: Use Electron's `vibrancy: 'sidebar'` (or a CSS fallback using `backdrop-filter: blur()`) to create a translucent, frosted-glass effect behind the sidebar.
- **Aesthetics**: Adopt Apple's "Classic" style:
  - Clean San Francisco (SF Pro) typography.
  - Monochrome SVG icons mimicking SF Symbols (e.g., clock for "Recent", folders for Years/Months).
- **Selection State**: Sidebar selected items will use the standard macOS accent color background with white text, without sharp corners (rounded by 6px).

### 2.3 Media Grid
- Remove aggressive box-shadows.
- Use native macOS standard radii (`border-radius: 8px`) for photo cards.
- Selection rings will mimic the macOS Finder focus state (a distinct blue border).

## 3. Functional Integrations

### 3.1 Keyboard Navigation & QuickLook
- **Grid Navigation**: Implement keyboard event listeners (Up/Down/Left/Right) to navigate focus across the `<PhotoGrid />`. Focus management must smoothly scroll the grid.
- **QuickLook (Spacebar)**: Pressing the spacebar while a photo is focused will immediately open the `<PreviewModal />`, mimicking macOS `qlmanage` behavior.

### 3.2 Native Context Menus (Right-Click)
- Forward the `contextmenu` event from the React grid to the Electron Main process via IPC.
- Construct a native `Menu` object in Electron with the following actions:
  - `Reveal in Finder`: Triggers `shell.showItemInFolder(absolutePath)`.
  - `Copy Image`: Dumps the image buffer into `clipboard.writeImage()`.
  - `Share...`: Triggers the native macOS Share Picker (see 3.3).

### 3.3 System Integrations
- **Drag & Drop Out (Export)**:
  - Hook into the HTML5 `dragstart` event.
  - Call `event.preventDefault()` and trigger an IPC message `e.sender.startDrag({ file: absolutePath, icon: thumbnail })`. This allows tearing a photo out of the app straight onto the Mac Desktop.
- **macOS Share Picker**:
  - Implement a `ipcMain.handle('share-file')` handler.
  - Wait for Electron to support `SharingServicePicker` or fallback to executing `/usr/bin/osascript` or a lightweight native Node-API wrapper to invoke the macOS native Sharing UI.

### 3.4 Application Menu
- Rebuild the global application menu (`Menu.setApplicationMenu`) to provide standard shortcuts:
  - **File**: Close Window (Cmd+W)
  - **Edit**: Undo, Redo, Cut, Copy, Paste, Select All
  - **View**: Actual Size, Zoom In, Zoom Out, Enter Full Screen
  - **Window**: Minimize, Zoom

## 4. Implementation Phasing
1. **Phase 1: Layout & Aesthetics** - Update `BrowserWindow` config, build the Draggable Toolbar, and skin the Sidebar with Vibrancy.
2. **Phase 2: Keyboard & Focus** - Add arrow-key navigation and Spacebar QuickLook to the photo grid.
3. **Phase 3: Context & Menu** - Wire up the Electron Native Menus for right-click and the top App Menu.
4. **Phase 4: Deep OS hooks** - Implement Drag & Drop `startDrag` and research the Share Picker IPC bridge.
