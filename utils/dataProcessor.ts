export const cleanNumeric = (val: any): number => {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return val;
  const cleanStr = String(val).replace(',', '.').replace(/[^-0-9.]/g, '');
  const num = parseFloat(cleanStr);
  return isNaN(num) ? 0 : num;
};

export const parseExcelTime = (val: any): number => {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return val * 24;
  if (val instanceof Date) {
    const hours = val.getHours();
    const minutes = val.getMinutes();
    const seconds = val.getSeconds();
    return hours + (minutes / 60) + (seconds / 3600);
  }
  if (typeof val === 'string') {
    const parts = val.trim().split(':');
    if (parts.length >= 2) {
      const h = parseInt(parts[0]) || 0;
      const m = parseInt(parts[1]) || 0;
      const s = parts.length > 2 ? parseInt(parts[2]) || 0 : 0;
      return h + (m / 60) + (s / 3600);
    }
  }
  return 0;
};

export const formatHoursToTime = (hours: number): string => {
  if (isNaN(hours) || hours <= 0) return "0:00";
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}:${String(m).padStart(2, '0')}`;
};
