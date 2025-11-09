import * as XLSX from 'xlsx';
import type { ScheduleItem } from '../types';

export function exportToExcel(schedule: ScheduleItem[], filename: string = 'schedule.xlsx') {
  const data = schedule.map(item => {
    if (item.isHoliday) {
      return {
        '日付': item.dateStr,
        '曜日': item.dayOfWeek,
        '授業回数': '',
        '備考': `（休講）${item.holidayReason}`
      };
    } else {
      return {
        '日付': item.dateStr,
        '曜日': item.dayOfWeek,
        '授業回数': `第${item.classNumber}回`,
        '備考': ''
      };
    }
  });
  
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '授業日程');
  
  XLSX.writeFile(wb, filename);
}

export function exportToTXT(schedule: ScheduleItem[], filename: string = 'schedule.txt') {
  const lines = schedule.map(item => {
    if (item.isHoliday) {
      return `${item.dateStr} （休講）${item.holidayReason}`;
    } else {
      return `${item.dateStr} 第${item.classNumber}回`;
    }
  });
  
  const content = lines.join('\n');
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportToMarkdown(schedule: ScheduleItem[], filename: string = 'schedule.md') {
  const lines = schedule.map(item => {
    if (item.isHoliday) {
      return `- ${item.dateStr} （休講）${item.holidayReason}`;
    } else {
      return `- ${item.dateStr} 第${item.classNumber}回`;
    }
  });
  
  const content = `# 授業日程\n\n${lines.join('\n')}\n`;
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportToJSON(schedule: ScheduleItem[], filename: string = 'schedule.json') {
  const data = schedule.map(item => ({
    date: item.dateStr,
    dayOfWeek: item.dayOfWeek,
    classNumber: item.classNumber || null,
    isHoliday: item.isHoliday,
    holidayReason: item.holidayReason || null
  }));
  
  const content = JSON.stringify(data, null, 2);
  const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

