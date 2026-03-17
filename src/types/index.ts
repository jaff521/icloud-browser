export interface Photo {
  id: number;
  filename: string;
  filePath: string;
  year: string;
  month: string;
  day: string;
  dateCreated: string;
  isVideo: number;
  thumbnail_status?: 'pending' | 'processing' | 'done' | 'error';
  thumbnail_path?: string;
}

export interface ElectronAPI {
  selectDirectory: () => Promise<string | null>;
  getYears: () => Promise<string[]>;
  getMonths: (year: string) => Promise<string[]>;
  getDays: (year: string, month: string) => Promise<string[]>;
  getPhotos: (year: string, month: string, day: string, page: number, limit: number) => Promise<Photo[]>;
  getPhotoCount: (year: string, month: string, day: string) => Promise<number>;
  scanDirectory: (rootPath: string) => Promise<number>;
  onThumbnailReady: (callback: (data: Partial<Photo> & { id: number }) => void) => () => void;
}
