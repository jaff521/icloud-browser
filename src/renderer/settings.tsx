import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import '../styles.css';

const SettingsApp: React.FC = () => {
  const [theme, setTheme] = useState('system');
  const [rootPath, setRootPath] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    (window as any).electronAPI.getConfig().then((config: any) => {
      if (config) {
        if (config.theme) setTheme(config.theme);
        if (config.rootPath) setRootPath(config.rootPath);
      }
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        window.close();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleThemeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newTheme = e.target.value;
    setTheme(newTheme);
    (window as any).electronAPI.setTheme(newTheme);
  };

  const handleScanDirectory = async () => {
    const result = await (window as any).electronAPI.selectDirectory();
    if (result) {
      setIsScanning(true);
      setRootPath(result);
      await (window as any).electronAPI.scanDirectory(result);
      setIsScanning(false);
      (window as any).electronAPI.reloadMainWindow();
    }
  };

  return (
    <div className="settings-window">
      <header className="app-header drag-region">
        <h1>Settings</h1>
      </header>
      
      <div className="settings-page-content">
        <div className="settings-section">
          <h3>Appearance</h3>
          <div className="settings-row">
            <span>Theme Option</span>
            <select value={theme} onChange={handleThemeChange}>
              <option value="system">System Default</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>
        </div>

        <div className="settings-section">
          <h3>Local Library</h3>
          <div className="settings-row">
            <span className="settings-path">
              {rootPath ? rootPath : 'No directory selected'}
            </span>
            <button className="select-btn" onClick={handleScanDirectory} disabled={isScanning}>
              {isScanning ? 'Scanning...' : 'Change...'}
            </button>
          </div>
          <p className="settings-hint">
            Changing the directory will immediately scan for new photos and videos.
            The main window will refresh.
          </p>
        </div>
      </div>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <SettingsApp />
  </React.StrictMode>
);
