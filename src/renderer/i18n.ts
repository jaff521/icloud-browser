export const translations = {
  en: {
    appTitle: 'iCloud Browser',
    settingsTitle: 'Settings',
    appearance: 'Appearance',
    themeOption: 'Theme Option',
    languageOption: 'Language',
    systemDefault: 'System Default',
    light: 'Light',
    dark: 'Dark',
    localLibrary: 'Local Library',
    noDirectorySelected: 'No directory selected',
    changeBtn: 'Change...',
    scanningBtn: 'Scanning...',
    scanHint: 'Changing the directory will immediately scan for new photos and videos. The main window will refresh.',
    allPhotos: 'All Photos',
    photosCount: 'photos',
    scanningOverlay: 'Scanning directory for photos and videos...',
  },
  zh: {
    appTitle: '极速相册浏览器',
    settingsTitle: '偏好设置',
    appearance: '外观',
    themeOption: '主题配色',
    languageOption: '显示语言',
    systemDefault: '跟随系统',
    light: '浅色',
    dark: '深色',
    localLibrary: '本地图库',
    noDirectorySelected: '未选择目录',
    changeBtn: '更改目录...',
    scanningBtn: '正在扫描...',
    scanHint: '更改照片目录后将立即扫描其内部的照片和视频文件，主界面会自动刷新。',
    allPhotos: '所有照片',
    photosCount: '张照片',
    scanningOverlay: '正在为您极速索引相片与视频文档...',
  }
};

export type Language = keyof typeof translations;

export function t(lang: string | null, key: keyof typeof translations['en']): string {
  const defaultLang = 'en';
  const targetLang = lang === 'en' || lang === 'zh' ? lang : defaultLang;
  return translations[targetLang as Language][key] || key;
}
