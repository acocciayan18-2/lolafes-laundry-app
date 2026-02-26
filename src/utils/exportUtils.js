// src/utils/exportUtils.js
import * as XLSX from 'xlsx';

export const exportToExcel = (data, fileName = "Laundry_Report") => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Data");

  // Auto-size columns (Optional but makes the file look professional)
  const max_width = data.reduce((w, r) => Math.max(w, Object.keys(r).length), 10);
  worksheet["!cols"] = Array(max_width).fill({ wch: 20 });

  XLSX.writeFile(workbook, `${fileName}_${new Date().toISOString().split('T')[0]}.xlsx`);
};