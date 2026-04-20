/**
 * @file exportUtils.js
 * @description Enterprise Excel Export Utility.
 * Features: Auto-fitting columns, Header styling, and Multi-sheet memory safety.
 * NOTE: Requires 'xlsx-js-style' instead of 'xlsx' to render visual styles.
 */

import * as XLSX from 'xlsx-js-style';

// ==========================================
// 🎨 STYLING & FORMATTING UTILITIES
// ==========================================

/**
 * @description Dynamically calculates the optimal width for each column based on content size.
 */
const applyAutoFitColumns = (worksheet, dataArray) => {
  if (!Array.isArray(dataArray) || dataArray.length === 0) return;

  const keys = Object.keys(dataArray[0] || {});
  const colWidths = keys.map(key => ({ wch: key.length + 4 })); // Baseline width = header length

  // Scan to find the longest string in each column
  for (let i = 0; i < dataArray.length; i++) {
    const row = dataArray[i];
    for (let j = 0; j < keys.length; j++) {
      const cellValue = row[keys[j]];
      const cellLength = cellValue ? String(cellValue).length : 0;
      
      if (cellLength + 4 > colWidths[j].wch) {
        colWidths[j].wch = Math.min(cellLength + 4, 50); // Cap width at 50 chars so it doesn't break screens
      }
    }
  }

  worksheet["!cols"] = colWidths;
};

/**
 * @description Applies an enterprise-grade dark blue header with bold white text.
 */
const applyHeaderStyles = (worksheet) => {
  if (!worksheet['!ref']) return;
  
  const range = XLSX.utils.decode_range(worksheet['!ref']);
  
  for (let C = range.s.c; C <= range.e.c; ++C) {
    const address = XLSX.utils.encode_cell({ c: C, r: 0 }); // Target Row 0 (The Headers)
    
    if (!worksheet[address]) continue;
    
    // Paint the header cells!
    worksheet[address].s = {
      font: { 
        bold: true, 
        color: { rgb: "FFFFFF" },
        sz: 12 
      },
      fill: { 
        fgColor: { rgb: "0F172A" } // Dark Slate Blue matching your app-dark theme
      },
      alignment: { 
        horizontal: "center", 
        vertical: "center",
        wrapText: true
      },
      border: {
        bottom: { style: "medium", color: { rgb: "3B82F6" } } // Light blue accent line
      }
    };
  }
};

// ==========================================
// 🚀 MAIN EXPORT ENGINE
// ==========================================

export const exportToExcel = async (data, baseFileName = "Laundry_Report") => {
  try {
    if (!data || (typeof data !== 'object' && !Array.isArray(data))) {
      throw new Error("Invalid payload: Data must be an array or an object of arrays.");
    }

    const workbook = XLSX.utils.book_new();
    let hasData = false;

    // ✨ MULTI-SHEET LOGIC: This parses the "Executive Summary" and "Raw Database Dump"
    if (typeof data === 'object' && !Array.isArray(data)) {
      
      const sheetNames = Object.keys(data);
      
      for (let i = 0; i < sheetNames.length; i++) {
        const sheetName = sheetNames[i];
        const sheetData = data[sheetName];
        
        if (Array.isArray(sheetData) && sheetData.length > 0) {
          hasData = true;
          const worksheet = XLSX.utils.json_to_sheet(sheetData);
          
          // Apply Enhancements
          applyAutoFitColumns(worksheet, sheetData);
          applyHeaderStyles(worksheet);
          
          // Excel strictly limits sheet names to 31 characters
          const safeSheetName = String(sheetName).replace(/[[\]*?:/\\]/g, "").substring(0, 31);
          XLSX.utils.book_append_sheet(workbook, worksheet, safeSheetName);
        }
      }

    } 
    // Fallback: Single-Sheet Processing Pipeline
    else if (Array.isArray(data) && data.length > 0) {
      hasData = true;
      const worksheet = XLSX.utils.json_to_sheet(data);
      
      applyAutoFitColumns(worksheet, data);
      applyHeaderStyles(worksheet);
      
      XLSX.utils.book_append_sheet(workbook, worksheet, "Data Export");
    }

    if (!hasData) {
      console.warn("[ExportUtils] Empty dataset. Aborting export.");
      throw new Error("No data available to export.");
    }

    // Generate Secure Filename
    const dateSuffix = new Date().toISOString().split('T')[0];
    const safeBaseName = String(baseFileName).replace(/[<>:"/\\|?*]+/g, '_'); 
    const finalFileName = safeBaseName.includes(dateSuffix) 
      ? `${safeBaseName}.xlsx` 
      : `${safeBaseName}_${dateSuffix}.xlsx`;

    // Trigger Download
    XLSX.writeFile(workbook, finalFileName);
    
    return { success: true };

  } catch (error) {
    console.error("[ExportUtils] Fatal Error during Excel generation:", error);
    throw error; 
  }
};