import { useState, useEffect, useCallback } from 'react';
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
  const [scanning, setScanning] = useState(false);

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
          // Open first loaded photo
          handlePhotoClick(photos[0], 0);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [photos, previewPhoto]);

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

  const handlePhotoClick = (photo: Photo, index: number) => {
    setPreviewPhoto(photo);
    setPreviewIndex(index);
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

  const handleSelectDirectory = async () => {
    console.log('[App] 点击选择目录按钮');
    try {
      console.log('[App] 调用 electronAPI.selectDirectory()');
      const result = await window.electronAPI.selectDirectory();
      console.log('[App] 选择目录结果:', result);
      if (result) {
        console.log('[App] 开始扫描目录:', result);
        setScanning(true);
        await window.electronAPI.scanDirectory(result);
        setScanning(false);
        console.log('[App] 扫描完成，重新加载年份');
        await loadYears();
        setSelectedYear('');
        setSelectedMonth('');
        setSelectedDay('');
        setMonths([]);
        setDays([]);
        setPhotos([]);
        setPhotoCount(0);
      }
    } catch (error) {
      console.error('[App] 选择目录错误:', error);
      setScanning(false);
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>iCloud Browser</h1>
        <button className="select-btn" onClick={handleSelectDirectory} disabled={scanning}>
          {scanning ? 'Scanning...' : 'Select iCloud Photos Directory'}
        </button>
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
        <main className="main-content">
          {scanning && (
            <div className="scanning-overlay">
              <div className="scanning-spinner" />
              <p>Scanning directory for photos and videos...</p>
            </div>
          )}
          {selectedYear && !scanning && (
            <div className="photo-count">
              {photoCount} photos
            </div>
          )}
          <PhotoGrid
            photos={photos}
            onPhotoClick={handlePhotoClick}
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
