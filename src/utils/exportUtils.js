import * as XLSX from 'xlsx';

/**
 * Helper to apply uniform column widths to make the sheet look professional.
 */
const applyColumnFormatting = (worksheet, dataArray) => {
  if (!dataArray || dataArray.length === 0) return;
  
  // Find out how many columns we need based on the first row's keys
  const colsCount = Math.max(10, Object.keys(dataArray[0] || {}).length);
  
  // Set all columns to a width of 22 characters for comfortable reading
  worksheet["!cols"] = Array(colsCount).fill({ wch: 22 });
};

export const exportToExcel = (data, baseFileName = "Laundry_Report") => {
  const workbook = XLSX.utils.book_new();

  // 📊 CHECK: Did the component send a Multi-Sheet Object or a Single Array?
  if (typeof data === 'object' && !Array.isArray(data)) {
    
    // MULTI-SHEET MODE
    Object.keys(data).forEach((sheetName) => {
      const sheetData = data[sheetName];
      
      if (Array.isArray(sheetData) && sheetData.length > 0) {
        const worksheet = XLSX.utils.json_to_sheet(sheetData);
        applyColumnFormatting(worksheet, sheetData);
        
        // Excel strictly limits sheet names to 31 characters
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.substring(0, 31));
      }
    });

  } else if (Array.isArray(data) && data.length > 0) {
    
    // 📄 SINGLE-SHEET MODE (Legacy/Fallback)
    const worksheet = XLSX.utils.json_to_sheet(data);
    applyColumnFormatting(worksheet, data);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
    
  } else {
    console.warn("[ExportUtils] No valid data provided for export.");
    return;
  }

  // Generate the date suffix
  const dateSuffix = new Date().toISOString().split('T')[0];
  
  // 🛡️ Prevent double-dating if the component already appended the date string
  const finalFileName = baseFileName.includes(dateSuffix) 
    ? `${baseFileName}.xlsx` 
    : `${baseFileName}_${dateSuffix}.xlsx`;

  // Trigger the browser download
  XLSX.writeFile(workbook, finalFileName);
};