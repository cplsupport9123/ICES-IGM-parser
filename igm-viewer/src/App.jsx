// App.jsx
import React, { useState } from "react";

/**
 * IGM Viewer + ICES Generator
 * - Parses HREC / vesinfo / cargo / contain / TREC
 * - Extracts CFS from cargo (LC token)
 * - Filters, select-by-line, select-all-by-CFS
 * - Generate Option A: full ICES manifest but only filtered cargo + containers
 * - Preview before download
 * - Fixed parser: handles container lines starting with F or V, robust CFS extraction
 * - Added Container No search
 */

export default function App() {
  const [input, setInput] = useState("");
  const [fileName, setFileName] = useState("");
  const [data, setData] = useState(null); // { headerLines:[], vesinfo:[], cargos:{}, containers:[], trec: "" }
  const [filters, setFilters] = useState({ line: "", cfs: "" });
  const [selectedLines, setSelectedLines] = useState([]);
  const [previewText, setPreviewText] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  // Search for Container No
  const [containerSearch, setContainerSearch] = useState("");

  // Utility: split by GS control char or visible glyph or fallback to pipe '|'
  const splitRecord = (line) => {
    const gs = String.fromCharCode(29);
    if (line.includes(gs)) return line.split(gs);
    if (line.includes("")) return line.split("");
    return line.split(/\|/);
  };

  // Parse the full IGM including headers, vesinfo, cargo and container sections and TREC
  const parseIGM = (text) => {
    const rawLines = text.split(/\r?\n/);

    const headerLines = [];
    let vesinfoLines = [];
    let inVesinfo = false;

    let inManifest = false;
    let inCargo = false;
    let inContain = false;

    const cargos = {}; 
    const containers = [];
    let trecLine = "";

    for (let raw of rawLines) {
      const line = raw;
      const t = line.trim();

      if (!inManifest) {
        headerLines.push(line);
        if (t.toLowerCase().startsWith("<manifest>")) {
          inManifest = true;
          continue;
        } else {
          continue;
        }
      }

      // vesinfo
      if (t.toLowerCase().startsWith("<vesinfo>")) {
        inVesinfo = true;
        vesinfoLines.push(line);
        continue;
      }
      if (inVesinfo) {
        vesinfoLines.push(line);
        if (t.toLowerCase().startsWith("<end-vesinfo>")) {
          inVesinfo = false;
        }
        continue;
      }

      // cargo / contain / markers
      if (t.toLowerCase().startsWith("<cargo>")) {
        inCargo = true;
        continue;
      }
      if (t.toLowerCase().startsWith("<end-cargo>")) {
        inCargo = false;
        continue;
      }
      if (t.toLowerCase().startsWith("<contain>")) {
        inContain = true;
        continue;
      }
      if (t.toLowerCase().startsWith("<end-contain>")) {
        inContain = false;
        continue;
      }
      if (t.toLowerCase().startsWith("<end-manifest>")) {
        continue;
      }

      if (t.startsWith("TREC")) {
        trecLine = line;
        continue;
      }

      // Cargo F-records
      if (inCargo && t.startsWith("F")) {
        const parts = splitRecord(line).map((p) => (p === undefined ? "" : p.trim()));
        const lineNo = parts[7] || "";
        const bl = parts[9] || "";
        const consignee = parts[14] || parts[15] || "";

        // Extract CFS: search for LC token
        let cfs = "";
        const lcIndex = parts.findIndex((p) => p === "LC");
        if (lcIndex !== -1 && parts[lcIndex + 1]) {
          cfs = parts[lcIndex + 1];
        } else {
          const candidate = parts.find((p) => p && /INCCU/i.test(p));
          if (candidate) cfs = candidate;
        }

        if (lineNo) {
          cargos[lineNo] = {
            line: lineNo,
            bl,
            consignee,
            cfs,
            raw: line,
          };
        }
        continue;
      }

      // Container F or V-records
      if (inContain && (t.startsWith("F") || t.startsWith("V"))) {
        const parts = splitRecord(line).map((p) => (p === undefined ? "" : p.trim()));
        const lineNo = parts[7] || "";
        const containerNo = parts[9] || "";
        const seal = parts[10] || "";
        const pkgs = parts[12] || "";
        const weight = parts[13] || "";

        const cargo = lineNo && cargos[lineNo] ? cargos[lineNo] : null;
        containers.push({
          line: lineNo,
          containerNo,
          seal,
          pkgs,
          weight,
          cfs: cargo ? cargo.cfs : "",
          bl: cargo ? cargo.bl : "",
          consignee: cargo ? cargo.consignee : "",
          raw: line,
        });
        continue;
      }
    }

    return { headerLines, vesinfoLines, cargos, containers, trecLine };
  };

  // File upload
  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      setInput(text);
      const parsed = parseIGM(text);
      setData(parsed);
      setSelectedLines([]);
      setFilters({ line: "", cfs: "" });
      setContainerSearch("");
    };
    reader.readAsText(file);
  };

  // Manual parse
  const handleParse = () => {
    const parsed = parseIGM(input);
    setData(parsed);
    setSelectedLines([]);
    setFilters({ line: "", cfs: "" });
    setContainerSearch("");
  };

  const unique = (arr) => [...new Set(arr.filter(Boolean))];
  const containerLines = data ? unique(data.containers.map((c) => c.line)) : [];
  const cfsList = data ? unique(data.containers.map((c) => c.cfs || (data.cargos[c.line]?.cfs || ""))) : [];

  const filteredContainers = () => {
    if (!data) return [];
    return data.containers.filter((c) => {
      return (
        (!filters.line || String(c.line) === String(filters.line)) &&
        (!filters.cfs || (c.cfs || "") === filters.cfs) &&
        (!containerSearch || (c.containerNo || "").toLowerCase().includes(containerSearch.toLowerCase()))
      );
    });
  };

  const selectAllForCFS = () => {
    if (!filters.cfs || !data) return;
    const lines = unique(data.containers.filter((c) => (c.cfs || "") === filters.cfs).map((c) => c.line));
    setSelectedLines(lines);
  };

  const toggleSelectLine = (lineNo) => {
    if (selectedLines.includes(lineNo)) {
      setSelectedLines(selectedLines.filter((l) => l !== lineNo));
    } else {
      setSelectedLines([...selectedLines, lineNo]);
    }
  };

  // Generate IGM for selected lines (Option A)
  const generateIGMSelectedLines = () => {
    if (!data || selectedLines.length === 0) return;
    const headerText = (data.headerLines || []).join("\n") + "\n";
    const ves = (data.vesinfoLines && data.vesinfoLines.length > 0) ? data.vesinfoLines.join("\n") + "\n\n" : "";

    let cargoText = "<cargo>\n";
    for (const ln of selectedLines) {
      const cargo = data.cargos[ln];
      if (cargo && cargo.raw) cargoText += cargo.raw + "\n";
    }
    cargoText += "<END-cargo>\n\n";

    let containText = "<contain>\n";
    for (const cont of data.containers) {
      if (selectedLines.includes(cont.line) && cont.raw) containText += cont.raw + "\n";
    }
    containText += "<END-contain>\n";

    const endManifest = "\n<END-manifest>\n";
    const trecText = data.trecLine ? data.trecLine + "\n" : "";

    const full = headerText + ves + cargoText + containText + endManifest + trecText;

    const blob = new Blob([full], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "NEW_IGM.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  // Generate IGM for CFS
  const generateIGMForCFS = (cfs) => {
    if (!data || !cfs) return;
    const headerText = (data.headerLines || []).join("\n") + "\n";
    const ves = (data.vesinfoLines && data.vesinfoLines.length > 0) ? data.vesinfoLines.join("\n") + "\n\n" : "";

    const cargoLines = Object.values(data.cargos).filter((c) => (c.cfs || "") === cfs);
    const cargoText = "<cargo>\n" + cargoLines.map((c) => c.raw).filter(Boolean).join("\n") + "\n<END-cargo>\n\n";

    const containerLines = data.containers.filter((c) => (c.cfs || "") === cfs);
    const containText = "<contain>\n" + containerLines.map((c) => c.raw).filter(Boolean).join("\n") + "\n<END-contain>\n";

    const endManifest = "\n<END-manifest>\n";
    const trecText = data.trecLine ? data.trecLine + "\n" : "";

    const full = headerText + ves + cargoText + containText + endManifest + trecText;

    const blob = new Blob([full], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `NEW_IGM_${cfs}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const previewForCFS = (cfs) => {
    if (!data || !cfs) return;

    const headerText = (data.headerLines || []).join("\n") + "\n";
    const ves = (data.vesinfoLines && data.vesinfoLines.length > 0) ? data.vesinfoLines.join("\n") + "\n\n" : "";

    const cargoLines = Object.values(data.cargos).filter((c) => (c.cfs || "") === cfs);
    const cargoText = "<cargo>\n" + cargoLines.map((c) => c.raw).filter(Boolean).join("\n") + "\n<END-cargo>\n\n";

    const containerLines = data.containers.filter((c) => (c.cfs || "") === cfs);
    const containText = "<contain>\n" + containerLines.map((c) => c.raw).filter(Boolean).join("\n") + "\n<END-contain>\n";

    const endManifest = "\n<END-manifest>\n";
    const trecText = data.trecLine ? data.trecLine + "\n" : "";

    setPreviewText(headerText + ves + cargoText + containText + endManifest + trecText);
    setShowPreview(true);
  };

  const previewForSelectedLines = () => {
    if (!data || selectedLines.length === 0) return;
    const headerText = (data.headerLines || []).join("\n") + "\n";
    const ves = (data.vesinfoLines && data.vesinfoLines.length > 0) ? data.vesinfoLines.join("\n") + "\n\n" : "";

    let cargoText = "<cargo>\n";
    for (const ln of selectedLines) {
      const cargo = data.cargos[ln];
      if (cargo && cargo.raw) cargoText += cargo.raw + "\n";
    }
    cargoText += "<END-cargo>\n\n";

    let containText = "<contain>\n";
    for (const cont of data.containers) {
      if (selectedLines.includes(cont.line) && cont.raw) containText += cont.raw + "\n";
    }
    containText += "<END-contain>\n";

    const endManifest = "\n<END-manifest>\n";
    const trecText = data.trecLine ? data.trecLine + "\n" : "";

    setPreviewText(headerText + ves + cargoText + containText + endManifest + trecText);
    setShowPreview(true);
  };

  // UI
  return (
    <div className="p-6 font-sans space-y-6">
      <h1 className="text-2xl font-bold">IGM Viewer + ICES Generator (Option A)</h1>

      {/* Upload and Paste */}
      <div>
        <label className="block mb-1 font-medium">Upload IGM (.txt)</label>
        <input type="file" accept=".txt" onChange={handleFile} className="mb-2" />
        {fileName && <div className="text-sm italic mb-2">Loaded: {fileName}</div>}

        <div className="mt-2">
          <label className="block font-medium">Or paste IGM text</label>
          <textarea
            className="w-full h-40 border p-2"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste raw IGM content here..."
          />
        </div>

        <div className="mt-2 flex gap-2">
          <button onClick={handleParse} className="bg-blue-600 text-white px-4 py-2 rounded">
            Parse
          </button>

          <button
            onClick={() => {
              setInput("");
              setData(null);
              setFileName("");
              setSelectedLines([]);
              setFilters({ line: "", cfs: "" });
              setContainerSearch("");
            }}
            className="bg-gray-400 text-white px-4 py-2 rounded"
          >
            Reset
          </button>
        </div>
      </div>

      {!data && <div className="text-gray-600">Upload or paste IGM and click Parse.</div>}

      {data && (
        <>
          {/* Filters area */}
          <div className="p-4 border rounded bg-gray-50">
            <h2 className="text-lg font-semibold mb-2">Filters & CFS Tools</h2>

            <div className="flex gap-6 items-end">
              <div>
                <label className="block text-sm font-medium">Line</label>
                <select
                  className="border p-2"
                  value={filters.line}
                  onChange={(e) => setFilters({ ...filters, line: e.target.value })}
                >
                  <option value="">All</option>
                  {containerLines.map((ln) => (
                    <option key={ln} value={ln}>
                      {ln}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium">CFS</label>
                <select
                  className="border p-2"
                  value={filters.cfs}
                  onChange={(e) => setFilters({ ...filters, cfs: e.target.value })}
                >
                  <option value="">All</option>
                  {cfsList.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium">Container No</label>
                <input
                  type="text"
                  className="border p-2"
                  placeholder="Search Container No"
                  value={containerSearch}
                  onChange={(e) => setContainerSearch(e.target.value)}
                />
              </div>

              <div className="flex gap-2">
                {filters.cfs && (
                  <>
                    <button onClick={selectAllForCFS} className="px-4 py-2 bg-purple-600 text-white rounded">
                      Select All (This CFS)
                    </button>

                    <button
                      onClick={() => previewForCFS(filters.cfs)}
                      className="px-4 py-2 bg-indigo-600 text-white rounded"
                    >
                      Preview (This CFS)
                    </button>

                    <button
                      onClick={() => generateIGMForCFS(filters.cfs)}
                      className="px-4 py-2 bg-green-700 text-white rounded"
                    >
                      Generate IGM for This CFS
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Selected-lines actions */}
          <div className="p-4 border rounded bg-green-50">
            <h2 className="text-lg font-semibold mb-2">Generate New IGM (Selected Lines)</h2>
            <p className="text-sm mb-2">Select Line Nos from the table and click Generate.</p>

            <div className="flex gap-2">
              <button
                onClick={generateIGMSelectedLines}
                disabled={selectedLines.length === 0}
                className={`px-4 py-2 text-white rounded ${selectedLines.length === 0 ? "bg-gray-400" : "bg-green-600"}`}
              >
                Generate NEW_IGM.txt
              </button>

              <button
                onClick={previewForSelectedLines}
                disabled={selectedLines.length === 0}
                className={`px-4 py-2 text-white rounded ${selectedLines.length === 0 ? "bg-gray-300" : "bg-indigo-600"}`}
              >
                Preview Selected Lines
              </button>

              <div className="text-sm italic self-center">
                {selectedLines.length} line(s) selected
              </div>
            </div>
          </div>

          {/* Containers table with CFS badges */}
          <div className="p-4 border rounded">
            <h2 className="text-lg font-semibold mb-2">Containers</h2>

            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="border p-1">Select</th>
                  <th className="border p-1">Line</th>
                  <th className="border p-1">Container</th>
                  <th className="border p-1">Seal</th>
                  <th className="border p-1">Weight</th>
                  <th className="border p-1">CFS</th>
                  <th className="border p-1">Consignee</th>
                </tr>
              </thead>
              <tbody>
                {filteredContainers().map((c) => (
                  <tr key={`${c.containerNo}_${c.line}`}>
                    <td className="border p-1 text-center">
                      <input
                        type="checkbox"
                        checked={selectedLines.includes(c.line)}
                        onChange={() => toggleSelectLine(c.line)}
                      />
                    </td>
                    <td className="border p-1 text-center">{c.line}</td>
                    <td className="border p-1">{c.containerNo}</td>
                    <td className="border p-1">{c.seal}</td>
                    <td className="border p-1">{c.weight}</td>
                    <td className="border p-1">{c.cfs}</td>
                    <td className="border p-1">{c.consignee}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Preview */}
          {showPreview && (
            <div className="p-4 border rounded bg-yellow-50">
              <h2 className="text-lg font-semibold mb-2">Preview</h2>
              <pre className="overflow-x-auto max-h-96">{previewText}</pre>
              <button
                onClick={() => setShowPreview(false)}
                className="px-4 py-2 mt-2 bg-red-600 text-white rounded"
              >
                Close Preview
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
