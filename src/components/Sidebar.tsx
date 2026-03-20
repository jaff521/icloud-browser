

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
  isAllPhotosActive
}: SidebarProps) {
  return (
    <div className="sidebar">
      <div className="sidebar-section">
        <ul>
          <li
            className={isAllPhotosActive ? 'active' : ''}
            onClick={() => onAllPhotosSelect && onAllPhotosSelect()}
          >
            <span style={{ marginRight: '8px' }}>🖼️</span>
            All Photos
          </li>
        </ul>
      </div>
      <div className="sidebar-section">
        <h3>Years</h3>
        <ul>
          {years.map(year => (
            <li
              key={year}
              className={year === selectedYear ? 'active' : ''}
              onClick={() => onYearSelect(year)}
            >
              {year}
            </li>
          ))}
        </ul>
      </div>

      {selectedYear && months.length > 0 && (
        <div className="sidebar-section">
          <h3>Months</h3>
          <ul>
            {months.map(month => (
              <li
                key={month}
                className={month === selectedMonth ? 'active' : ''}
                onClick={() => onMonthSelect(month)}
              >
                {monthNames[parseInt(month) - 1]}
              </li>
            ))}
          </ul>
        </div>
      )}

      {selectedYear && selectedMonth && days.length > 0 && (
        <div className="sidebar-section">
          <h3>Days</h3>
          <ul>
            {days.map(day => (
              <li
                key={day}
                className={day === selectedDay ? 'active' : ''}
                onClick={() => onDaySelect(day)}
              >
                {parseInt(day)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default Sidebar;
