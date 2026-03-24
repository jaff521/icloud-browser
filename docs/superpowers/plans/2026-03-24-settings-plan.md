# Settings & Theme Configuration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a user settings interface allowing theme selection (Light/Dark/System) and library directory management, persisting across app restarts.

## Architectural Changes

1. **Persistent Configuration (`Main Process`)**
   - We will store user preferences (e.g., `theme`: 'system' | 'light' | 'dark', and `rootPath`) in `<AppData>/config.json`.
   - Expose IPC handlers: `get-config`, `save-config`, and `set-theme`.
   - Update `app.whenReady()` to immediately read the saved theme and apply it to `nativeTheme.themeSource`.

2. **Dynamic CSS Theming (`Renderer`)**
   - Refactor `src/styles.css` so that the default `:root` represents Light Mode, and an `@media (prefers-color-scheme: dark)` override handles Dark Mode.
   - Because we change `nativeTheme.themeSource` in the main process, Chromium's `prefers-color-scheme` media query will automatically toggle, making React/CSS updates instantaneous without JS re-renders.
   - The macOS window `vibrancy: 'sidebar'` also automatically respects `nativeTheme`.

3. **Settings Modal (`Renderer`)**
   - Build a `SettingsModal.tsx` React component.
   - Triggered by a gear icon (`⚙️`) in the app header (replacing the current bulky "Select Directory" button).
   - Modal contains tabs/sections for "Appearance" and "Library".

---

## Task Breakdown

### Task 1: Main Process Configuration & IPC
- **File**: `src-electron/main/index.cjs`, `src-electron/preload/index.cjs`
- **Actions**:
  - Add `const CONFIG_FILE = path.join(app.getPath('userData'), 'config.json')`.
  - Implement `loadConfig()`, `saveConfig()`.
  - Add `ipcMain.handle('get-config')` and `ipcMain.on('save-config')`.
  - Add `ipcMain.on('set-theme', (e, theme) => { nativeTheme.themeSource = theme; saveConfig({theme}) })`.
  - In `app.whenReady()`, load the config and set `nativeTheme.themeSource`.
  - Update `preload/index.cjs` to expose these endpoints.

### Task 2: Refactor CSS for Light/Dark Mode
- **File**: `src/styles.css`
- **Actions**:
  - Define complete Light Mode color tokens in `:root` (e.g., `--bg-primary: #ffffff`, `--text-primary: #333333`, `--card-bg: #f5f5f7`).
  - Move existing dark mode colors into `@media (prefers-color-scheme: dark) { :root { ... } }`.
  - Adjust `.photo-card` and hover attributes to look good in both modes.

### Task 3: Build SettingsModal Component
- **File**: `src/components/SettingsModal.tsx` (NEW)
- **Actions**:
  - Build a modal overlay.
  - Add a select dropdown for Theme: `System Default`, `Light`, `Dark`.
  - Add a dedicated section showing the current `rootPath` and a `[Change...]` button calling `scanDirectory`.

### Task 4: Integrate Settings UI in App
- **File**: `src/renderer/App.tsx`
- **Actions**:
  - Add state `isSettingsOpen`.
  - Replace the large `<button className="select-btn">` in the `<header>` with an elegant macOS-style gear/settings icon.
  - Connect the new `SettingsModal` to the app.
  - On mount, load config via `electronAPI.getConfig()` to initialize React state (especially ensuring the correct dropdown value is set in Settings).

---

## Verification Plan
**Automated checks**:
- N/A (Standard Electron manual launch needed).

**Manual testing**:
1. Run `npm run dev`.
2. Click the new gear icon to open Settings.
3. Change the theme to **Light**. Notice the CSS and the macOS traffic lights/sidebar instantly turn white/light.
4. Change the theme to **Dark**. Notice they turn black.
5. Close the app and re-open it. Verify the chosen theme is remembered before the window vividly renders.
6. Verify the Directory change flow updates the timeline.
