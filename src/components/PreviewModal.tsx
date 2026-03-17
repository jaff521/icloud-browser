import React, { useEffect, useRef } from 'react';
import type { Photo } from '../types';

interface PreviewModalProps {
  photo: Photo | null;
  photos: Photo[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

// 将文件路径转换为自定义协议 URL
function toLocalUrl(filePath: string): string {
  // Use a fake host 'local' and keep the absolute path intact (encoded by segment)
  const segments = filePath.split('/').map(segment => encodeURIComponent(segment));
  return `local-file://local/${segments.join('/').replace(/^\/+/, '')}`;
}

function PreviewModal({ photo, photos, currentIndex, onClose, onNavigate }: PreviewModalProps) {
  const mediaRef = useRef<HTMLMediaElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        if (currentIndex > 0) {
          onNavigate(currentIndex - 1);
        }
      } else if (e.key === 'ArrowRight') {
        if (currentIndex < photos.length - 1) {
          onNavigate(currentIndex + 1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, photos.length, onClose, onNavigate]);

  const currentPhoto = photos[currentIndex] || photo;
  if (!currentPhoto) return null;

  const isHeic = currentPhoto.filename.toLowerCase().endsWith('.heic');
  let imageSrc = isHeic
    ? `${toLocalUrl(currentPhoto.filePath)}?type=thumbnail&size=1200`
    : toLocalUrl(currentPhoto.filePath);
  
  // For video playback, pass the raw file through the protocol without conversion
  const videoSrc = toLocalUrl(currentPhoto.filePath);

  return (
    <div className="preview-modal" onClick={onClose}>
      <div className="preview-content" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>
          <svg viewBox="0 0 24 24" width="24" height="24">
            <path fill="white" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>

        <button
          className="nav-btn prev"
          onClick={() => currentIndex > 0 && onNavigate(currentIndex - 1)}
          disabled={currentIndex === 0}
        >
          <svg viewBox="0 0 24 24" width="24" height="24">
            <path fill="white" d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
          </svg>
        </button>

        <div className="media-container">
          {currentPhoto.isVideo === 1 ? (
            <video
              ref={mediaRef as React.RefObject<HTMLVideoElement>}
              src={videoSrc}
              controls
              autoPlay
              muted
              loop
            />
          ) : (
            <img
              src={imageSrc}
              alt={currentPhoto.filename}
              onError={() => {
                 console.error(`Failed to load preview: ${currentPhoto.filename}`);
              }}
            />
          )}
        </div>

        <button
          className="nav-btn next"
          onClick={() => currentIndex < photos.length - 1 && onNavigate(currentIndex + 1)}
          disabled={currentIndex === photos.length - 1}
        >
          <svg viewBox="0 0 24 24" width="24" height="24">
            <path fill="white" d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
          </svg>
        </button>

        <div className="photo-details">
          <h3>{currentPhoto.filename}</h3>
          <p>{currentPhoto.dateCreated}</p>
        </div>
      </div>
    </div>
  );
}

export default PreviewModal;
