import * as XLSX from 'xlsx';
import { Attendance, Employee } from '../types';
import { calculateDuration } from './attendanceUtils';

/**
 * Export consolidated attendance rows to a real .xlsx file the boss can open
 * in Excel. Columns match what the Attendance Audit shows, plus a computed
 * worked-duration. Overtime is intentionally NOT included here (it belongs to
 * the per-day feature, not the historical export).
 */
export function exportAttendanceToXlsx(
  rows: Attendance[],
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
      '部门 Department': emp?.department || '',
      '上班 Check In': r.checkIn && r.checkIn !== '-' ? r.checkIn : '',
      '下班 Check Out': r.checkOut && r.checkOut !== '-' ? r.checkOut : '',
      '时长 Duration': calculateDuration(r.checkIn || '', r.checkOut || '') || '',
      '状态 Status': r.status || '',
      '职责 Duty': r.dutyType || '',
      '地点 Location': r.location?.address || (r.location ? `${r.location.lat}, ${r.location.lng}` : ''),
      '备注 Remarks': r.remarks || '',
    };
  });

  const ws = XLSX.utils.json_to_sheet(data);
  // Reasonable column widths so the file is readable on open.
  ws['!cols'] = [
    { wch: 12 }, { wch: 20 }, { wch: 14 }, { wch: 14 },
    { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
    { wch: 8 }, { wch: 32 }, { wch: 30 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Attendance');

  const name = filename || `attendance-${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, name);
}
