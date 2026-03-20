import React, { useEffect } from 'react';
import type { Photo } from '../types';

interface PhotoGridProps {
  photos: Photo[];
  selectedPhotoIds: Set<number>;
  onPhotoClick: (photo: Photo, index: number, event: React.MouseEvent) => void;
  onPhotoDoubleClick: (photo: Photo, index: number) => void;
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
}

// 将文件路径转换为自定义协议 URL
function toLocalUrl(filePath: string): string {
  // Use a fake host 'local' and keep the absolute path intact (encoded by segment)
  const segments = filePath.split('/').map(segment => encodeURIComponent(segment));
  return `local-file://local/${segments.join('/').replace(/^\/+/, '')}`;
}

// 检查是否为 HEIC 文件


interface PhotoCardProps {
  photo: Photo;
  isSelected?: boolean;
  onClick: (e: React.MouseEvent) => void;
  onDoubleClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onDragStart: (e: React.DragEvent) => void;
}

function PhotoCard({ photo, isSelected, onClick, onDoubleClick, onContextMenu, onDragStart }: PhotoCardProps) {
  const imageSrc = `${toLocalUrl(photo.filePath)}?type=thumbnail&size=300`;

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
        <img
          src={imageSrc}
          alt={photo.filename}
          loading="lazy"
        />
        {photo.isVideo === 1 && (
          <div className="video-badge">
            <svg viewBox="0 0 24 24" width="24" height="24">
              <path fill="white" d="M8 5v14l11-7z"/>
            </svg>
          </div>
        )}
        {isSelected && (
          <div className="selection-badge">
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#007bff"/><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z" fill="white"/></svg>
          </div>
        )}
      </div>
      <div className="photo-info">
        <span className="photo-filename">{photo.filename}</span>
      </div>
    </div>
  );
}

function PhotoGrid({ photos, selectedPhotoIds, onPhotoClick, onPhotoDoubleClick, loading, hasMore, onLoadMore }: PhotoGridProps) {
  const observer = React.useRef<IntersectionObserver | null>(null);
  const loadMoreRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (hasMore && loadMoreRef.current) {
      observer.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            onLoadMore();
          }
        },
        { threshold: 0.1 }
      );
      observer.current.observe(loadMoreRef.current);
    }
    return () => {
      if (observer.current) {
        observer.current.disconnect();
      }
    };
  }, [hasMore, onLoadMore]);

  const groupedPhotos = photos.reduce((acc, photo) => {
    const date = photo.dateCreated || 'Unknown Date';
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(photo);
    return acc;
  }, {} as Record<string, Photo[]>);

  if (photos.length === 0 && !loading) {
    return (
      <div className="photo-grid empty">
        <p>No photos found. Please select a date or scan a directory.</p>
      </div>
    );
  }

  return (
    <div className="photo-grid-container" style={{ position: 'relative' }}>
      {Object.entries(groupedPhotos).map(([date, dayPhotos]) => (
        <div key={date} className="timeline-group" style={{ marginBottom: '24px' }}>
          <h2 className="timeline-date-header">{date}</h2>
          <div className="photo-grid">
            {dayPhotos.map((photo) => {
              // Find global index for navigation in PreviewModal
              const globalIndex = photos.findIndex(p => p.id === photo.id);
              const isSelected = selectedPhotoIds.has(photo.id);

              const handleContextMenu = (e: React.MouseEvent) => {
                e.preventDefault();
                e.stopPropagation();
                let targetPaths = [photo.filePath];
                if (isSelected && selectedPhotoIds.size > 1) {
                  targetPaths = photos.filter(p => selectedPhotoIds.has(p.id)).map(p => p.filePath);
                }
                (window as any).electronAPI.showContextMenu(targetPaths);
              };

              const handleDragStart = (e: React.DragEvent) => {
                e.preventDefault();
                e.stopPropagation();
                let targetPaths = [photo.filePath];
                if (isSelected && selectedPhotoIds.size > 1) {
                  targetPaths = photos.filter(p => selectedPhotoIds.has(p.id)).map(p => p.filePath);
                }
                (window as any).electronAPI.startDrag(targetPaths);
              };

              return (
                <PhotoCard
                  key={`${photo.id}-${globalIndex}`}
                  photo={photo}
                  isSelected={isSelected}
                  onClick={(e) => onPhotoClick(photo, globalIndex, e)}
                  onDoubleClick={() => onPhotoDoubleClick(photo, globalIndex)}
                  onContextMenu={handleContextMenu}
                  onDragStart={handleDragStart}
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
}

export default PhotoGrid;
