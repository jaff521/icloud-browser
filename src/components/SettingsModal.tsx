import React, { useState, useEffect } from 'react';

interface SettingsModalProps {
  onClose: () => void;
  rootPath: string | null;
  onScanDirectory: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ onClose, rootPath, onScanDirectory }) => {
  const [theme, setTheme] = useState('system');

  useEffect(() => {
    (window as any).electronAPI.getConfig().then((config: any) => {
      if (config && config.theme) {
        setTheme(config.theme);
      }
    });
  }, []);

  const handleThemeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newTheme = e.target.value;
    setTheme(newTheme);
    (window as any).electronAPI.setTheme(newTheme);
  };

  return (
    <div className="settings-modal-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={e => e.stopPropagation()}>
        <h2>Settings</h2>
        
        <div className="settings-section">
          <h3>Appearance</h3>
          <div className="settings-row">
            <span>Theme</span>
            <select value={theme} onChange={handleThemeChange}>
              <option value="system">System Default</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>
        </div>

        <div className="settings-section">
          <h3>Library</h3>
          <div className="settings-row">
            <span className="settings-path">
              {rootPath ? rootPath : 'No directory selected'}
            </span>
            <button className="select-btn" onClick={onScanDirectory}>
              Change...
            </button>
          </div>
        </div>

        <button className="settings-close-btn" onClick={onClose}>
          Done
        </button>
      </div>
    </div>
  );
};

export default SettingsModal;
