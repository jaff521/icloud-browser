# Multi-Select Feature Design Spec

## 1. Overview
The user requested the ability to select multiple photos for batch copying. To maintain the "Native macOS" feel, we will implement standard desktop selection semantics (Click, Cmd+Click, Shift+Click) and update the drag-and-drop and context menus to handle multiple files.

## 2. UI/UX Changes (React)

### 2.1 Selection State & Click Semantics
Currently, a single click opens the full-screen Preview Modal. We will update this to match macOS Apple Photos:
- **Single Click**: Selects the photo (deselects others unless Cmd/Ctrl is held).
- **Double Click**: Opens the full-screen Preview Modal for that photo.
- **Cmd/Ctrl + Click**: Toggles the selection of a specific photo.
- **Shift + Click**: Selects a continuous range of photos between the last clicked photo and the current one.
- **Clicking Background**: Deselects all photos.

### 2.2 Visual Indicators
- Selected `<PhotoCard />` elements will have a strong blue border (`outline: 3px solid var(--accent-color)`).
- A small blue checkmark circle badge will appear in the bottom-right corner (similar to iOS/macOS selection).

## 3. Batch Operations (IPC & Native)

### 3.1 Batch Drag and Drop
- Electron's `event.sender.startDrag()` only technically supports a single `file` string in its native API. However, Electron 15+ allows multiple files using the `files: string[]` property in `startDrag(item)`.
- When a user starts dragging a photo:
  - If the dragged photo is currently selected, we will pass **all selected photo paths** to `startDrag({ files: selectedPaths, icon: ... })`.
  - If the dragged photo is *not* selected, it drags just that one photo.

### 3.2 Batch Context Menu (Right Click)
- The right-click menu will dynamically update its text based on the selection count.
- e.g., "Copy 5 Images", "Reveal 5 Files in Finder".
- **Implementation**:
  - `ipcMain.on('show-context-menu', (event, filePaths: string[]) => { ... })`
  - The `Copy Image` action will loop through `filePaths` and write them to the clipboard. (Note: Electron's clipboard can write multiple files to the macOS pasteboard using `clipboard.writeBuffer` with specific UTI types or we can just open them in Finder).
  - Actually, copying multiple files in Electron clipboard natively as file paths for Finder pasting is tricky. The best approach for "batch copying" to Finder is to write the file URLs to exactly the `NSFilenamesPboardType`. Electron's `clipboard.writeBuffer('public.file-url', ...)` handles this.

## 4. Implementation Phasing
1. **Phase 7**: Add `Set<number>` state to `App.tsx` and implement exactly the Cmd/Shift range selection logic.
2. **Phase 8**: Update CSS and `PhotoCard.tsx` props to support `isSelected` and DoubleClick.
3. **Phase 9**: Update preload and main IPC hooks to accept arrays of paths for context menus and drag events.
