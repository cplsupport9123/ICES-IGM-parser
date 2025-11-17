// App.jsx
import React, { useState } from "react";

/**
 * IGM Viewer + ICES Generator (with full VESINFO parser)
 * - Parses HREC / vesinfo / cargo / contain / TREC
 * - Extracts CFS from cargo (LC token)
 * - Filters, select-by-line, select-all-by-CFS
 * - Generate Option A: full ICES manifest but only filtered cargo + containers
 * - Preview before download
 * - Fixed parser: handles container lines starting with F or V, robust CFS extraction
 * - Added Container No search
 * - Full vesinfo (Part A) parser according to ICES SACHI01 (26 fields)
 */

export default function App() {
  const [input, setInput] = useState("");
  const [fileName, setFileName] = useState("");
  const [data, setData] = useState(null); // { headerLines, vesinfoLines, vesinfoObj, cargos, containers, trecLine }
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

  // Parse VESINFO F-record into structured object (ICES SACHI01 Part A fields 1..26)
  const parseVesinfoFromLines = (vesinfoLines) => {
    if (!vesinfoLines || vesinfoLines.length === 0) return null;
    // find first line that starts with F (record)
    const fLine = vesinfoLines.find((l) => l && l.trim().startsWith("F"));
    if (!fLine) return null;
    const parts = splitRecord(fLine).map((p) => (p === undefined ? "" : p.trim()));

    // Map fields according to spec (1..26). Indexing: parts[0] => 'F', parts[1] => field2, ...
    // We'll take care mapping with appropriate indexes derived from examples:
    const get = (idx) => parts[idx] || "";

    // The official mapping: Field 1 = Message Type -> parts[0] ('F'), Field 2 -> parts[1], Field 3 -> parts[2], Field 4 -> parts[3], ...
    // We'll create an object with labeled fields.
    const ves = {
      rawLine: fLine,
      // Field 1..26
      field1_messageType: get(0), // usually 'F' or 'A'
      field2_customHouseCode: get(1),
      field3_igmNo: get(2),
      field4_igmDate_ddmmyyyy: get(3),
      field5_imoCode: get(4),
      field6_callSign: get(5),
      field7_voyageNo: get(6),
      field8_shippingLineCode: get(7),
      field9_shippingAgentCode: get(8),
      field10_masterName: get(9),
      field11_portOfArrival: get(10),
      field12_lastPortCalled: get(11),
      field13_portPrior12: get(12),
      field14_portPrior13: get(13),
      field15_vesselType: get(14),
      field16_totalNoOfLines: get(15),
      field17_briefCargoDescription: get(16),
      field18_expectedDateTimeArrival: get(17),
      field19_lighthouseDues: get(18),
      field20_sameBottomCargo: get(19),
      field21_shipStoresDeclaration: get(20),
      field22_crewListDeclaration: get(21),
      field23_passengerList: get(22),
      field24_crewEffectDeclaration: get(23),
      field25_maritimeDeclaration: get(24),
      field26_terminalOperatorCode: get(25),
    };

    // Additional handy parsed formats
    // try convert igm date to normalized string if present (DDMMYYYY)
    if (ves.field4_igmDate_ddmmyyyy && ves.field4_igmDate_ddmmyyyy.length === 8) {
      const d = ves.field4_igmDate_ddmmyyyy;
      ves.igmDateISO = `${d.slice(4, 8)}-${d.slice(2, 4)}-${d.slice(0, 2)}`; // YYYY-MM-DD
    }

    return ves;
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
        // crew mapping: in cargo records, fields vary; based on examples earlier:
        // parts[7] => line number (subline), parts[9] => BL, consignee often at 14/15
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

    // parse vesinfo into structured object
    const vesinfoObj = parseVesinfoFromLines(vesinfoLines);

    return { headerLines, vesinfoLines, vesinfoObj, cargos, containers, trecLine };
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
    a.download = "NEW_IGM.igm";
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
    a.download = `NEW_IGM_${cfs}.igm`;
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
      <h1 className="text-2xl font-bold">IGM Viewer +  Generator </h1>

      {/* Upload and Paste */}
      <div>
        <label className="block mb-1 font-medium">Upload IGM (.igm)</label>
        <input type="file" accept=".igm" onChange={handleFile} className="mb-2" />
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
          {/* Show parsed Vesinfo (full fields) */}
          {data.vesinfoObj && (
  <div className="p-6 border rounded-xl bg-gradient-to-br from-white to-gray-50 shadow-md mt-4">
    <h2 className="text-xl font-bold mb-4 text-gray-800 border-l-4 border-blue-600 pl-3">
      VESSEL INFORMATION (Part A)
    </h2>

    {/* VESINFO GRID */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">

      {/* LEFT COLUMN */}
      <div>
        <table className="w-full border-collapse overflow-hidden rounded-lg shadow-sm">
          <tbody>
            {[
              ["Message Type", data.vesinfoObj.field1_messageType],
              ["Custom House Code", data.vesinfoObj.field2_customHouseCode],
              ["IGM No", data.vesinfoObj.field3_igmNo],
              ["IGM Date (DDMMYYYY)", data.vesinfoObj.field4_igmDate_ddmmyyyy],
              ["IMO Code", data.vesinfoObj.field5_imoCode],
              ["Call Sign", data.vesinfoObj.field6_callSign],
              ["Voyage No", data.vesinfoObj.field7_voyageNo],
              ["Shipping Line Code", data.vesinfoObj.field8_shippingLineCode],
              ["Shipping Agent Code", data.vesinfoObj.field9_shippingAgentCode],
              ["Master Name", data.vesinfoObj.field10_masterName],
              ["Port of Arrival", data.vesinfoObj.field11_portOfArrival]
            ].map(([label, value], i) => (
              <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                <td className="border p-2 font-semibold text-gray-700 w-1/2 bg-gray-100">{label}</td>
                <td className="border p-2">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* RIGHT COLUMN */}
      <div>
        <table className="w-full border-collapse overflow-hidden rounded-lg shadow-sm">
          <tbody>
            {[
              ["Last Port Called", data.vesinfoObj.field12_lastPortCalled],
              ["Port Prior (12)", data.vesinfoObj.field13_portPrior12],
              ["Port Prior (13)", data.vesinfoObj.field14_portPrior13],
              ["Vessel Type", data.vesinfoObj.field15_vesselType],
              ["Total No. of Lines", data.vesinfoObj.field16_totalNoOfLines],
              ["Brief Cargo Description", data.vesinfoObj.field17_briefCargoDescription],
              ["ETA / ATA", data.vesinfoObj.field18_expectedDateTimeArrival],
              ["Lighthouse Dues", data.vesinfoObj.field19_lighthouseDues],
              ["Same Bottom Cargo", data.vesinfoObj.field20_sameBottomCargo],
              ["Terminal Operator Code", data.vesinfoObj.field26_terminalOperatorCode]
            ].map(([label, value], i) => (
              <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                <td className="border p-2 font-semibold text-gray-700 w-1/2 bg-gray-100">{label}</td>
                <td className="border p-2">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>

    {/* FLAGS */}
    <h3 className="mt-5 mb-2 text-sm font-semibold text-gray-700">Declarations</h3>
    <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">

      {[
        ["Ship Stores", data.vesinfoObj.field21_shipStoresDeclaration],
        ["Crew List", data.vesinfoObj.field22_crewListDeclaration],
        ["Passenger List", data.vesinfoObj.field23_passengerList],
        ["Crew Effects", data.vesinfoObj.field24_crewEffectDeclaration],
        ["Maritime Decl.", data.vesinfoObj.field25_maritimeDeclaration]
      ].map(([label, value], i) => (
        <div
          key={i}
          className="p-2 border rounded text-center bg-white shadow-sm hover:bg-blue-50 transition"
        >
          <span className="font-medium text-gray-700">{label}: </span>
          <span className="font-bold text-blue-700">{value}</span>
        </div>
      ))}

    </div>
  </div>
)}


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
                    <td className="border p-1 font-semibold">
                      {/* coloured badge */}
                      <span className="inline-block px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800 border border-blue-200">
                        {c.cfs || "—"}
                      </span>
                    </td>
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
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => {
                    const blob = new Blob([previewText], { type: "text/plain" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = "PREVIEW_IGM.txt";
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded"
                >
                  Download Preview
                </button>

                <button
                  onClick={() => setShowPreview(false)}
                  className="px-4 py-2 mt-2 bg-red-600 text-white rounded"
                >
                  Close Preview
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
