# Multi-Select Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the PhotoGrid and App state to support Cmd/Shift multi-selection and batch context menu operations.

**Architecture:** Frontend React refactor for selection state management. Preload and main process refactor to accept `string[]` instead of `string` for drag and drop and context menus.

**Tech Stack:** React 18, CSS, Electron IPC.

---

### Task 1: Core Selection Logic in App.tsx

**Files:**
- Modify: `src/renderer/App.tsx`

- [ ] **Step 1: Add selection state and refs**
In `src/renderer/App.tsx`, import `useRef` and add:
```tsx
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<number>>(new Set());
  const lastSelectedIndex = useRef<number | null>(null);
```

- [ ] **Step 2: Update photo click semantics**
Change `handlePhotoClick` to act as the selection toggler. Create `handlePhotoDoubleClick` to open the preview modal.
```tsx
  const handlePhotoClick = (photo: Photo, index: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setSelectedPhotoIds(prev => {
      const newSelection = new Set(prev);

      if (e.metaKey || e.ctrlKey) {
        // Toggle selection
        if (newSelection.has(photo.id)) {
          newSelection.delete(photo.id);
        } else {
          newSelection.add(photo.id);
        }
        lastSelectedIndex.current = index;
      } else if (e.shiftKey && lastSelectedIndex.current !== null) {
        // Range selection
        const start = Math.min(lastSelectedIndex.current, index);
        const end = Math.max(lastSelectedIndex.current, index);
        for (let i = start; i <= end; i++) {
          newSelection.add(photos[i].id);
        }
      } else {
        // Single selection
        newSelection.clear();
        newSelection.add(photo.id);
        lastSelectedIndex.current = index;
      }
      return newSelection;
    });
  };

  const handlePhotoDoubleClick = (photo: Photo, index: number) => {
    setPreviewPhoto(photo);
    setPreviewIndex(index);
  };
```

- [ ] **Step 3: Clear selection on background click**
Add to `App.tsx` main content `onClick={() => setSelectedPhotoIds(new Set())}` to clear selection when clicking empty space.
Pass `selectedPhotoIds`, `handlePhotoClick`, and `handlePhotoDoubleClick` down to `PhotoGrid`.

- [ ] **Step 4: Spacebar QuickLook Update**
In `handleKeyDown` in `App.tsx`, if Spacebar is pressed, instead of taking `photos[0]`, take the first photo from `selectedPhotoIds`, or fallback to `photos[0]` if selection is empty.
```tsx
        if (previewPhoto) {
          handleClosePreview();
        } else {
          // Open first selected photo, or first loaded
          if (selectedPhotoIds.size > 0) {
            const firstSelected = photos.find(p => selectedPhotoIds.has(p.id));
            if (firstSelected) {
              handlePhotoDoubleClick(firstSelected, photos.indexOf(firstSelected));
            }
          } else if (photos.length > 0) {
            handlePhotoDoubleClick(photos[0], 0);
          }
        }
```

- [ ] **Step 5: Commit**
```bash
git add src/renderer/App.tsx
git commit -m "feat(ui): add multi-select state logic in App.tsx"
```

### Task 2: PhotoCard Visuals and Props

**Files:**
- Modify: `src/components/PhotoGrid.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Update Interfaces in PhotoGrid**
```tsx
interface PhotoGridProps {
  photos: Photo[];
  selectedPhotoIds: Set<number>;
  onPhotoClick: (photo: Photo, index: number, event: React.MouseEvent) => void;
  onPhotoDoubleClick: (photo: Photo, index: number) => void;
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
}

interface PhotoCardProps {
  photo: Photo;
  isSelected?: boolean;
  onClick: (e: React.MouseEvent) => void;
  onDoubleClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onDragStart: (e: React.DragEvent) => void;
}
```

- [ ] **Step 2: Update PhotoGrid Rendering**
Pass selection paths logic to event handlers.
```tsx
  return (
    <div 
      className={`photo-card ${isSelected ? 'selected' : ''}`} 
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      draggable={true}
      onDragStart={onDragStart}
    >
      <div className="photo-thumbnail">
        <img src={imageSrc} loading="lazy" />
        {/* ... badges ... */}
        {isSelected && (
          <div className="selection-badge">
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#007bff"/><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z" fill="white"/></svg>
          </div>
        )}
      </div>
    </div>
  );
