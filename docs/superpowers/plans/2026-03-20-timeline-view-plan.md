# Timeline View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the iCloud Browser into a continuous timeline view where all photos are loaded progressively and grouped visually by date with native sticky headers.

**Architecture:** Frontend React refactor only. The backend SQLite database already supports fetching all photos paginated by passing empty date filters. We need to group these results dynamically in the `PhotoGrid` component and update `App.tsx` and `Sidebar.tsx` to handle a global "All Photos" default view.

**Tech Stack:** React 18, CSS.

---

### Task 1: Add "All Photos" to Sidebar

**Files:**
- Modify: `src/components/Sidebar.tsx`
- Modify: `src/renderer/App.tsx`

- [ ] **Step 1: Update Sidebar interface and UI**
In `src/components/Sidebar.tsx`, add `onAllPhotosSelect?: () => void;` to `SidebarProps` and `isAllPhotosActive?: boolean;`.
Render an "All Photos" section at the top of the sidebar.
```tsx
      <div className="sidebar-section">
        <ul>
          <li
            className={isAllPhotosActive ? 'active' : ''}
            onClick={() => onAllPhotosSelect && onAllPhotosSelect()}
          >
            <span style={{ marginRight: '8px' }}>🖼️</span>
            All Photos
          </li>
        </ul>
      </div>
```

- [ ] **Step 2: Handle "All Photos" in App.tsx**
In `src/renderer/App.tsx`, create `handleAllPhotosSelect` to clear selected dates and load all:
```tsx
  const handleAllPhotosSelect = () => {
    setSelectedYear('');
    setSelectedMonth('');
    setSelectedDay('');
    setPhotos([]);
    setPhotoCount(0);
    setCurrentPage(1);
    setHasMore(true);
    // Fetch all paginated
    loadPhotos('', '', '', 1, false);
  };
```
Pass this to the `<Sidebar />` component along with `isAllPhotosActive={!selectedYear}`.

- [ ] **Step 3: Run dev server to verify**
Run: `npm run dev`
Expected: Clicking "All Photos" should clear the date selections in the sidebar.

- [ ] **Step 4: Commit**
```bash
git add src/components/Sidebar.tsx src/renderer/App.tsx
git commit -m "feat(ui): add All Photos selection to sidebar"
```

### Task 2: Default Timeline on Startup

**Files:**
- Modify: `src/renderer/App.tsx`

- [ ] **Step 1: Update initial load hook**
In `src/renderer/App.tsx`, modify the first `useEffect` to also fetch all photos initially:
```typescript
  useEffect(() => {
    loadYears();
    // Fetch timeline all photos by default on startup
    loadPhotos('', '', '', 1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only call once on mount
```

- [ ] **Step 2: Commit**
```bash
git commit -am "feat(ui): load all photos timeline by default on app startup"
```

### Task 3: Refactor PhotoGrid for Date Grouping

**Files:**
- Modify: `src/components/PhotoGrid.tsx`

- [ ] **Step 1: Add grouping logic**
Inside `PhotoGrid`, define a helper function to group photos by `dateCreated`:
```typescript
  const groupedPhotos = photos.reduce((acc, photo) => {
    const date = photo.dateCreated || 'Unknown Date';
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(photo);
    return acc;
  }, {} as Record<string, Photo[]>);
```

- [ ] **Step 2: Render groups with sticky headers**
Change the `photo-grid` return block to iterate over the keys:
```tsx
  return (
    <div className="photo-grid-container" style={{ position: 'relative' }}>
      {Object.entries(groupedPhotos).map(([date, dayPhotos]) => (
        <div key={date} className="timeline-group" style={{ marginBottom: '24px' }}>
          <h2 className="timeline-date-header">{date}</h2>
          <div className="photo-grid">
            {dayPhotos.map((photo, index) => {
              // Find global index for navigation
              const globalIndex = photos.findIndex(p => p.id === photo.id);
              return (
                <PhotoCard
                  key={`${photo.id}-${globalIndex}`}
                  photo={photo}
                  onClick={() => onPhotoClick(photo, globalIndex)}
                />
              );
            })}
          </div>
        </div>
      ))}
      {hasMore && (
        <div ref={loadMoreRef} className="load-more">
          {loading ? 'Loading...' : ''}
        </div>
      )}
    </div>
  );
```

- [ ] **Step 3: Commit**
```bash
git commit -am "feat(ui): group photo grid by date with timeline headers"
```

### Task 4: Sticky Timeline Headers CSS

**Files:**
- Modify: `src/styles.css`

- [ ] **Step 1: Add CSS for timeline headers**
In `src/styles.css`, add the following classes:
```css
.timeline-date-header {
  position: sticky;
  top: 0;
  padding: 12px 0;
  background-color: var(--bg-primary); /* Or use rgba with backdrop filter if desired */
  z-index: 10;
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 12px;
  border-bottom: 1px solid var(--border-color);
}
.photo-grid-container {
  display: flex;
  flex-direction: column;
}
```

- [ ] **Step 2: Verify**
Run: `npm run dev`. Scroll down the window. The date headers should stick to the top edge before being pushed up by the next date header.

- [ ] **Step 3: Commit**
```bash
git commit -am "feat(style): add sticky timeline header css"
```
