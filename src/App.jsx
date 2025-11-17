import React, { useState, useCallback, useMemo } from "react";

// --- MUI Imports ---
// Theme
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";

// Layout
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


// Forms
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import IconButton from "@mui/material/IconButton";

// Table
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Checkbox from "@mui/material/Checkbox";

// Other
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";

// Icons
import UploadFileIcon from "@mui/icons-material/UploadFile";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import DownloadIcon from "@mui/icons-material/Download";
import PreviewIcon from "@mui/icons-material/Preview";
import CloseIcon from "@mui/icons-material/Close";
import SailingIcon from "@mui/icons-material/Sailing";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";


// ----------------------------------------------------------------
// Utility Hooks & Components
// ----------------------------------------------------------------

// Custom Hook for downloading files
const useDownloader = () => {
  const downloadFile = useCallback((content, filename) => {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);
  return downloadFile;
};

// Utility: split by GS control char or visible glyph or fallback to pipe '|'
const splitRecord = (line) => {
  const gs = String.fromCharCode(29);
  if (line.includes(gs)) return line.split(gs);
  if (line.includes("")) return line.split(""); // Decimal 29, Hex 1D (GS)
  return line.split(/\|/);
};

// ----------------------------------------------------------------
// VESINFO Card Component (MUI Version)
// ----------------------------------------------------------------
const VesinfoCard = ({ vesinfoObj }) => {
  if (!vesinfoObj) return null;

  // Key-value pairs for the main vessel data
  const dataFields = [
    { label: "IGM No.", value: vesinfoObj.field3_igmNo },
    { label: "IGM Date", value: vesinfoObj.field4_igmDate_ddmmyyyy },
    { label: "Voyage No.", value: vesinfoObj.field7_voyageNo },
    { label: "IMO Code", value: vesinfoObj.field5_imoCode },
    { label: "Call Sign", value: vesinfoObj.field6_callSign },
    { label: "Port of Arrival", value: vesinfoObj.field11_portOfArrival },
    { label: "Last Port Called", value: vesinfoObj.field12_lastPortCalled },
    { label: "Custom House", value: vesinfoObj.field2_customHouseCode },
    { label: "Shipping Line", value: vesinfoObj.field8_shippingLineCode },
    { label: "Shipping Agent", value: vesinfoObj.field9_shippingAgentCode },
    { label: "Master Name", value: vesinfoObj.field10_masterName },
    { label: "Vessel Type", value: vesinfoObj.field15_vesselType },
    { label: "Terminal Code", value: vesinfoObj.field26_terminalOperatorCode },
    { label: "ETA / ATA", value: vesinfoObj.field18_expectedDateTimeArrival },
  ];

  // Fields for the declaration flags
  const flagFields = [
    { label: "Ship Stores (21)", value: vesinfoObj.field21_shipStoresDeclaration },
    { label: "Crew List (22)", value: vesinfoObj.field22_crewListDeclaration },
    { label: "Passenger List (23)", value: vesinfoObj.field23_passengerList },
    { label: "Crew Effects (24)", value: vesinfoObj.field24_crewEffectDeclaration },
    { label: "Maritime Decl. (25)", value: vesinfoObj.field25_maritimeDeclaration },
  ];

  return (
    <Card elevation={3} sx={{ height: "100%", borderRadius: 2 }}>
      <CardContent sx={{ p: 3 }}>
        <Stack direction="row" spacing={1.5} alignItems="center" mb={2} pb={2} borderBottom={1} borderColor="grey.200">
          <SailingIcon color="primary" fontSize="large" />
          <Typography variant="h5" component="h2" fontWeight="bold" color="primary.main">
            Vessel Information
          </Typography>
        </Stack>

        <Grid container spacing={2}>
          {dataFields.map((field, index) => (
            <Grid item xs={12} sm={6} key={index}>
              <Typography variant="caption" color="text.secondary" display="block">
                {field.label}
              </Typography>
              <Typography variant="body1" fontWeight="500" noWrap>
                {field.value || "—"}
              </Typography>
            </Grid>
          ))}
        </Grid>

        <Typography variant="h6" component="h3" mt={3} mb={1.5} pt={2} borderTop={1} borderColor="grey.200" fontSize="1.1rem" fontWeight="600">
          Declarations
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {flagFields.map((field, index) => (
            <Chip
              key={index}
              label={`${field.label.split(" ")[0]}: ${field.value || "?"}`}
              color={field.value === "Y" ? "success" : "default"}
              size="small"
              variant="outlined"
            />
          ))}
        </Stack>

        <Typography variant="body2" color="text.secondary" sx={{ mt: 3, pt: 2, borderTop: 1, borderColor: "grey.200", textAlign: 'right' }}>
          Total Lines: <strong>{vesinfoObj.field16_totalNoOfLines || 'N/A'}</strong>
        </Typography>
      </CardContent>
    </Card>
  );
};

// ----------------------------------------------------------------
// Main App Component (Now wrapped in a ThemeProvider)
// ----------------------------------------------------------------

// Main App component definition
// FIX: Accept mode and toggleTheme as props
function AppContent({ mode, toggleTheme }) {
  // --- All State and Logic Variables are 100% UNCHANGED ---
  const [input, setInput] = useState("");
  const [fileName, setFileName] = useState("");
  const [data, setData] = useState(null); // { headerLines, vesinfoLines, vesinfoObj, cargos, containers, trecLine }
  const [filters, setFilters] = useState({ line: "", cfs: "" });
  const [selectedLines, setSelectedLines] = useState([]);
  const [previewText, setPreviewText] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [containerSearch, setContainerSearch] = useState("");

  const downloadFile = useDownloader(); // Use custom hook

  // --- All Parsing Functions are 100% UNCHANGED ---
  const parseVesinfoFromLines = useCallback((vesinfoLines) => {
    if (!vesinfoLines || vesinfoLines.length === 0) return null;
    const fLine = vesinfoLines.find((l) => l && l.trim().startsWith("F"));
    if (!fLine) return null;
    const parts = splitRecord(fLine).map((p) => (p === undefined ? "" : p.trim()));
    const get = (idx) => parts[idx] || "";
    const ves = {
      rawLine: fLine,
      field1_messageType: get(0), field2_customHouseCode: get(1),
      field3_igmNo: get(2), field4_igmDate_ddmmyyyy: get(3),
      field5_imoCode: get(4), field6_callSign: get(5),
      field7_voyageNo: get(6), field8_shippingLineCode: get(7),
      field9_shippingAgentCode: get(8), field10_masterName: get(9),
      field11_portOfArrival: get(10), field12_lastPortCalled: get(11),
      field13_portPrior12: get(12), field14_portPrior13: get(13),
      field15_vesselType: get(14), field16_totalNoOfLines: get(15),
      field17_briefCargoDescription: get(16), field18_expectedDateTimeArrival: get(17),
      field19_lighthouseDues: get(18), field20_sameBottomCargo: get(19),
      field21_shipStoresDeclaration: get(20), field22_crewListDeclaration: get(21),
      field23_passengerList: get(22), field24_crewEffectDeclaration: get(23),
      field25_maritimeDeclaration: get(24), field26_terminalOperatorCode: get(25),
    };
    if (ves.field4_igmDate_ddmmyyyy && ves.field4_igmDate_ddmmyyyy.length === 8) {
      const d = ves.field4_igmDate_ddmmyyyy;
      ves.igmDateISO = `${d.slice(4, 8)}-${d.slice(2, 4)}-${d.slice(0, 2)}`;
    }
    return ves;
  }, []);

  const parseIGM = useCallback((text) => {
    const rawLines = text.split(/\r?\n/);
    const headerLines = [];
    let vesinfoLines = [];
    let inVesinfo = false, inManifest = false, inCargo = false, inContain = false;
    const cargos = {};
    const containers = [];
    let trecLine = "";

    for (let raw of rawLines) {
      const line = raw;
      const t = line.trim();
      if (!inManifest) {
        headerLines.push(line);
        if (t.toLowerCase().startsWith("<manifest>")) { inManifest = true; continue; }
        else { continue; }
      }
      if (t.toLowerCase().startsWith("<vesinfo>")) { inVesinfo = true; vesinfoLines.push(line); continue; }
      if (inVesinfo) {
        vesinfoLines.push(line);
        if (t.toLowerCase().startsWith("<end-vesinfo>")) { inVesinfo = false; }
        continue;
      }
      if (t.toLowerCase().startsWith("<cargo>")) { inCargo = true; continue; }
      if (t.toLowerCase().startsWith("<end-cargo>")) { inCargo = false; continue; }
      if (t.toLowerCase().startsWith("<contain>")) { inContain = true; continue; }
      if (t.toLowerCase().startsWith("<end-contain>")) { inContain = false; continue; }
      if (t.toLowerCase().startsWith("<end-manifest>")) { continue; }
      if (t.startsWith("TREC")) { trecLine = line; continue; }
      if (inCargo && t.startsWith("F")) {
        const parts = splitRecord(line).map((p) => (p === undefined ? "" : p.trim()));
        const lineNo = parts[7] || ""; const bl = parts[9] || "";
        const consignee = parts[14] || parts[15] || "";
        let cfs = "";
        const lcIndex = parts.findIndex((p) => p === "LC");
        if (lcIndex !== -1 && parts[lcIndex + 1]) { cfs = parts[lcIndex + 1]; }
        else { const candidate = parts.find((p) => p && /INCCU/i.test(p)); if (candidate) cfs = candidate; }
        if (lineNo) { cargos[lineNo] = { line: lineNo, bl, consignee, cfs, raw: line }; }
        continue;
      }
      if (inContain && (t.startsWith("F") || t.startsWith("V"))) {
        const parts = splitRecord(line).map((p) => (p === undefined ? "" : p.trim()));
        const lineNo = parts[7] || ""; const containerNo = parts[9] || "";
        const seal = parts[10] || ""; const pkgs = parts[12] || ""; const weight = parts[13] || "";
        const cargo = lineNo && cargos[lineNo] ? cargos[lineNo] : null;
        containers.push({
          line: lineNo, containerNo, seal, pkgs, weight,
          cfs: cargo ? cargo.cfs : "", bl: cargo ? cargo.bl : "",
          consignee: cargo ? cargo.consignee : "", raw: line,
        });
        continue;
      }
    }
    const vesinfoObj = parseVesinfoFromLines(vesinfoLines);
    return { headerLines, vesinfoLines, vesinfoObj, cargos, containers, trecLine };
  }, [parseVesinfoFromLines]);

  // --- All Event Handlers and Derived State are 100% UNCHANGED ---
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
      setSelectedLines([]); setFilters({ line: "", cfs: "" }); setContainerSearch("");
      setShowPreview(false);
    };
    reader.readAsText(file);
  };

  const handleParse = useCallback(() => {
    const parsed = parseIGM(input);
    setData(parsed);
    setSelectedLines([]); setFilters({ line: "", cfs: "" }); setContainerSearch("");
    setShowPreview(false);
  }, [input, parseIGM]);

  const handleReset = useCallback(() => {
    setInput(""); setData(null); setFileName("");
    setSelectedLines([]); setFilters({ line: "", cfs: "" });
    setContainerSearch(""); setShowPreview(false);
  }, []);

  const unique = (arr) => [...new Set(arr.filter(Boolean))];

  const containerLines = useMemo(() => {
    return data ? unique(data.containers.map((c) => c.line)) : [];
  }, [data]);

  const cfsList = useMemo(() => {
    return data ? unique(data.containers.map((c) => c.cfs || (data.cargos[c.line]?.cfs || ""))) : [];
  }, [data]);

  const filteredContainers = useMemo(() => {
    if (!data) return [];
    return data.containers.filter((c) => {
      return (
        (!filters.line || String(c.line) === String(filters.line)) &&
        (!filters.cfs || (c.cfs || "") === filters.cfs) &&
        (!containerSearch || (c.containerNo || "").toLowerCase().includes(containerSearch.toLowerCase()))
      );
    });
  }, [data, filters, containerSearch]);

  const selectAllForCFS = useCallback(() => {
    if (!filters.cfs || !data) return;
    const lines = unique(data.containers.filter((c) => (c.cfs || "") === filters.cfs).map((c) => c.line));
    setSelectedLines(lines);
  }, [filters.cfs, data]);

  const toggleSelectLine = (lineNo) => {
    setSelectedLines((prev) => {
      if (prev.includes(lineNo)) { return prev.filter((l) => l !== lineNo); }
      else { return [...prev, lineNo]; }
    });
  };

  // --- All Generation Logic is 100% UNCHANGED ---
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
    downloadFile(full, "NEW_IGM.igm"); // Use .igm extension
  };

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
    downloadFile(full, `NEW_IGM_${cfs}.igm`); // Use .igm extension
  };

  const previewContent = (linesToInclude) => {
    const isFilteredByCFS = typeof linesToInclude === 'string';
    const linesForCFS = isFilteredByCFS ? unique(Object.values(data.cargos).filter((c) => (c.cfs || "") === linesToInclude).map(c => c.line)) : [];
    const lines = isFilteredByCFS ? linesForCFS : linesToInclude;
    if (!data || lines.length === 0) return "No lines found for this selection.";
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

  const previewForCFS = (cfs) => { setPreviewText(previewContent(cfs)); setShowPreview(true); };
  const previewForSelectedLines = () => { setPreviewText(previewContent(selectedLines)); setShowPreview(true); };

  // --- MUI Modal Style ---
  const modalStyle = {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: "90%",
    maxWidth: "1000px",
    bgcolor: "background.paper", // This automatically adapts to dark/light mode
    border: "2px solid #000",
    boxShadow: 24,
    p: { xs: 2, sm: 3, md: 4 }, // Responsive padding
    borderRadius: 2,
  };

  // --- NEW MUI-based JSX ---
  return (
    <Container maxWidth="xl" sx={{ py: 3, minHeight: "100vh" }}>
      <Stack spacing={3}>
        
        {/* Header with Theme Toggle */}
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography 
            variant="h4" 
            component="h1" 
            gutterBottom
            sx={{ fontWeight: 'bold', color: 'primary.main', borderBottom: 2, borderColor: 'primary.light', pb: 1, mb: 0 }}
          >
            IGM Viewer & Generator
          </Typography>
          {/* FIX: Render the IconButton directly, using the props passed from App
          */}
          <IconButton sx={{ ml: 1 }} onClick={toggleTheme} color="inherit">
            {mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
          </IconButton>
        </Stack>

        {/* Upload and Paste Section */}
        <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
          <Stack spacing={2}>
            <Typography variant="h6" component="h2">1. Load IGM Data</Typography>
            <Button
              component="label"
              variant="outlined"
              startIcon={<UploadFileIcon />}
              sx={{ alignSelf: 'flex-start' }}
            >
              Upload IGM File (.igm)
              <input type="file" accept=".igm" hidden onChange={handleFile} />
            </Button>
            {fileName && <Typography variant="body2" color="success.main">✅ Loaded: <strong>{fileName}</strong></Typography>}

            <TextField
              label="Or paste IGM text"
              multiline
              rows={6}
              fullWidth
              variant="outlined"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Paste raw IGM content here..."
              InputProps={{ sx: { fontFamily: 'monospace' } }}
            />

            <Stack direction="row" spacing={2}>
              <Button variant="contained" onClick={handleParse} size="large">
                Parse Data
              </Button>
              <Button
                variant="outlined"
                color="secondary"
                onClick={handleReset}
                startIcon={<RestartAltIcon />}
              >
                Reset
              </Button>
            </Stack>
          </Stack>
        </Paper>

        {!data && (
          <Paper elevation={0} sx={{ p: 3, borderRadius: 2, borderStyle: 'dashed', borderColor: 'grey.400' }}>
            <Typography color="text.secondary">
              Awaiting IGM data. Please upload or paste text and click Parse.
            </Typography>
          </Paper>
        )}

        {/* This is the main content wrapper that appears *after* parsing */}
        {data && (
          <>
            {/* Main Content Area: VESINFO + Table/Filters */}
            <Grid container spacing={3}>
              
              {/* --- LEFT COLUMN (Vessel Info) --- */}
              <Grid item xs={12} lg={4}>
                {data.vesinfoObj && <VesinfoCard vesinfoObj={data.vesinfoObj} />}
              </Grid>

              {/* --- RIGHT COLUMN (Filters, Actions, Table) --- */}
              <Grid item xs={12} lg={8}>
                <Stack spacing={3}>
                  
                  {/* Filters & CFS Tools */}
                  <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
                    <Typography variant="h6" component="h2" gutterBottom>2. Filters & CFS Actions</Typography>
                    <Grid container spacing={2} alignItems="flex-end">
                      <Grid item xs={12} sm={4} md={3}>
                        <FormControl fullWidth variant="outlined">
                          <InputLabel id="line-filter-label">Line No.</InputLabel>
                          <Select
                            labelId="line-filter-label"
                            value={filters.line}
                            onChange={(e) => setFilters({ ...filters, line: e.target.value })}
                            label="Line No."
                          >
                            <MenuItem value=""><em>All Lines</em></MenuItem>
                            {containerLines.map((ln) => (
                              <MenuItem key={ln} value={ln}>{ln}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} sm={4} md={3}>
                        <FormControl fullWidth variant="outlined">
                          <InputLabel id="cfs-filter-label">CFS Code</InputLabel>
                          <Select
                            labelId="cfs-filter-label"
                            value={filters.cfs}
                            onChange={(e) => setFilters({ ...filters, cfs: e.target.value })}
                            label="CFS Code"
                          >
                            <MenuItem value=""><em>All CFS</em></MenuItem>
                            {cfsList.map((c) => (
                              <MenuItem key={c} value={c}>{c}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} sm={4} md={6}>
                        <TextField
                          fullWidth
                          label="Search Container No."
                          variant="outlined"
                          value={containerSearch}
                          onChange={(e) => setContainerSearch(e.target.value)}
                        />
                      </Grid>
                    </Grid>
                    {filters.cfs && (
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'grey.200' }}>
                        <Button onClick={selectAllForCFS} variant="contained" color="secondary" size="small">
                          Select All (CFS: {filters.cfs})
                        </Button>
                        <Button onClick={() => previewForCFS(filters.cfs)} variant="outlined" startIcon={<PreviewIcon />} size="small">
                          Preview (CFS)
                        </Button>
                        <Button onClick={() => generateIGMForCFS(filters.cfs)} variant="outlined" color="success" startIcon={<DownloadIcon />} size="small">
                          Generate (CFS)
                        </Button>
                      </Stack>
                    )}
                  </Paper>

                  {/* Selected-lines actions */}
                  <Alert severity="success" variant="standard" icon={false} sx={{ borderRadius: 2 }}>
                    <AlertTitle sx={{ fontWeight: 'bold' }}>3. Generate IGM (Selected Lines)</AlertTitle>
                    <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
                      <Button
                        onClick={generateIGMSelectedLines}
                        disabled={selectedLines.length === 0}
                        variant="contained"
                        color="success"
                        startIcon={<DownloadIcon />}
                      >
                        Generate NEW_IGM.igm
                      </Button>
                      <Button
                        onClick={previewForSelectedLines}
                        disabled={selectedLines.length === 0}
                        variant="contained"
                        startIcon={<PreviewIcon />}
                        color="secondary"
                      >
                        Preview Selected
                      </Button>
                      <Typography variant="body1">
                        <strong>{selectedLines.length}</strong> line(s) selected
                      </Typography>
                    </Stack>
                  </Alert>

                  {/* Containers table */}
                  <Paper elevation={2} sx={{ p: { xs: 1, sm: 2, md: 3 }, borderRadius: 2, overflow: 'hidden' }}>
                    <Typography variant="h6" component="h2" gutterBottom>4. Containers ({filteredContainers.length} records)</Typography>
                    <TableContainer sx={{ maxHeight: 600 }}>
                      <Table stickyHeader>
                        <TableHead>
                          <TableRow>
                            <TableCell padding="checkbox">
                              <Checkbox
                                color="primary"
                                indeterminate={selectedLines.length > 0 && selectedLines.length < containerLines.length}
                                checked={data && containerLines.length > 0 && selectedLines.length === containerLines.length}
                                onChange={(e) => setSelectedLines(e.target.checked ? containerLines : [])}
                              />
                            </TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Line</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Container</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Seal</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Weight</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>CFS</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Consignee</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {filteredContainers.map((c, index) => {
                            const isSelected = selectedLines.includes(c.line);
                            return (
                              <TableRow 
                                hover 
                                key={`${c.containerNo}_${c.line}_${index}`} 
                                selected={isSelected}
                              >
                                <TableCell padding="checkbox">
                                  <Checkbox
                                    color="primary"
                                    checked={isSelected}
                                    onChange={() => toggleSelectLine(c.line)}
                                  />
                                </TableCell>
                                <TableCell>{c.line}</TableCell>
                                <TableCell sx={{ fontFamily: 'monospace' }}>{c.containerNo}</TableCell>
                                <TableCell>{c.seal}</TableCell>
                                <TableCell>{c.weight}</TableCell>
                                <TableCell>
                                  <Chip label={c.cfs || "—"} size="small" color="primary" variant="outlined" />
                                </TableCell>
                                <TableCell title={c.consignee}>
                                  <Typography variant="body2" noWrap sx={{ maxWidth: '200px' }}>
                                    {c.consignee}
                                  </Typography>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                          {filteredContainers.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={7} align="center">
                                <Typography sx={{ p: 4, color: 'text.secondary' }}>
                                  No containers found matching filters.
                                </Typography>
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Paper>
                </Stack>
              </Grid>
            </Grid>
          </>
        )}

        {/* Preview Modal */}
        <Modal
          open={showPreview}
          onClose={() => setShowPreview(false)}
          aria-labelledby="preview-modal-title"
        >
          <Box sx={modalStyle}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography id="preview-modal-title" variant="h6" component="h2">
                IGM Content Preview
              </Typography>
              <IconButton onClick={() => setShowPreview(false)}>
                <CloseIcon />
              </IconButton>
            </Stack>
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                maxHeight: '70vh',
                overflow: 'auto',
                bgcolor: 'grey.900',
                color: 'grey.100',
                fontFamily: 'monospace',
                fontSize: '0.8rem',
                whiteSpace: 'pre',
              }}
            >
              {previewText}
            </Paper>
            <Button
              onClick={() => downloadFile(previewText, "PREVIEW_IGM.igm")}
              variant="contained"
              startIcon={<DownloadIcon />}
  
              sx={{ mt: 2 }}
            >
              Download Preview
            </Button>
          </Box>
        </Modal>

      </Stack>
    </Container>
  );
}


// ----------------------------------------------------------------
// Main App Component with ThemeProvider
// ----------------------------------------------------------------
export default function App() {
  // State for theme mode
  const [mode, setMode] = useState('light');

  // Function to toggle theme
  const toggleTheme = () => {
    setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
  };

  // Create the theme based on the mode
  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode, // 'light' or 'dark'
          primary: {
            main: '#ED1C24', // Your new primary color
          },
        },
        typography: {
          fontFamily: 'Inter, sans-serif',
        },
        shape: {
          borderRadius: 8, // A bit more modern rounded corners
        }
      }),
    [mode]
  );

  // FIX: Removed the faulty .ThemeToggleButton static property assignment.
  // Instead, we pass the props to AppContent.

  return (
    <ThemeProvider theme={theme}>
      {/* CssBaseline kicks off an elegant, consistent baseline to build upon. */}
      {/* It also applies the dark/light mode background color. */}
      <CssBaseline />
      {/* FIX: Pass mode and toggleTheme down as props */}
      <AppContent mode={mode} toggleTheme={toggleTheme} />
    </ThemeProvider>
  );
}