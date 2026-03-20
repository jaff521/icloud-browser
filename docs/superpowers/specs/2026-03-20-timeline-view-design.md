# Timeline View Design Spec

## 1. Overview
Currently, the iCloud Browser homepage defaults to an empty state or requires the user to click a specific Year/Month/Day in the Sidebar to load a filtered subset of photos. The goal is to refactor the homepage into a continuous, natively-scrolling "Timeline View" (similar to Apple Photos) where all photos are loaded progressively and grouped visually by date.

## 2. Architecture & Data Flow
1. **Initial Load**:
   - `App.tsx` will call `loadPhotos('', '', '', 1, false)` by default on startup (after scanning/loading years).
   - This fetches the most recent 50 photos across *all* dates because the SQLite backend `getPhotos` function ignores blank string filters.
   
2. **Infinite Scroll Pagination**:
   - As the user scrolls down, the `IntersectionObserver` in `PhotoGrid.tsx` triggers `onLoadMore`.
   - `App.tsx` calls `loadPhotos('', '', '', page + 1, true)`.
   - The backend returns the next 50 oldest photos.

## 3. UI/UX Refactor

### 3.1 Date Grouping (`PhotoGrid.tsx`)
Currently, `PhotoGrid` renders a flat list of `<PhotoCard />` components. It needs to group the `Photo[]` array by the `dateCreated` field before rendering.

**Grouping Logic**:
```typescript
const groupedPhotos = photos.reduce((acc, photo) => {
  const date = photo.dateCreated; // e.g., '2023-10-24'
  if (!acc[date]) {
    acc[date] = [];
  }
  acc[date].push(photo);
  return acc;
}, {} as Record<string, Photo[]>);
```

**Rendering**:
Iterate over `Object.entries(groupedPhotos)` and render a wrapper for each day:
```tsx
{Object.entries(groupedPhotos).map(([date, dayPhotos]) => (
  <div key={date} className="timeline-group">
    <h2 className="timeline-date-header">{formatDate(date)}</h2>
    <div className="photo-grid">
      {dayPhotos.map((photo, index) => (
        <PhotoCard key={photo.id} photo={photo} />
      ))}
    </div>
  </div>
))}
```

### 3.2 Typography & Styling
- The `timeline-date-header` should use a bold, native-looking font (`font-weight: 600`, `font-size: 18px`).
- It should stick to the top of the viewport during scrolling using `position: sticky; top: 0; background: var(--bg-primary); z-index: 10;`.
- Padding should be adjusted so the glass toolbar floats cleanly above the sticky headers.

## 4. Sidebar Interaction
- The Sidebar currently filters the timeline.
- We will keep the Sidebar filtering. Clicking "2023" will change the view from "All Time" to "2023", and the timeline grouping will still render the headers but only for 2023.
- Clicking an "All Photos" button (to be added at the top of the Sidebar) resets the filters and returns to the global Timeline View.

## 5. Verification Plan
1. Run `npm run dev`.
2. Observe that upon launching, photos immediately appear without clicking the sidebar.
3. Scroll down to verify that photos from different days have correctly separated sticky headers (e.g., "2023-10-24" followed by "2023-10-22").
4. Verify that scrolling down fetches more photos seamlessly.
5. Click a specific year in the sidebar to ensure filtering still works and maintains the grouped layout.
