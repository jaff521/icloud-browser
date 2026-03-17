import React, { useEffect } from 'react';
import type { Photo } from '../types';

interface PhotoGridProps {
  photos: Photo[];
  onPhotoClick: (photo: Photo, index: number) => void;
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
  onClick: () => void;
}

function PhotoCard({ photo, onClick }: PhotoCardProps) {
  const imageSrc = `${toLocalUrl(photo.filePath)}?type=thumbnail&size=300`;

  return (
    <div className="photo-card" onClick={onClick}>
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
      </div>
      <div className="photo-info">
        <span className="photo-filename">{photo.filename}</span>
      </div>
    </div>
  );
}

function PhotoGrid({ photos, onPhotoClick, loading, hasMore, onLoadMore }: PhotoGridProps) {
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

  if (photos.length === 0 && !loading) {
    return (
      <div className="photo-grid empty">
        <p>No photos found. Please select a date or scan a directory.</p>
      </div>
    );
  }

  return (
    <div className="photo-grid">
      {photos.map((photo, index) => (
        <PhotoCard
          key={`${photo.id}-${index}`}
          photo={photo}
          onClick={() => onPhotoClick(photo, index)}
        />
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
