import * as XLSX from 'xlsx';
import { MileageLog, Employee } from '../types';

const fmtTime = (iso?: string): string => {
  if (!iso) return '';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
};

/**
 * Export own-car mileage trips to a real .xlsx file for the boss. Distance is
 * the computed difference between the end and start odometer readings.
 */
export function exportMileageToXlsx(
  rows: MileageLog[],
  employees: Employee[],
  filename?: string,
): void {
  const empById = new Map(employees.map((e) => [e.id, e]));

  const data = rows.map((r) => {
    const emp = empById.get(r.employeeId);
    return {
      '日期 Date': r.date || '',
      '员工 Employee': r.employeeName || emp?.name || '',
      '工号 Employee ID': emp?.employeeId || '',
      '出发时间 Start': fmtTime(r.startAt),
      '出发读数 Start km': r.startReading ?? '',
      '返回时间 End': fmtTime(r.endAt),
      '返回读数 End km': r.endReading ?? '',
      '里程 Distance km': r.distance ?? '',
    };
  });

  const totalDistance = rows.reduce((a, r) => a + (r.distance || 0), 0);
  data.push({
    '日期 Date': '', '员工 Employee': '', '工号 Employee ID': '',
    '出发时间 Start': '', '出发读数 Start km': '', '返回时间 End': '',
    '返回读数 End km': '合计 Total', '里程 Distance km': totalDistance,
  } as any);

  const ws = XLSX.utils.json_to_sheet(data);
  ws['!cols'] = [
    { wch: 12 }, { wch: 20 }, { wch: 14 }, { wch: 12 },
    { wch: 13 }, { wch: 12 }, { wch: 13 }, { wch: 14 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Mileage');

  const name = filename || `mileage-${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, name);
}
