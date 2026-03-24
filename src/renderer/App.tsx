import { useState, useEffect, useCallback, useRef } from 'react';
import Sidebar from '../components/Sidebar';
import PhotoGrid from '../components/PhotoGrid';
import PreviewModal from '../components/PreviewModal';
import type { Photo } from '../types';
import '../styles.css';
import { t } from './i18n';

function App() {
  const [years, setYears] = useState<string[]>([]);
  const [months, setMonths] = useState<string[]>([]);
  const [days, setDays] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedDay, setSelectedDay] = useState<string>('');
  const [language, setLanguage] = useState<string>('en');
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
    (window as any).electronAPI.getConfig().then((config: any) => {
      if (config && config.language) {
        setLanguage(config.language);
      }
    });
    
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
        <h1>{t(language, 'appTitle')}</h1>
        <div className="app-controls">
          <button className="icon-btn" onClick={() => (window as any).electronAPI.openSettings()} aria-label="Settings">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
          </button>
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
          language={language}
        />
        <main className="main-content" onClick={() => setSelectedPhotoIds(new Set())}>
          {selectedYear && (
            <div className="photo-count">
              {photoCount} {t(language, 'photosCount')}
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
