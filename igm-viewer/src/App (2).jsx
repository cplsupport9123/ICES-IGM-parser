import React, { useState } from "react";
import * as XLSX from "xlsx";

export default function App() {
  const [igmText, setIgmText] = useState("");
  const [parsed, setParsed] = useState(null);
  const [selectedLine, setSelectedLine] = useState("");

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setIgmText(ev.target.result);
    reader.readAsText(file);
  };

  const smartExtract = (text, keyword) => {
    const startIdx = text.indexOf(`<${keyword}>`);
    const endIdx = text.indexOf(`<END-${keyword}>`);
    if (startIdx === -1 || endIdx === -1) return "";
    return text.substring(startIdx + keyword.length + 2, endIdx).trim();
  };

  const parseIGM = () => {
    const cargoSection = smartExtract(igmText, "cargo");
    const containSection = smartExtract(igmText, "contain");

    const cargoLines = parseCargo(cargoSection);
    const containerLines = parseContainers(containSection);

    setParsed({ cargoLines, containerLines });
    setSelectedLine("");
  };

  const parseCargo = (section) => {
    if (!section) return [];
    return section
      .split("F")
      .filter((line) => line.trim())
      .map((line) => {
        const p = line.split("\u001d");
        return {
          lineNo: p[7]?.trim(),
          blNo: p[9]?.trim(),
          importer: p[14]?.trim(),
          pkg: p[20]?.trim(),
          pkgType: p[21]?.trim(),
          grossWt: Number(p[22]) || 0,
          desc: p[28]?.trim(),
          cfs: p[19]?.trim(),
        };
      });
  };

  const parseContainers = (section) => {
    if (!section) return [];
    return section
      .split("F")
      .filter((line) => line.trim())
      .map((line) => {
        const p = line.split("\u001d");
        return {
          lineNo: p[7]?.trim(),
          containerNo: p[9]?.trim(),
          seal: p[10]?.trim(),
          pkgs: Number(p[13]) || 0,
          weight: Number(p[14]) || 0,
        };
      });
  };

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    const cargoSheet = XLSX.utils.json_to_sheet(parsed.cargoLines);
    const contSheet = XLSX.utils.json_to_sheet(parsed.containerLines);
    XLSX.utils.book_append_sheet(wb, cargoSheet, "Cargo");
    XLSX.utils.book_append_sheet(wb, contSheet, "Containers");
    XLSX.writeFile(wb, "IGM_Export.xlsx");
  };

  const lineNumbers = parsed ? [...new Set(parsed.cargoLines.map((c) => c.lineNo))] : [];
  const cargoForLine = parsed?.cargoLines?.filter((c) => c.lineNo === selectedLine) || [];
  const contForLine = parsed?.containerLines?.filter((c) => c.lineNo === selectedLine) || [];

  const totalContainerWeight = contForLine.reduce((a, b) => a + b.weight, 0);

  return (
    <div className="min-h-screen p-6 bg-gray-100 text-gray-900">
      <h1 className="text-3xl font-bold mb-4">IGM Parser (With Excel Export & Weight Summary)</h1>

      <input type="file" className="mb-4" onChange={handleFileUpload} />

      <textarea
        className="w-full h-40 p-3 border rounded-lg"
        placeholder="Paste or upload IGM text here"
        value={igmText}
        onChange={(e) => setIgmText(e.target.value)}
      />

      <button
        onClick={parseIGM}
        className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg"
      >
        Parse IGM
      </button>

      {parsed && (
        <button
          onClick={exportToExcel}
          className="ml-3 mt-3 px-4 py-2 bg-green-600 text-white rounded-lg"
        >
          Export to Excel
        </button>
      )}

      {parsed && (
        <div className="mt-6">
          <label className="block mb-2 font-semibold">Select Line Number:</label>
          <select
            className="p-2 border rounded-lg"
            value={selectedLine}
            onChange={(e) => setSelectedLine(e.target.value)}
          >
            <option value="">-- Select --</option>
            {lineNumbers.map((ln) => (
              <option key={ln} value={ln}>{ln}</option>
            ))}
          </select>
        </div>
      )}

      {selectedLine && (
        <>
          <h2 className="text-xl font-bold mt-6">Container Weight Summary</h2>
          <div className="p-3 bg-white shadow rounded mb-4">
            Total Weight: <b>{totalContainerWeight.toFixed(2)}</b>
          </div>

          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-4 rounded-xl shadow">
              <h2 className="text-xl font-bold mb-2">Cargo Details</h2>
              <table className="w-full border">
                <thead>
                  <tr className="bg-gray-200 border-b">
                    <th className="p-2">B/L No</th>
                    <th className="p-2">Importer</th>
                    <th className="p-2">Pkgs</th>
                    <th className="p-2">Gross Wt</th>
                    <th className="p-2">CFS</th>
                  </tr>
                </thead>
                <tbody>
                  {cargoForLine.map((c, i) => (
                    <tr key={i} className="border-b">
                      <td className="p-2">{c.blNo}</td>
                      <td className="p-2">{c.importer}</td>
                      <td className="p-2">{c.pkg} {c.pkgType}</td>
                      <td className="p-2">{c.grossWt}</td>
                      <td className="p-2 font-bold text-blue-700">{c.cfs}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-white p-4 rounded-xl shadow">
              <h2 className="text-xl font-bold mb-2">Container Details</h2>
              <table className="w-full border">
                <thead>
                  <tr className="bg-gray-200 border-b">
                    <th className="p-2">Container No</th>
                    <th className="p-2">Seal</th>
                    <th className="p-2">Pkgs</th>
                    <th className="p-2">Weight</th>
                  </tr>
                </thead>
                <tbody>
                  {contForLine.map((c, i) => (
                    <tr key={i} className="border-b">
                      <td className="p-2">{c.containerNo}</td>
                      <td className="p-2">{c.seal}</td>
                      <td className="p-2">{c.pkgs}</td>
                      <td className="p-2">{c.weight}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}