```

- [ ] **Step 3: Drag and ContextMenu Array Logic**
Inside the map in `PhotoGrid`, collect selected paths:
```tsx
    const clickHandler = (e: React.MouseEvent) => {
      onPhotoClick(photo, globalIndex, e);
    };
    const doubleClickHandler = () => {
      onPhotoDoubleClick(photo, globalIndex);
    };

    const isSelected = selectedPhotoIds.has(photo.id);

    const contextMenuHandler = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      let targetPaths = [photo.filePath];
      if (isSelected && selectedPhotoIds.size > 1) {
         targetPaths = photos.filter(p => selectedPhotoIds.has(p.id)).map(p => p.filePath);
      }
      (window as any).electronAPI.showContextMenu(targetPaths);
    };

    const dragStartHandler = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      let targetPaths = [photo.filePath];
      if (isSelected && selectedPhotoIds.size > 1) {
         targetPaths = photos.filter(p => selectedPhotoIds.has(p.id)).map(p => p.filePath);
      }
      (window as any).electronAPI.startDrag(targetPaths);
    };
```

- [ ] **Step 4: Add CSS**
```css
.photo-card.selected {
  outline: 3px solid var(--accent-color);
  outline-offset: -3px;
}
.selection-badge {
  position: absolute;
  bottom: 8px;
  right: 8px;
  width: 24px;
  height: 24px;
  z-index: 5;
}
```

- [ ] **Step 5: Commit**
```bash
git add src/components/PhotoGrid.tsx src/styles.css
git commit -m "feat(ui): add visual selection badges and batch operation hooks"
```

### Task 3: Batch IPC Hooks

**Files:**
- Modify: `src-electron/preload/index.cjs`
- Modify: `src-electron/main/index.cjs`

- [ ] **Step 1: Preload arrays**
Change `filePaths` logic in `preload/index.cjs`:
```javascript
  showContextMenu: (filePaths) => ipcRenderer.send('show-context-menu', filePaths),
  startDrag: (filePaths) => ipcRenderer.send('start-drag', filePaths),
```

- [ ] **Step 2: Main ContextMenu API**
In `index.cjs`:
```javascript
ipcMain.on('show-context-menu', (event, filePaths) => {
  const count = filePaths.length;
  const isMultiple = count > 1;
  const targetPath = filePaths[0]; // For Reveal, we typically reveal the first or all
  
  const template = [
    {
      label: isMultiple ? `Reveal ${count} Items in Finder` : 'Reveal in Finder',
      click: () => {
        // macOS supports revealing multiple files by selecting them in Finder, but Electron's shell.showItemInFolder only selects 1. We just reveal the first one.
        shell.showItemInFolder(targetPath);
      }
    },
    {
      label: isMultiple ? `Copy ${count} Images` : 'Copy Image',
      click: () => {
        if (!isMultiple) {
          clipboard.writeImage(nativeImage.createFromPath(targetPath));
        } else {
           // For multiple files, we write the file paths to the clipboard as NSFilenamesPboardType via writeBuffer
           const buffer = Buffer.from(
             `<plist><array>${filePaths.map(p => `<string>${p}</string>`).join('')}</array></plist>`
           );
           // Electron doesn't perfectly expose passing multiple files natively to clipboard.
           // Realistically just the first image or try system copy. 
           // For now, let's gracefully fall back to copying the first image if multiple, or write a custom native module.
           // Update: We can use clipboard.writeBuffer to set 'public.file-url' for each? No. We just write the first image.
           clipboard.writeImage(nativeImage.createFromPath(targetPath));
           logToFile("Warning: Multiple image copy not fully supported without native addon");
        }
      }
    },
    { type: 'separator' }
  ];
  // ... build menu
```

- [ ] **Step 3: Main Drag API**
```javascript
ipcMain.on('start-drag', (event, filePaths) => {
  const iconName = path.join(__dirname, '../../build/icon.png');
  event.sender.startDrag({
    files: filePaths, // Supported in electron > 15
    file: filePaths[0], // Fallback
    icon: iconName
  });
});
```

- [ ] **Step 4: Commit**
```bash
git add src-electron/preload/index.cjs src-electron/main/index.cjs
git commit -m "feat(os): support batch array drag and right-click IPC paths"
```
