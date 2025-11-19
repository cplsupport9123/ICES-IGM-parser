// src/App.jsx
import React, { useState, useCallback, useMemo } from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Paper from "@mui/material/Paper";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Box from "@mui/material/Box";
import Modal from "@mui/material/Modal";
import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import IconButton from "@mui/material/IconButton";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Checkbox from "@mui/material/Checkbox";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import DownloadIcon from "@mui/icons-material/Download";
import PreviewIcon from "@mui/icons-material/Preview";
import CloseIcon from "@mui/icons-material/Close";
import SailingIcon from "@mui/icons-material/Sailing";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import VisibilityIcon from "@mui/icons-material/Visibility";
import SaveAltIcon from "@mui/icons-material/SaveAlt";
import FileUploadIcon from "@mui/icons-material/FileUpload";
import { useTheme } from "@mui/material/styles";


// ------------------ Constants & Utilities ------------------

// exact GS character used in your IGM samples (literal Group Separator)
const GS = ""; // 0x1D

const useDownloader = () =>
  useCallback((content, filename) => {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

const splitRecord = (line) => {
  if (!line) return [];
  if (line.includes(GS)) return line.split(GS).map((s) => (s === undefined ? "" : s));
  if (line.includes("")) return line.split("").map((s) => (s === undefined ? "" : s));
  return line.split("|").map((s) => (s === undefined ? "" : s));
};

const unique = (arr) => [...new Set((arr || []).filter(Boolean))];

const pad = (n, len = 4) => String(n).padStart(len, " ");

// build context preview around a line index (1-based)
const buildContextPreview = (rawLines, lineNumber, ctx = 6) => {
  if (!rawLines || rawLines.length === 0) return "";
  if (!lineNumber) return rawLines.join("\n");
  const idx = Math.max(0, (lineNumber || 1) - 1);
  const start = Math.max(0, idx - ctx);
  const end = Math.min(rawLines.length - 1, idx + ctx);
  return rawLines.slice(start, end + 1).map((l, i) => {
    const ln = start + i + 1;
    const pointer = ln === lineNumber ? ">>" : "  ";
    return `${pointer} ${pad(ln)} | ${l}`;
  }).join("\n");
};

// ------------------ Parsers & Validators ------------------

const parseVesinfoFromLines = (vesinfoLines) => {
  if (!vesinfoLines || vesinfoLines.length === 0) return null;
  const fLine = vesinfoLines.find((l) => l && l.trim().startsWith("F"));
  if (!fLine) return null;
  const parts = splitRecord(fLine).map((p) => (p === undefined ? "" : p.trim()));
  const get = (i) => parts[i] || "";
  const ves = {
    rawLine: fLine,
    field1_messageType: get(0),
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

  if (ves.field4_igmDate_ddmmyyyy && ves.field4_igmDate_ddmmyyyy.length === 8) {
    const d = ves.field4_igmDate_ddmmyyyy;
    ves.igmDateISO = `${d.slice(4, 8)}-${d.slice(2, 4)}-${d.slice(0, 2)}`;
  }

  if (ves.field18_expectedDateTimeArrival) {
    const raw = ves.field18_expectedDateTimeArrival.replace(/\s+/g, "");
    if (/^\d{8}\d{4}$/.test(raw)) {
      ves.etaISO = `${raw.slice(4, 8)}-${raw.slice(2, 4)}-${raw.slice(0, 2)}T${raw.slice(8, 10)}:${raw.slice(10, 12)}:00`;
    } else if (/^\d{8}$/.test(raw)) {
      ves.etaISO = `${raw.slice(4, 8)}-${raw.slice(2, 4)}-${raw.slice(0, 2)}`;
    } else {
      ves.etaRaw = ves.field18_expectedDateTimeArrival;
    }
  }

  return ves;
};

// cargo validation (best-effort)
const validateCargoLine = (parts, lineNumber, addError, cargosSoFar) => {
  const get = (i) => (parts[i] || "").trim();
  const lineNo = get(7);
  const subLine = get(8);
  const blNo = get(9);
  const nature = get(23) || get(24) || "";
  if (!lineNo) {
    addError({ lineNumber, lineText: parts.join(GS), message: "Cargo F-line missing Line No (field 8).", severity: "error" });
  } else {
    if (!/^\d{1,4}$/.test(lineNo)) {
      addError({ lineNumber, lineText: parts.join(GS), message: `Invalid Line No '${lineNo}'. Must be numeric 1-9999.`, severity: "error" });
    }
    if (cargosSoFar[lineNo]) {
      addError({ lineNumber, lineText: parts.join(GS), message: `Duplicate Line No ${lineNo}.`, severity: "warning" });
    }
  }
  if (subLine && subLine !== "0") {
    addError({ lineNumber, lineText: parts.join(GS), message: `Sub Line should be 0 for initial filing; found '${subLine}'.`, severity: "warning" });
  }
  if (!nature) {
    addError({ lineNumber, lineText: parts.join(GS), message: "Nature of Cargo missing (field 24).", severity: "error" });
  } else {
    if (!/^(C|P|LB|DB|CP)$/i.test(nature)) {
      addError({ lineNumber, lineText: parts.join(GS), message: `Unknown Nature of Cargo '${nature}'. Expected C,P,LB,DB,CP.`, severity: "warning" });
    }
  }
  if (blNo && blNo.toUpperCase() === "EMPTY") {
    addError({ lineNumber, lineText: parts.join(GS), message: "B/L No is 'EMPTY' (empty container import). Many other fields may be optional.", severity: "info" });
  }
  const houseBl = get(14); const houseBlDate = get(15);
  if (houseBl && !houseBlDate) {
    addError({ lineNumber, lineText: parts.join(GS), message: "House B/L No provided but House B/L Date missing.", severity: "error" });
  }
};

// container validation
const validateContainerLine = (parts, lineNumber, addError) => {
  const get = (i) => (parts[i] || "").trim();
  const lineNo = get(7);
  const containerNo = get(9);
  const status = get(12) || get(13);
  const iso = get(15);
  const soc = get(16);
  if (!lineNo) {
    addError({ lineNumber, lineText: parts.join(GS), message: "Container line missing cargo Line Number (field 8).", severity: "error" });
  } else if (!/^\d{1,4}$/.test(lineNo)) {
    addError({ lineNumber, lineText: parts.join(GS), message: `Invalid Line No on container '${lineNo}'.`, severity: "error" });
  }
  if (!containerNo) {
    addError({ lineNumber, lineText: parts.join(GS), message: "Container No missing (field 10).", severity: "error" });
  } else {
    if (!(containerNo.length >= 7 && containerNo.length <= 12)) {
      addError({ lineNumber, lineText: parts.join(GS), message: `Container No '${containerNo}' length unusual.`, severity: "warning" });
    }
  }
  if (status && !/^(FCL|LCL|EMP)$/i.test(status)) {
    addError({ lineNumber, lineText: parts.join(GS), message: `Container status '${status}' unexpected (expected FCL/LCL/EMP).`, severity: "warning" });
  }
  if (iso && iso.length > 4) {
    addError({ lineNumber, lineText: parts.join(GS), message: `ISO code '${iso}' seems too long (>4).`, severity: "warning" });
  }
  if (soc && !/^[YN]$/i.test(soc)) {
    addError({ lineNumber, lineText: parts.join(GS), message: `SOC flag should be Y or N. Got '${soc}'.`, severity: "warning" });
  }
};

// main parser
const parseIGM = (text, addError) => {
  const rawLines = text.split(/\r?\n/);
  const headerLines = [];
  const vesinfoLines = [];
  const cargos = {};
  const containers = [];
  let inManifest = false, inVesinfo = false, inCargo = false, inContain = false;
  let trecLine = "";

  try {
    rawLines.forEach((raw, idx) => {
      const lineNumber = idx + 1;
      const line = raw || "";
      const t = line.trim();

      if (!inManifest) {
        headerLines.push(line);
        if (t.toLowerCase().startsWith("<manifest>")) { inManifest = true; return; }
        return;
      }

      if (t.toLowerCase().startsWith("<vesinfo>")) { inVesinfo = true; vesinfoLines.push(line); return; }
      if (inVesinfo) {
        vesinfoLines.push(line);
        if (t.toLowerCase().startsWith("<end-vesinfo>")) inVesinfo = false;
        return;
      }

      if (t.toLowerCase().startsWith("<cargo>") || t.toLowerCase().startsWith("<linfo>")) { inCargo = true; return; }
      if (inCargo && (t.toLowerCase().startsWith("<end-cargo>") || t.toLowerCase().startsWith("<end-linfo>"))) { inCargo = false; return; }

      if (t.toLowerCase().startsWith("<contain>")) { inContain = true; return; }
      if (t.toLowerCase().startsWith("<end-contain>")) { inContain = false; return; }
      if (t.toLowerCase().startsWith("<end-manifest>")) { return; }
      if (t.startsWith("TREC")) { trecLine = line; return; }

      // cargo lines: they typically start with F (or V/S etc) — treat lines inside cargo section with F/V/S/A/D
      if (inCargo && /^[FVSAD]/i.test(t.charAt(0))) {
        const parts = splitRecord(line).map((p) => (p === undefined ? "" : p.trim()));
        validateCargoLine(parts, lineNumber, addError, cargos);
        const lineNo = parts[7] || "";
        const blNo = parts[9] || "";
        const consignee = parts[15] || parts[16] || "";
        const lcIndex = parts.findIndex((p) => p === "LC");
        let cfs = "";
        if (lcIndex !== -1 && parts[lcIndex + 1]) cfs = parts[lcIndex + 1];
        else {
          const cand = parts.find((p) => p && /INCCU/i.test(p));
          if (cand) cfs = cand;
        }
        const uno = parts[35] || parts[36] || parts.find(p => /^\d{5}$/.test(p));
        const imco = parts[36] || parts[37] || parts.find(p => /^\d{3}$/.test(p));
        const goodsDesc = parts[34] || parts[35] || parts.join(" ");
        const nature = parts[23] || parts[24] || "";
        if (lineNo) {
          cargos[lineNo] = {
            raw: line,
            parts,
            lineNumber,
            line: lineNo,
            blNo,
            consignee,
            cfs,
            uno: uno || "",
            imco: imco || "",
            goodsDesc: goodsDesc || "",
            nature: nature || "",
          };
        }
        return;
      }

      // container lines (strict message type at first field)
      if (inContain) {
        const firstChar = t.charAt(0);
        if (/^[VFSAD]$/i.test(firstChar)) {
          const parts = splitRecord(line).map((p) => (p === undefined ? "" : p.trim()));
          const msgType = (parts[0] || "").toUpperCase();
          if (!["V", "F", "S", "A", "D"].includes(msgType)) {
            addError({ lineNumber, lineText: line, message: `Container line does not start with valid message type (V/F/S/A/D): found '${parts[0]}'`, severity: "warning" });
          }
          validateContainerLine(parts, lineNumber, addError);
          const lineNo = parts[7] || "";
          const containerNo = parts[9] || "";
          const seal = parts[10] || "";
          const status = parts[12] || parts[13] || "";
          const noOfPkgs = parts[14] || "";
          const weight = parts[15] || parts[14] || "";
          const iso = parts[15] || "";
          const soc = parts[16] || "";
          const cfs = (lineNo && cargos[lineNo]) ? cargos[lineNo].cfs || "" : "";
          const consignee = (lineNo && cargos[lineNo]) ? cargos[lineNo].consignee || "" : "";
          containers.push({
            raw: line,
            parts,
            lineNumber,
            msgType,
            line: lineNo,
            containerNo,
            seal,
            status,
            noOfPkgs,
            weight,
            iso,
            soc,
            cfs,
            consignee,
          });
          return;
        } else {
          // ignore other lines inside contain block
        }
      }

      // other content ignored
    });

    // structural checks
    const lower = text.toLowerCase();
    if (!lower.includes("<manifest>") || !lower.includes("<end-manifest>")) {
      addError({ lineNumber: null, lineText: null, message: "Manifest <manifest> or <END-manifest> tag missing.", severity: "error" });
    }
    if (!lower.includes("<cargo>") && !lower.includes("<linfo>")) {
      addError({ lineNumber: null, lineText: null, message: "Cargo block <cargo> (or <linfo>) missing.", severity: "warning" });
    }
    const cargoLines = Object.values(cargos);
    const containerRequired = cargoLines.some(c => /^(C|CP)$/i.test((c.nature || "").toString()));
    if (containerRequired && containers.length === 0) {
      addError({ lineNumber: null, lineText: null, message: "Container block missing but required for containerized cargo.", severity: "error" });
    }
    containers.forEach((cont) => {
      if (cont.line && !cargos[cont.line]) {
        addError({ lineNumber: cont.lineNumber, lineText: cont.raw, message: `Container references unknown cargo line ${cont.line}.`, severity: "warning" });
      }
    });
  } catch (err) {
    addError({ lineNumber: null, lineText: null, message: `Parsing exception: ${err?.message || String(err)}`, severity: "error" });
  }

  const vesinfoObj = parseVesinfoFromLines(vesinfoLines);
  return { headerLines, vesinfoLines, vesinfoObj, cargos, containers, trecLine, rawLines };
};

// ------------------ UI Components ------------------

const VesinfoCard = ({ ves }) => {
  if (!ves) return null;
  const fields = [
    ["IGM No.", ves.field3_igmNo],
    ["IGM Date", ves.field4_igmDate_ddmmyyyy],
    ["Voyage No.", ves.field7_voyageNo],
    ["IMO Code", ves.field5_imoCode],
    ["Call Sign", ves.field6_callSign],
    ["Port of Arrival", ves.field11_portOfArrival],
    ["Last Port Called", ves.field12_lastPortCalled],
    ["Custom House", ves.field2_customHouseCode],
    ["Shipping Line", ves.field8_shippingLineCode],
    ["Shipping Agent", ves.field9_shippingAgentCode],
    ["Master Name", ves.field10_masterName],
    ["Vessel Type", ves.field15_vesselType],
    ["Terminal Code", ves.field26_terminalOperatorCode],
    ["ETA / ATA", ves.field18_expectedDateTimeArrival],
  ];
  const decls = [
    ["Ship", ves.field21_shipStoresDeclaration],
    ["Crew", ves.field22_crewListDeclaration],
    ["Passenger", ves.field23_passengerList],
    ["Crew Effects", ves.field24_crewEffectDeclaration],
    ["Maritime", ves.field25_maritimeDeclaration],
  ];
  return (
    <Card sx={{ mt: 2, borderRadius: 2, boxShadow: 3 }}>
      <CardContent>
        <Stack direction="row" spacing={1.5} alignItems="center" mb={1}>
          <SailingIcon color="primary" />
          <Typography variant="h6">Vessel Information</Typography>
        </Stack>
        <Grid container spacing={1}>
          {fields.map((f, i) => (
            <Grid item xs={12} sm={6} key={i}>
              <Typography variant="caption" color="text.secondary">{f[0]}</Typography>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>{f[1] || "—"}</Typography>
            </Grid>
          ))}
        </Grid>
        <Divider sx={{ my: 1 }} />
        <Typography variant="subtitle2">Declarations</Typography>
        <Stack direction="row" spacing={1} mt={1} flexWrap="wrap">
          {decls.map((d, i) => <Chip key={i} label={`${d[0]}: ${d[1] || "?"}`} size="small" color={d[1] === "Y" ? "success" : "default"} />)}
        </Stack>
      </CardContent>
    </Card>
  );
};

// ------------------ Main App ------------------

export default function App() {
  const [mode, setMode] = useState("light");
  const toggleTheme = () => setMode((m) => (m === "light" ? "dark" : "light"));
  const theme = useMemo(() => createTheme({
    palette: { mode, primary: { main: "#ED1C24" }, background: { default: mode === "dark" ? "#000000ff" : "#f6f7fb" } },
    typography: { fontFamily: "Inter, sans-serif" },
    shape: { borderRadius: 12 },
  }), [mode]);

  const [input, setInput] = useState("");
  const [fileName, setFileName] = useState("");
  const [data, setData] = useState(null);
  const [errors, setErrors] = useState([]);
  const [filters, setFilters] = useState({ line: "", cfs: "", containerNo: "", status: "", text: "" });
  const [selectedLines, setSelectedLines] = useState([]);
  const [previewText, setPreviewText] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  const downloadFile = useDownloader();

  const addErrorCollector = (collector) => (err) => collector.push({
    lineNumber: err.lineNumber || null,
    lineText: err.lineText || null,
    message: err.message || "Unknown error",
    severity: err.severity || "error",
  });

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFileName(f.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      setInput(text);
      const localErrors = [];
      const parsed = parseIGM(text, addErrorCollector(localErrors));
      parsed.rawLines = text.split(/\r?\n/);
      setData(parsed);
      setErrors(localErrors);
      setSelectedLines([]);
      setFilters({ line: "", cfs: "", containerNo: "", status: "", text: "" });
    };
    reader.readAsText(f);
  };

  const handleParse = () => {
    const localErrors = [];
    const parsed = parseIGM(input || "", addErrorCollector(localErrors));
    parsed.rawLines = (input || "").split(/\r?\n/);
    setData(parsed);
    setErrors(localErrors);
    setSelectedLines([]);
    setFilters({ line: "", cfs: "", containerNo: "", status: "", text: "" });
  };

  const handleReset = () => {
    setInput(""); setFileName(""); setData(null); setErrors([]); setFilters({ line: "", cfs: "", containerNo: "", status: "", text: "" }); setSelectedLines([]); setPreviewText(""); setShowPreview(false);
  };

  // derived lists
  const allCFS = useMemo(() => data ? unique(Object.values(data.cargos || {}).map(c => c.cfs).filter(Boolean)) : [], [data]);
  const containerLines = useMemo(() => data ? unique(data.containers.map((c) => c.line)) : [], [data]);
  const containerNos = useMemo(() => data ? unique(data.containers.map((c) => c.containerNo)) : [], [data]);

  // compute lines that belong to selected CFS (used when CFS filter is active)
  const linesForCFS = useMemo(() => {
    if (!data) return [];
    if (!filters.cfs) return [];
    return unique(Object.values(data.cargos || {}).filter(c => (c.cfs || "") === filters.cfs).map(c => c.line));
  }, [data, filters.cfs]);

  // Filtering: both cargo and container will be filtered using unified logic
  const filteredCargos = useMemo(() => {
    if (!data) return [];
    return Object.values(data.cargos || {}).filter((c) => {
      // line filter
      if (filters.line && String(c.line) !== String(filters.line)) return false;
      // cfs filter -> check whether this cargo's line is in linesForCFS (i.e. cargo.cfs == selected cfs)
      if (filters.cfs) {
        if (!linesForCFS.includes(c.line)) return false;
      }
      // containerNo filter: include cargo if any linked container matches containerNo
      if (filters.containerNo) {
        const matchingContainers = data.containers.filter((cont) => String(cont.containerNo).toLowerCase().includes(String(filters.containerNo).toLowerCase()));
        const hasMatch = matchingContainers.some(mc => mc.line === c.line);
        if (!hasMatch) return false;
      }
      // status filter -> require linked containers have the status
      if (filters.status) {
        const containersForCargo = data.containers.filter((cont) => cont.line === c.line);
        if (containersForCargo.length === 0) return false;
        const ok = containersForCargo.some((cont) => (cont.status || "").toLowerCase().includes(filters.status.toLowerCase()));
        if (!ok) return false;
      }
      // text search across goodsDesc, consignee, raw
      if (filters.text) {
        const needle = filters.text.toLowerCase();
        const hay = ((c.goodsDesc || "") + " " + (c.consignee || "") + " " + (c.raw || "")).toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [data, filters, linesForCFS]);

  const filteredContainers = useMemo(() => {
    if (!data) return [];
    return data.containers.filter((cont) => {
      // line filter
      if (filters.line && String(cont.line) !== String(filters.line)) return false;
      // cfs filter: keep container if its line is one of linesForCFS
      if (filters.cfs) {
        if (!linesForCFS.includes(cont.line)) return false;
      }
      // container no filter
      if (filters.containerNo && !String(cont.containerNo).toLowerCase().includes(String(filters.containerNo).toLowerCase())) return false;
      // status filter
      if (filters.status && !((cont.status || "").toLowerCase().includes(filters.status.toLowerCase()))) return false;
      // text search across container raw and linked cargo goodsDesc
      if (filters.text) {
        const needle = filters.text.toLowerCase();
        const hay = ((cont.raw || "") + " " + (data.cargos[cont.line]?.goodsDesc || "") + " " + (cont.consignee || "")).toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [data, filters, linesForCFS]);

  const toggleSelectLine = (lineNo) => {
    setSelectedLines((prev) => (prev.includes(lineNo) ? prev.filter((l) => l !== lineNo) : [...prev, lineNo]));
  };

  const selectAllLines = () => {
    const all = unique(filteredContainers.map((c) => c.line));
    setSelectedLines(all);
  };

  // preserve generation / preview functions
  const generateIGMSelectedLines = () => {
    if (!data || selectedLines.length === 0) return;
    const headerText = (data.headerLines || []).join("\n") + "\n";
    const ves = (data.vesinfoLines && data.vesinfoLines.length > 0) ? data.vesinfoLines.join("\n") + "\n\n" : "";
    let cargoText = "<cargo>\n";
    for (const ln of selectedLines) { const cargo = data.cargos[ln]; if (cargo && cargo.raw) cargoText += cargo.raw + "\n"; }
    cargoText += "<END-cargo>\n\n";
    let containText = "<contain>\n";
    for (const cont of data.containers) { if (selectedLines.includes(cont.line) && cont.raw) containText += cont.raw + "\n"; }
    containText += "<END-contain>\n";
    const endManifest = "\n<END-manifest>\n";
    const trecText = data.trecLine ? data.trecLine + "\n" : "";
    const full = headerText + ves + cargoText + containText + endManifest + trecText;
    downloadFile(full, "NEW_IGM_SELECTED.igm");
  };

  const previewContent = (linesToInclude) => {
    if (!data) return "No data.";
    const lines = Array.isArray(linesToInclude) ? linesToInclude : (typeof linesToInclude === "string" ? [linesToInclude] : []);
    if (!lines || lines.length === 0) return "No lines.";
    const headerText = (data.headerLines || []).join("\n") + "\n";
    const ves = (data.vesinfoLines && data.vesinfoLines.length > 0) ? data.vesinfoLines.join("\n") + "\n\n" : "";
    let cargoText = "<cargo>\n";
    for (const ln of lines) { const cargo = data.cargos[ln]; if (cargo && cargo.raw) cargoText += cargo.raw + "\n"; }
    cargoText += "<END-cargo>\n\n";
    let containText = "<contain>\n";
    for (const cont of data.containers) { if (lines.includes(cont.line) && cont.raw) containText += cont.raw + "\n"; }
    containText += "<END-contain>\n";
    const endManifest = "\n<END-manifest>\n";
    const trecText = data.trecLine ? data.trecLine + "\n" : "";
    return headerText + ves + cargoText + containText + endManifest + trecText;
  };

  const previewForSelectedLines = () => { setPreviewText(previewContent(selectedLines)); setShowPreview(true); };
  const previewForLine = (ln) => { setPreviewText(previewContent([ln])); setShowPreview(true); };

  const showErrorContext = (err) => {
    const lines = (data && data.rawLines) ? data.rawLines : input.split(/\r?\n/);
    const ctx = buildContextPreview(lines, err.lineNumber, 6);
    setPreviewText(ctx);
    setShowPreview(true);
  };

  const modalStyle = {
    position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
    width: "92%", maxWidth: 1100, bgcolor: "background.paper", border: "2px solid #000", boxShadow: 24,
    p: { xs: 2, sm: 3, md: 4 }, borderRadius: 2,
  };

  const summary = useMemo(() => {
    if (!data) return null;
    const totalLines = Object.keys(data.cargos || {}).length;
    const totalContainers = data.containers.length;
    const totalWeight = data.containers.reduce((s, c) => {
      const w = parseFloat((c.weight || "").toString().replace(/[^0-9.\-]/g, ""));
      return s + (isNaN(w) ? 0 : w);
    }, 0);
    const cargoTypes = {};
    Object.values(data.cargos || {}).forEach(c => {
      const n = (c.nature || "UNKNOWN").toUpperCase();
      cargoTypes[n] = (cargoTypes[n] || 0) + 1;
    });
    return { totalLines, totalContainers, totalWeight, cargoTypes };
  }, [data]);

  // ------------------ NEW: Generate IGM for selected CFS ------------------
  // Builds ICES-structured IGM text using the same header/vesinfo, but only cargo+containers for the chosen CFS.
  const generateIgmTextForCfs = (cfs) => {
    if (!data || !cfs) return "";
    // Header lines preserved
    const headerText = (data.headerLines || []).join("\n") + "\n";
    // Vesinfo preserved
    const ves = (data.vesinfoLines && data.vesinfoLines.length > 0) ? data.vesinfoLines.join("\n") + "\n\n" : "";
    // Cargo lines that match cfs (cargo.cfs === cfs)
    const cargoLines = Object.values(data.cargos || {}).filter(c => (c.cfs || "") === cfs).map(c => c.raw).filter(Boolean);
    const cargoText = "<cargo>\n" + cargoLines.join("\n") + "\n<END-cargo>\n\n";
    // Containers that match cfs (container.cfs === cfs)
    const containerLines = (data.containers || []).filter(c => (c.cfs || "") === cfs).map(c => c.raw).filter(Boolean);
    const containText = "<contain>\n" + containerLines.join("\n") + "\n<END-contain>\n";
    const endManifest = "\n<END-manifest>\n";
    const trecText = data.trecLine ? data.trecLine + "\n" : "";
    const full = headerText + ves + cargoText + containText + endManifest + trecText;
    return full;
  };

  const handleGenerateForCfs = () => {
    const cfs = filters.cfs;
    if (!cfs || !data) return;
    const igmText = generateIgmTextForCfs(cfs);
    if (!igmText) return;
    const filename = `IGM_${cfs}.cfs.igm`;
    downloadFile(igmText, filename);
  };
  // ------------------ END NEW ------------------


  // ---------------- Footer Component ----------------
const Footer = () => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        width: "100%",
        mt: 4,
        py: 3,
        borderTop: `1px solid ${theme.palette.divider}`,
        background: theme.palette.mode === "dark" 
          ? theme.palette.background.paper 
          : "#f9f9f9",
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={2} justifyContent="space-between" alignItems="center">
  <Grid item xs={12} sm={6}>
    <Typography variant="body2" color="#e20849ff">
      <strong>IGM Analyzer & Generator</strong>
      <br />
      Built for Century Ports Operations
    </Typography>
  </Grid>

  <Grid item xs={12} sm="auto">
    <Stack direction="row" spacing={2}>
      
      {/* HELP LINK */}
      <Typography
        variant="body2"
        color="text.secondary"
        component="a"
        href="https://github.com/cplsupport9123/ICES-IGM-parser/blob/main/README.md"
        target="_blank"
        rel="noopener noreferrer"
        sx={{ cursor: "pointer", textDecoration: "none" }}
      >
        Help
      </Typography>

      {/* CONTACT LINK */}
      <Typography
        variant="body2"
        color="text.secondary"
        component="a"
        href="https://centuryports.com"
        target="_blank"
        rel="noopener noreferrer"
        sx={{ cursor: "pointer", textDecoration: "none" }}
      >
        Contact
      </Typography>

    </Stack>
  </Grid>
</Grid>


        <Box mt={2} textAlign="center">
          <Typography variant="caption" color="#ED1C24">
            © {new Date().getFullYear()} Century Ports. All Rights Reserved.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};


  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Stack spacing={3}>
          {/* Header */}
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h4" sx={{ fontWeight: "bold", color: "primary.main" }}>IGM Viewer - Generator -  ICES</Typography>
            <IconButton onClick={toggleTheme} color="inherit">{mode === "dark" ? <Brightness7Icon /> : <Brightness4Icon />}</IconButton>
          </Stack>

          {/* Upload / Paste */}
          <Card sx={{ borderRadius: 2, boxShadow: 3 }}>
            <CardContent>
              <Stack spacing={2}>
                <Typography variant="h6">1. Load IGM Data (Paste or Upload)</Typography>
                <Stack direction="row" spacing={2}>
                  <Button component="label" variant="outlined" startIcon={<FileUploadIcon />}>
                    Upload .igm / .amd
                    <input type="file" accept=".igm,.amd,.txt" hidden onChange={handleFile} />
                  </Button>
                  <Button variant="outlined" onClick={handleParse} startIcon={<PreviewIcon />}>Parse Pasted</Button>
                  <Button variant="outlined" color="secondary" onClick={handleReset} startIcon={<RestartAltIcon />}>Reset</Button>
                  {data && <Button variant="contained" startIcon={<DownloadIcon />} onClick={() => downloadFile(JSON.stringify(data, null, 2), "parsed_igm.json")}>Export JSON</Button>}
                </Stack>
                {fileName && <Typography variant="body2" color="success.main">Loaded file: <strong>{fileName}</strong></Typography>}
                <TextField label="Or paste raw .igm text here" multiline rows={8} fullWidth variant="outlined" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Paste full IGM content (manifest ... )" InputProps={{ sx: { fontFamily: "monospace" } }} />
              </Stack>
            </CardContent>
          </Card>

          {/* Errors summary */}
          {errors.length > 0 && (
            <Alert severity={errors.some(e => e.severity === "error") ? "error" : "warning"} icon={<ErrorOutlineIcon />} sx={{ borderRadius: 2 }}>
              <AlertTitle>{errors.some(e => e.severity === "error") ? "Parsing Errors" : "Parsing Warnings"} — {errors.length} issue(s)</AlertTitle>
              <Stack spacing={1}>
                {errors.slice(0, 6).map((err, i) => (
                  <Box key={i} sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{err.lineNumber ? `Line ${err.lineNumber}:` : "File:"}</Typography>
                    <Typography variant="body2">{err.message}</Typography>
                    <Button size="small" variant="text" onClick={() => showErrorContext(err)} startIcon={<VisibilityIcon />}>Context</Button>
                  </Box>
                ))}
                {errors.length > 6 && <Typography variant="caption">{errors.length - 6} more...</Typography>}
              </Stack>
            </Alert>
          )}

          {/* Unified Filter Bar (top) */}
          {data && (
            <Card sx={{ borderRadius: 2, boxShadow: 3 }}>
              <CardContent>
                <Typography variant="h6">Filters (Unified — apply to both Cargo & Containers)</Typography>
                <Grid container spacing={1} alignItems="center" sx={{ mt: 1 }}>
                  <Grid item xs={12} sm={3}>
                    <FormControl fullWidth>
                      <InputLabel id="filter-line-label">Line No</InputLabel>
                      <Select labelId="filter-line-label" value={filters.line} label="Line No" onChange={(e) => setFilters({ ...filters, line: e.target.value })}>
                        <MenuItem value=""><em>All</em></MenuItem>
                        {unique(Object.values(data.cargos || {}).map(c => c.line)).map(ln => <MenuItem key={ln} value={ln}>{ln}</MenuItem>)}
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} sm={3}>
                    <FormControl fullWidth>
                      <InputLabel id="filter-cfs-label">CFS</InputLabel>
                      <Select labelId="filter-cfs-label" value={filters.cfs} label="CFS" onChange={(e) => setFilters({ ...filters, cfs: e.target.value })}>
                        <MenuItem value=""><em>All</em></MenuItem>
                        {allCFS.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} sm={2}>
                    <FormControl fullWidth>
                      <InputLabel id="filter-status-label">Status</InputLabel>
                      <Select labelId="filter-status-label" value={filters.status} label="Status" onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
                        <MenuItem value=""><em>Any</em></MenuItem>
                        <MenuItem value="FCL">FCL</MenuItem>
                        <MenuItem value="LCL">LCL</MenuItem>
                        <MenuItem value="EMP">EMP</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} sm={2}>
                    <TextField fullWidth label="Container No" value={filters.containerNo} onChange={(e) => setFilters({ ...filters, containerNo: e.target.value })} />
                  </Grid>

                  <Grid item xs={12} sm={2}>
                    <TextField fullWidth label="Search text" value={filters.text} onChange={(e) => setFilters({ ...filters, text: e.target.value })} placeholder="consignee / marks / desc" />
                  </Grid>

                  <Grid item xs={12} sm={12} display="flex" gap={1}>
                    <Button variant="outlined" onClick={() => { setFilters({ line: "", cfs: "", containerNo: "", status: "", text: "" }); }}>Clear Filters</Button>
                    <Button variant="contained" onClick={selectAllLines}>Select All Visible Lines</Button>
                    <Button variant="contained" color="success" onClick={generateIGMSelectedLines} disabled={selectedLines.length === 0} startIcon={<SaveAltIcon />}>Generate NEW_IGM (Selected)</Button>
                    <Button variant="outlined" onClick={previewForSelectedLines} disabled={selectedLines.length === 0} startIcon={<PreviewIcon />}>Preview Selected</Button>
                    {/* NEW: Generate IGM for selected CFS */}
                    {filters.cfs && (
                      <Button variant="contained" color="secondary" onClick={handleGenerateForCfs} startIcon={<DownloadIcon />}>
                        Generate IGM for {filters.cfs}
                      </Button>
                    )}
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          )}

          {/* Main content (single-column) */}
          {data && (
            <>
              <VesinfoCard ves={data.vesinfoObj} />

              {/* Cargo Card */}
              <Card sx={{ mt: 2, borderRadius: 2, boxShadow: 3 }}>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="h6">Cargo Lines (Part II) — {Object.keys(data.cargos || {}).length}</Typography>
                    <Typography variant="caption">Filtered: {filteredCargos.length}</Typography>
                  </Stack>
                  <TableContainer sx={{ maxHeight: 360 }}>
                    <Table stickyHeader size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: "bold" }}>Line No</TableCell>
                          <TableCell sx={{ fontWeight: "bold" }}>B/L No</TableCell>
                          <TableCell sx={{ fontWeight: "bold" }}>Nature</TableCell>
                          <TableCell sx={{ fontWeight: "bold" }}>Consignee</TableCell>
                          <TableCell sx={{ fontWeight: "bold" }}>CFS</TableCell>
                          <TableCell sx={{ fontWeight: "bold" }}>UNO/IMCO</TableCell>
                          <TableCell sx={{ fontWeight: "bold" }}>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {filteredCargos.map((c) => {
                          const errs = errors.filter(e => e.lineNumber === c.lineNumber);
                          return (
                            <TableRow key={c.lineNumber}>
                              <TableCell>{c.line}</TableCell>
                              <TableCell sx={{ fontFamily: "monospace" }}>{c.blNo || "—"}</TableCell>
                              <TableCell>{(c.nature || "—").toString()}</TableCell>
                              <TableCell sx={{ maxWidth: 640 }}><Typography noWrap>{c.consignee || "—"}</Typography></TableCell>
                              <TableCell><Chip label={c.cfs || "—"} size="small" /></TableCell>
                              <TableCell>{(c.uno || "—") + (c.imco ? ` / ${c.imco}` : "")}</TableCell>
                              <TableCell>
                                {errs.length > 0 ? <Chip label={`${errs.length} issue(s)`} color="error" size="small" onClick={() => showErrorContext(errs[0])} /> : <Chip label="OK" size="small" color="success" />}
                                <Button size="small" onClick={() => previewForLine(c.line)} sx={{ ml: 1 }}>Preview Line</Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        {filteredCargos.length === 0 && (<TableRow><TableCell colSpan={7} align="center">No cargo lines found matching filters.</TableCell></TableRow>)}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>

              {/* Container Card */}
              <Card sx={{ mt: 2, borderRadius: 2, boxShadow: 3 }}>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="h6">Containers (Part III) — {data.containers.length}</Typography>
                    <Typography variant="caption">Filtered: {filteredContainers.length}</Typography>
                  </Stack>

                  <TableContainer sx={{ maxHeight: 420 }}>
                    <Table stickyHeader size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell padding="checkbox">
                            <Checkbox
                              indeterminate={selectedLines.length > 0 && selectedLines.length < containerLines.length}
                              checked={containerLines.length > 0 && selectedLines.length === containerLines.length}
                              onChange={(e) => setSelectedLines(e.target.checked ? containerLines : [])}
                            />
                          </TableCell>
                          <TableCell sx={{ fontWeight: "bold" }}>Line No</TableCell>
                          <TableCell sx={{ fontWeight: "bold" }}>Container</TableCell>
                          <TableCell sx={{ fontWeight: "bold" }}>Msg Type</TableCell>
                          <TableCell sx={{ fontWeight: "bold" }}>Status</TableCell>
                          <TableCell sx={{ fontWeight: "bold" }}>Pkgs</TableCell>
                          <TableCell sx={{ fontWeight: "bold" }}>Weight</TableCell>
                          <TableCell sx={{ fontWeight: "bold" }}>CFS</TableCell>
                          <TableCell sx={{ fontWeight: "bold" }}>Consignee</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {filteredContainers.map((c, idx) => {
                          const isSelected = selectedLines.includes(c.line);
                          return (
                            <TableRow hover key={`${c.containerNo}_${idx}`} selected={isSelected}>
                              <TableCell padding="checkbox"><Checkbox checked={isSelected} onChange={() => toggleSelectLine(c.line)} /></TableCell>
                              <TableCell>{c.line}</TableCell>
                              <TableCell sx={{ fontFamily: "monospace" }}>{c.containerNo}</TableCell>
                              <TableCell>{c.msgType}</TableCell>
                              <TableCell>{c.status || "—"}</TableCell>
                              <TableCell>{c.noOfPkgs || "—"}</TableCell>
                              <TableCell>{c.weight || "—"}</TableCell>
                              <TableCell><Chip label={c.cfs || "—"} size="small" /></TableCell>
                              <TableCell sx={{ maxWidth: 400 }}><Typography noWrap>{c.consignee || "—"}</Typography></TableCell>
                            </TableRow>
                          );
                        })}
                        {filteredContainers.length === 0 && (<TableRow><TableCell colSpan={9} align="center">No containers found matching filters.</TableCell></TableRow>)}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                    <Button onClick={generateIGMSelectedLines} disabled={selectedLines.length === 0} variant="contained" startIcon={<SaveAltIcon />}>Generate NEW_IGM (Selected)</Button>
                    <Button onClick={previewForSelectedLines} disabled={selectedLines.length === 0} variant="outlined" startIcon={<PreviewIcon />}>Preview Selected</Button>
                    <Button onClick={() => downloadFile(JSON.stringify(filteredContainers, null, 2), "containers_filtered.json")} variant="outlined" startIcon={<DownloadIcon />}>Export Containers JSON</Button>
                  </Stack>
                </CardContent>
              </Card>

              {/* Detailed errors */}
              {errors.length > 0 && (
                <Card sx={{ mt: 2, borderRadius: 2, boxShadow: 3 }}>
                  <CardContent>
                    <Typography variant="h6">Detailed Parsing Issues</Typography>
                    <Stack spacing={1} sx={{ mt: 1 }}>
                      {errors.map((err, i) => (
                        <Paper key={i} variant="outlined" sx={{ p: 1, display: "flex", alignItems: "center", gap: 2 }}>
                          <Box sx={{ minWidth: 120 }}>
                            <Typography variant="caption" color="text.secondary">{err.severity.toUpperCase()}</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>{err.lineNumber ? `Line ${err.lineNumber}` : "File"}</Typography>
                          </Box>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="body2">{err.message}</Typography>
                            <Typography variant="caption" color="text.secondary">{err.lineText ? String(err.lineText).slice(0, 220) : ""}</Typography>
                          </Box>
                          <Stack direction="row" spacing={1}>
                            <Button size="small" onClick={() => showErrorContext(err)} startIcon={<VisibilityIcon />}>Context</Button>
                          </Stack>
                        </Paper>
                      ))}
                    </Stack>
                  </CardContent>
                </Card>
              )}

              {/* JSON viewer */}
              <Card sx={{ mt: 2, borderRadius: 2, boxShadow: 3 }}>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="h6">Parsed JSON</Typography>
                    <Stack direction="row" spacing={1}>
                      <Button variant="outlined" onClick={() => { setPreviewText(JSON.stringify(data, null, 2)); setShowPreview(true); }} startIcon={<PreviewIcon />}>Preview JSON</Button>
                      <Button variant="outlined" onClick={() => downloadFile(JSON.stringify(data, null, 2), "parsed_igm.json")} startIcon={<DownloadIcon />}>Download JSON</Button>
                    </Stack>
                  </Stack>
                  <Box sx={{ mt: 2 }}>
                    <TextField multiline rows={6} fullWidth value={JSON.stringify(data, null, 2)} InputProps={{ readOnly: true, sx: { fontFamily: "monospace" } }} />
                  </Box>
                </CardContent>
              </Card>
            </>
          )}

          <Footer />

          {/* Preview Modal */}
          <Modal open={showPreview} onClose={() => { setShowPreview(false); setPreviewText(""); }} aria-labelledby="preview-modal-title">
            <Box sx={modalStyle}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography id="preview-modal-title" variant="h6">Preview</Typography>
                <IconButton onClick={() => { setShowPreview(false); setPreviewText(""); }}><CloseIcon /></IconButton>
              </Stack>
              <Paper variant="outlined" sx={{ p: 2, maxHeight: "70vh", overflow: "auto", fontFamily: "monospace", whiteSpace: "pre-wrap" }}>
                <Box component="pre" sx={{ m: 0 }}>{previewText || (data?.rawLines || input.split(/\r?\n/)).join("\n")}</Box>
              </Paper>
              <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                <Button variant="contained" onClick={() => { downloadFile(previewText || (data?.rawLines || input.split(/\r?\n/)).join("\n"), "PREVIEW_IGM.igm"); }} startIcon={<DownloadIcon />}>Download</Button>
              </Stack>
            </Box>
          </Modal>
        </Stack>
      </Container>
      
    </ThemeProvider>
  );

}
