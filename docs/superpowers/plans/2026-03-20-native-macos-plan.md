# Native macOS Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the iCloud Browser into a native-feeling macOS application by implementing window vibrancy, native context menus, drag-and-drop, and keyboard navigation.

**Architecture:** Electron main process configuration updates for window framing and IPC handlers for native menus/drag operations. React renderer updates for layout (Toolbar, Sidebar) and keyboard event listening.

**Tech Stack:** Electron (BrowserWindow, Menu, ipcMain), React 18, Vite.

---

### Task 1: Window Framing & Draggable Toolbar

**Files:**
- Modify: `src-electron/main/index.cjs`
- Modify: `src/styles.css`

- [ ] **Step 1: Configure Electron BrowserWindow**
In `src-electron/main/index.cjs` around `createWindow`:
```javascript
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.cjs'),
      contextIsolation: true,
      nodeIntegration: false
    },
    titleBarStyle: 'hiddenInset',
    vibrancy: 'sidebar',
    visualEffectState: 'active',
    trafficLightPosition: { x: 20, y: 18 },
    show: false,
```

- [ ] **Step 2: Add draggable header CSS**
In `src/styles.css`, update `.app-header` to make it draggable:
```css
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px 12px 80px; /* Left padding for traffic lights */
  background-color: transparent;
  border-bottom: 1px solid var(--border-color);
  -webkit-app-region: drag; /* Make toolbar draggable */
  height: 52px;
}
.app-header button {
  -webkit-app-region: no-drag;
}
```

- [ ] **Step 3: Run dev server to verify**
Run: `npm run dev`
Expected: The titlebar should be hidden, traffic lights visible, and the top header region should be draggable.

- [ ] **Step 4: Commit**
```bash
git add src-electron/main/index.cjs src/styles.css
git commit -m "feat(ui): implement frameless window and draggable toolbar"
```

### Task 2: macOS Context Menus & App Menu

**Files:**
- Modify: `src-electron/main/index.cjs`
- Modify: `src/preload/index.cjs`
- Modify: `src/renderer/components/PhotoGrid.tsx` (or whatever renders the photo card)

- [ ] **Step 1: Setup IPC handlers and Application Menu**
In `src-electron/main/index.cjs`, expose a context menu IPC handler:
```javascript
const { Menu, shell, clipboard } = require('electron');

ipcMain.on('show-context-menu', (event, filePath) => {
  const template = [
    {
      label: 'Reveal in Finder',
      click: () => { shell.showItemInFolder(filePath); }
    },
    { type: 'separator' },
    { role: 'shareMenu' } // macOS 10.15+ share menu
  ];
  const menu = Menu.buildFromTemplate(template);
  menu.popup({ window: BrowserWindow.fromWebContents(event.sender) });
});
```

- [ ] **Step 2: Add preload bridge**
In `src/preload/index.cjs` (assuming it exists), add:
```javascript
  showContextMenu: (filePath) => ipcRenderer.send('show-context-menu', filePath),
```

- [ ] **Step 3: Trigger context menu from React**
In `src/renderer/App.tsx` or `PhotoGrid` component, add `onContextMenu` to the photo card:
```typescript
onContextMenu={(e) => {
  e.preventDefault();
  window.electronAPI.showContextMenu(photo.path);
}}
```

- [ ] **Step 4: Verify Context Menu**
Run: `npm run dev`
Expected: Right clicking a photo shows a native macOS context menu with "Reveal in Finder".

- [ ] **Step 5: Commit**
```bash
git commit -am "feat(os): implement native macOS context menus"
```

### Task 3: Native Drag and Drop Export

**Files:**
- Modify: `src-electron/main/index.cjs`
- Modify: `src/preload/index.cjs`
- Modify: `src/renderer/App.tsx` (or photo card)

- [ ] **Step 1: Add drag IPC handler**
In `src-electron/main/index.cjs`:
```javascript
ipcMain.on('start-drag', (event, filePath) => {
  const iconName = path.join(__dirname, '../../build/icon.png');
  event.sender.startDrag({
    file: filePath,
    icon: iconName
  });
});
```

- [ ] **Step 2: Update preload script**
Add to `src/preload/index.cjs`:
```javascript
  startDrag: (filePath) => ipcRenderer.send('start-drag', filePath),
```

- [ ] **Step 3: Bind drag event in React**
On the photo card element in the renderer:
```typescript
draggable={true}
onDragStart={(e) => {
  e.preventDefault();
  window.electronAPI.startDrag(photo.path);
}}
```

- [ ] **Step 4: Verify**
Run: `npm run dev`. Click and drag a photo onto the desktop. It should copy the original file to the desktop natively.

- [ ] **Step 5: Commit**
```bash
git commit -am "feat(os): implement native drag and drop export"
```

### Task 4: Keyboard Navigation & QuickLook

**Files:**
- Modify: `src/renderer/App.tsx`

- [ ] **Step 1: Write keyboard event listener**
Add a `useEffect` inside `App.tsx` or `PhotoGrid.tsx` to listen for global keydown:
```typescript
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Basic implementation for quicklook preview toggle
      if (e.code === 'Space' && photos.length > 0) {
        e.preventDefault();
        if (previewPhoto) {
          handleClosePreview();
        } else {
          // Open first or currently focused
          handlePhotoClick(photos[0], 0);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [photos, previewPhoto]);
```

- [ ] **Step 2: Verify**
Press Spacebar when photos are loaded. The preview modal should open/close.

- [ ] **Step 3: Commit**
```bash
git commit -am "feat(ui): add spacebar QuickLook toggle"
```
