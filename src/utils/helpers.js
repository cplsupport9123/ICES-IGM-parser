/**
 * Export cargo and container data to Excel (xlsx) file
 * @param {Array} cargos - Array of cargo objects
 * @param {Array} containers - Array of container objects
 * @param {string} filename - Output filename
 */
import * as XLSX from "xlsx";
export function exportToExcel(cargos, containers, filename = "igm_export.xlsx") {
  const cargoSheet = XLSX.utils.json_to_sheet(cargos);
  const containerSheet = XLSX.utils.json_to_sheet(containers);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, cargoSheet, "Cargo");
  XLSX.utils.book_append_sheet(wb, containerSheet, "Containers");
  XLSX.writeFile(wb, filename);
}
/**
 * UI & Common Utilities
 */

/**
 * Create a downloader callback that triggers a file download
 * @returns {function} - Function that takes (content, filename) and triggers download
 */
export const useDownloader = () => {
  return (content, filename) => {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
};

/**
 * Create an error collector function
 * @returns {function} - Function that accepts error object and adds to collector
 */
export const createErrorCollector = () => {
  const collector = [];
  const addError = (err) => {
    collector.push({
      lineNumber: err.lineNumber || null,
      lineText: err.lineText || null,
      message: err.message || "Unknown error",
      severity: err.severity || "error",
    });
  };
  return { collector, addError };
};
