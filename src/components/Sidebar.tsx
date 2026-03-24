import { t } from '../renderer/i18n';

interface SidebarProps {
  years: string[];
  months: string[];
  days: string[];
  selectedYear: string;
  selectedMonth: string;
  selectedDay: string;
  onYearSelect: (year: string) => void;
  onMonthSelect: (month: string) => void;
  onDaySelect: (day: string) => void;
  onAllPhotosSelect?: () => void;
  isAllPhotosActive?: boolean;
  language: string;
}

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function Sidebar({
  years,
  months,
  days,
  selectedYear,
  selectedMonth,
  selectedDay,
  onYearSelect,
  onMonthSelect,
  onDaySelect,
  onAllPhotosSelect,
  isAllPhotosActive,
  language
}: SidebarProps) {
  const isZh = language === 'zh';
  return (
    <div className="sidebar">
      <div className="sidebar-section">
        <ul>
          <li
            className={isAllPhotosActive ? 'active' : ''}
            onClick={() => onAllPhotosSelect && onAllPhotosSelect()}
          >
            <span style={{ marginRight: '8px' }}>🖼️</span>
            {t(language, 'allPhotos')}
          </li>
        </ul>
      </div>
      <div className="sidebar-section">
        <h3>{language === 'zh' ? '年份' : 'Years'}</h3>
        <ul>
          {years.map(year => (
            <li
              key={year}
              className={year === selectedYear ? 'active' : ''}
              onClick={() => onYearSelect(year)}
            >
              {year}{isZh ? '年' : ''}
            </li>
          ))}
        </ul>
      </div>

      {selectedYear && months.length > 0 && (
        <div className="sidebar-section">
          <h3>{isZh ? '月份' : 'Months'}</h3>
          <ul>
            {months.map(month => (
              <li
                key={month}
                className={month === selectedMonth ? 'active' : ''}
                onClick={() => onMonthSelect(month)}
              >
                {isZh ? `${month}月` : monthNames[parseInt(month) - 1]}
              </li>
            ))}
          </ul>
        </div>
      )}

      {selectedYear && selectedMonth && days.length > 0 && (
        <div className="sidebar-section">
          <h3>{isZh ? '日期' : 'Days'}</h3>
          <ul>
            {days.map(day => (
              <li
                key={day}
                className={day === selectedDay ? 'active' : ''}
                onClick={() => onDaySelect(day)}
              >
                {parseInt(day)}{isZh ? '日' : ''}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default Sidebar;
