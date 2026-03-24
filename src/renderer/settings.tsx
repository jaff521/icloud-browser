import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import '../styles.css';
import { t } from './i18n';

const SettingsApp: React.FC = () => {
  const [theme, setTheme] = useState('system');
  const [language, setLanguage] = useState('en');
  const [rootPath, setRootPath] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    (window as any).electronAPI.getConfig().then((config: any) => {
      if (config) {
        if (config.theme) setTheme(config.theme);
        if (config.language) setLanguage(config.language);
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

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLang = e.target.value;
    setLanguage(newLang);
    (window as any).electronAPI.saveConfig({ language: newLang }).then(() => {
      (window as any).electronAPI.reloadMainWindow();
    });
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
        <h1>{t(language, 'settingsTitle')}</h1>
      </header>
      
      <div className="settings-page-content">
        <div className="settings-section">
          <h3>{t(language, 'appearance')}</h3>
          <div className="settings-row">
            <span>{t(language, 'themeOption')}</span>
            <select value={theme} onChange={handleThemeChange}>
              <option value="system">{t(language, 'systemDefault')}</option>
              <option value="light">{t(language, 'light')}</option>
              <option value="dark">{t(language, 'dark')}</option>
            </select>
          </div>
          <div className="settings-row">
            <span>{t(language, 'languageOption')}</span>
            <select value={language} onChange={handleLanguageChange}>
              <option value="en">English</option>
              <option value="zh">简体中文</option>
            </select>
          </div>
        </div>

        <div className="settings-section">
          <h3>{t(language, 'localLibrary')}</h3>
          <div className="settings-row">
            <span className="settings-path">
              {rootPath ? rootPath : t(language, 'noDirectorySelected')}
            </span>
            <button className="select-btn" onClick={handleScanDirectory} disabled={isScanning}>
              {isScanning ? t(language, 'scanningBtn') : t(language, 'changeBtn')}
            </button>
          </div>
          <p className="settings-hint">
            {t(language, 'scanHint')}
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
