import { useState, useEffect, useCallback, useRef } from 'react';
import Sidebar from '../components/Sidebar';
import PhotoGrid from '../components/PhotoGrid';
import PreviewModal from '../components/PreviewModal';
import type { Photo } from '../types';
import '../styles.css';

function App() {
  const [years, setYears] = useState<string[]>([]);
  const [months, setMonths] = useState<string[]>([]);
  const [days, setDays] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedDay, setSelectedDay] = useState<string>('');
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [previewPhoto, setPreviewPhoto] = useState<Photo | null>(null);
  const [previewIndex, setPreviewIndex] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [photoCount, setPhotoCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<number>>(new Set());
  const lastSelectedIndex = useRef<number | null>(null);

  const limit = 50;

  const loadYears = useCallback(async () => {
    try {
      const yearsData = await window.electronAPI.getYears();
      setYears(yearsData);
    } catch (error) {
      console.error('Error loading years:', error);
    }
  }, []);

  const loadMonths = useCallback(async (year: string) => {
    try {
      const monthsData = await window.electronAPI.getMonths(year);
      setMonths(monthsData);
    } catch (error) {
      console.error('Error loading months:', error);
    }
  }, []);

  const loadDays = useCallback(async (year: string, month: string) => {
    try {
      const daysData = await window.electronAPI.getDays(year, month);
      setDays(daysData);
    } catch (error) {
      console.error('Error loading days:', error);
    }
  }, []);

  const loadPhotos = useCallback(async (year: string, month: string, day: string, page: number, append: boolean = false) => {
    setLoading(true);
    try {
      const photosData = await window.electronAPI.getPhotos(year, month, day, page, limit);
      const count = await window.electronAPI.getPhotoCount(year, month, day);

      setPhotoCount(count);
      setPhotos(prev => append ? [...prev, ...photosData] : photosData);
      setHasMore(photosData.length === limit);
      setCurrentPage(page);
    } catch (error) {
      console.error('Error loading photos:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadYears();
    // Fetch timeline all photos by default on startup
    loadPhotos('', '', '', 1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only call once on mount

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Spacebar for QuickLook preview toggle
      if (e.code === 'Space' && photos.length > 0) {
        e.preventDefault();
        if (previewPhoto) {
          handleClosePreview();
        } else {
          // Open first selected photo, or first loaded
          if (selectedPhotoIds.size > 0) {
            const firstSelected = photos.find(p => selectedPhotoIds.has(p.id));
            if (firstSelected) {
              handlePhotoDoubleClick(firstSelected, photos.indexOf(firstSelected));
            }
          } else {
            handlePhotoDoubleClick(photos[0], 0);
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [photos, previewPhoto, selectedPhotoIds]);

  const handlePhotoDoubleClick = (photo: Photo, index: number) => {
    setPreviewPhoto(photo);
    setPreviewIndex(index);
  };

// Removed thumbnail-ready listener as thumbnails are now generated on-the-fly

  const handleYearSelect = (year: string) => {
    setSelectedYear(year);
    setSelectedMonth('');
    setSelectedDay('');
    setMonths([]);
    setDays([]);
    setPhotos([]);
    setPhotoCount(0);
    setCurrentPage(1);
    setHasMore(true);
    if (year) {
      loadMonths(year);
      // F4: Auto-load photos for the selected year
      loadPhotos(year, '', '', 1, false);
    }
  };

  const handleMonthSelect = (month: string) => {
    setSelectedMonth(month);
    setSelectedDay('');
    setDays([]);
    setPhotos([]);
    setPhotoCount(0);
    setCurrentPage(1);
    setHasMore(true);
    if (month) {
      loadDays(selectedYear, month);
      // F4: Auto-load photos for the selected month
      loadPhotos(selectedYear, month, '', 1, false);
    }
  };

  const handleDaySelect = (day: string) => {
    setSelectedDay(day);
    setPhotos([]);
    setCurrentPage(1);
    setHasMore(true);
    if (day) {
      loadPhotos(selectedYear, selectedMonth, day, 1, false);
    }
  };

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

  const handleNavigate = (index: number) => {
    setPreviewPhoto(photos[index]);
    setPreviewIndex(index);
  };

  const handleClosePreview = () => {
    setPreviewPhoto(null);
    setPreviewIndex(0);
  };

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

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      loadPhotos(selectedYear, selectedMonth, selectedDay, currentPage + 1, true);
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>iCloud Browser</h1>
        <div className="app-controls">
          <button className="icon-btn" onClick={() => (window as any).electronAPI.openSettings()}>⚙️</button>
        </div>
      </header>
      <div className="app-content">
        <Sidebar
          years={years}
          months={months}
          days={days}
          selectedYear={selectedYear}
          selectedMonth={selectedMonth}
          selectedDay={selectedDay}
          onYearSelect={handleYearSelect}
          onMonthSelect={handleMonthSelect}
          onDaySelect={handleDaySelect}
          onAllPhotosSelect={handleAllPhotosSelect}
          isAllPhotosActive={!selectedYear}
        />
        <main className="main-content" onClick={() => setSelectedPhotoIds(new Set())}>
          {selectedYear && (
            <div className="photo-count">
              {photoCount} photos
            </div>
          )}
          <PhotoGrid
            photos={photos}
            selectedPhotoIds={selectedPhotoIds}
            onPhotoClick={handlePhotoClick}
            onPhotoDoubleClick={handlePhotoDoubleClick}
            loading={loading}
            hasMore={hasMore}
            onLoadMore={handleLoadMore}
          />
        </main>
      </div>
      {previewPhoto && (
        <PreviewModal
          photo={previewPhoto}
          photos={photos}
          currentIndex={previewIndex}
          onClose={handleClosePreview}
          onNavigate={handleNavigate}
        />
      )}
    </div>
  );
}

export default App;
