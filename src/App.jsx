// src/App.jsx - Modular IGM Viewer & Generator
import React, { useState, useMemo } from "react";



// Material-UI imports
import { ThemeProvider, createTheme, useTheme, alpha } from "@mui/material/styles";
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Link from '@mui/material/Link';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import {
  CssBaseline,
  Container,
  Stack,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Card,
  CardContent,
  Typography,
  Grid,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Button,
  Divider,
  Paper,
  TextField,
} from "@mui/material";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import CloseIcon from "@mui/icons-material/Close";
import DownloadIcon from "@mui/icons-material/Download";
import LayersIcon from "@mui/icons-material/Layers";

// Parser and utilities
import {
  parseIGM,
  generateIGMForLines,
  generateIGMForCFS,
  generateIGMForLinesWithDefaults,
  generateIGMForCFSWithDefaults,
  buildContextPreview,
  unique,
} from "./utils/igmParser";
import { useDownloader, createErrorCollector, exportToExcel } from "./utils/helpers";
  // Excel export handler for all data
  const handleExportAllExcel = () => {
    if (!data) return;
    const cargos = Object.values(data.cargos || {});
    const containers = data.containers || [];
    exportToExcel(cargos, containers, "igm_all_data.xlsx");
  };

// Components
import {
  UploadSection,
  FiltersSection,
  VesselInfoCard,
  CargoTable,
  ContainersTable,
  PreviewModal,
  ErrorsSummary,
  ErrorsDetailedList,
} from "./components";
import GenerateOptionsModal from "./components/GenerateOptionsModal.jsx";

// IGMHelpModal Component
const IGMHelpModal = ({ open, onClose }) => {
  const theme = useTheme();

  const features = [
    {
      title: "Deep IGM Parsing",
      desc: "Parses complex ICES 1.5 formats including VESINFO, Cargo (TREC/TSHC), and Container sections, handling mixed delimiters and multi-line data.",
      color: "#3b82f6"
    },
    {
      title: "Smart Filtering",
      desc: "Filter manifests instantly by Line Number, Auto-detected CFS, Container Number, or BL details to find exactly what you need.",
      color: "#10b981"
    },
    {
      title: "CFS-wise Splitting",
      desc: "Automatically groups cargo by CFS. Download individual CFS files, or grab a complete ZIP archive of all separated IGM files in one click.",
      color: "#8b5cf6"
    },
    {
      title: "Live Preview",
      desc: "Verify data before downloading. View a pretty-printed preview of the generated IGM file content, including cargo and container counts.",
      color: "#f59e0b"
    }
  ];

  const steps = [
    {
      primary: "Upload IGM File",
      secondary: "Select any .igm, .txt, or .csv file. The app immediately parses Vessel, Cargo, and Container details."
    },
    {
      primary: "Analyze & Filter",
      secondary: "Use the dashboard to filter by Line Number or specific CFS. The tables update in real-time."
    },
    {
      primary: "Review Data",
      secondary: "Check the comprehensive tables showing Cargo descriptions, Marks & Numbers, and linked Containers."
    },
    {
      primary: "Generate & Download",
      secondary: "Download the specific 'Filtered IGM' for a single CFS, or export a ZIP containing separated files for all CFSs."
    }
  ];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth scroll="paper">
      <DialogTitle sx={{ p: 0, position: 'relative', overflow: 'hidden' }}>
        <Box sx={{
          p: 4,
          background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
          color: 'white',
        }}>
          <IconButton
            aria-label="close"
            onClick={onClose}
            sx={{
              position: 'absolute',
              right: 16,
              top: 16,
              color: 'white',
              bgcolor: 'rgba(255,255,255,0.1)',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' }
            }}
          >
            <CloseIcon />
          </IconButton>

          <Box sx={{
            position: 'absolute',
            top: -50,
            right: -30,
            width: 150,
            height: 150,
            borderRadius: '50%',
            bgcolor: 'white',
            opacity: 0.1,
            pointerEvents: 'none'
          }} />

          <Typography variant="overline" sx={{ fontWeight: 'bold', letterSpacing: 2, opacity: 0.9 }}>
            IGM Tool Manual
          </Typography>
          <Typography variant="h4" component="h2" sx={{ fontWeight: 800, mt: 1 }}>
            IGM Viewer & Generator
          </Typography>
          <Typography variant="subtitle1" sx={{ maxWidth: 700, opacity: 0.9, mt: 1, lineHeight: 1.5 }}>
            A utility to parse, visualize, and split Import General Manifests (IGM) by CFS.
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent dividers sx={{ bgcolor: 'background.default', p: { xs: 2, md: 4 } }}>
        <Grid container spacing={4}>
          <Grid item xs={12} md={8}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
              <LayersIcon color="action" /> Core Capabilities
            </Typography>

            <Grid container spacing={3}>
              {features.map((feat, index) => (
                <Grid item xs={12} sm={6} key={index}>
                  <Card variant="outlined" sx={{
                    height: '100%',
                    borderRadius: 3,
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: 3,
                      borderColor: feat.color
                    }
                  }}>
                    <CardContent sx={{ p: 2.5 }}>
                      <Box sx={{
                        display: 'inline-block',
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        bgcolor: feat.color,
                        mb: 2
                      }} />
                      <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 700 }}>
                        {feat.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5 }}>
                        {feat.desc}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            <Box sx={{ mt: 5 }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 700 }}>
                Supported Formats
              </Typography>
              <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
                <Grid container spacing={2}>
                  {[
                    { title: "Standard IGM", sub: ".igm, .txt (ICES 1.5)" },
                    { title: "Flat Files", sub: ".amd, .csv" },
                    { title: "Legacy", sub: "Mixed delimiters" }
                  ].map((fmt, i) => (
                    <Grid item xs={12} sm={4} key={i}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box>
                          <Typography variant="subtitle2" fontWeight="bold">{fmt.title}</Typography>
                          <Typography variant="caption" color="text.secondary">{fmt.sub}</Typography>
                        </Box>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </Paper>
            </Box>
          </Grid>

          <Grid item xs={12} md={4}>
            <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, height: 'fit-content' }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 700, mb: 2 }}>
                Workflow
              </Typography>
              <List disablePadding>
                {steps.map((step, index) => (
                  <React.Fragment key={index}>
                    <ListItem alignItems="flex-start" sx={{ px: 0 }}>
                      <ListItemIcon sx={{ minWidth: 40, mt: 0.5 }}>
                        <Box sx={{
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          bgcolor: 'primary.light',
                          color: 'primary.contrastText',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.875rem',
                          fontWeight: 'bold'
                        }}>
                          {index + 1}
                        </Box>
                      </ListItemIcon>
                      <ListItemText
                        primary={<Typography variant="subtitle2" fontWeight="bold">{step.primary}</Typography>}
                        secondary={step.secondary}
                        primaryTypographyProps={{ gutterBottom: true }}
                      />
                    </ListItem>
                    {index < steps.length - 1 && <Divider variant="inset" component="li" sx={{ ml: 5 }} />}
                  </React.Fragment>
                ))}
              </List>
            </Paper>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ p: 2, bgcolor: 'grey.50' }}>
        <Button onClick={onClose} variant="contained" disableElevation>
          Got it
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Footer Component
const Footer = ({ setHelpOpen }) => {
  const theme = useTheme();
  return (
    <Box sx={{
      width: '100%',
      mt: 4,
      py: 3,
      borderTop: `1px solid ${theme.palette.divider}`,
      background: theme.palette.mode === 'dark' ? theme.palette.background.paper : '#f9f9f9',
    }}>
      <Container maxWidth="lg">
        <Grid container spacing={2} justifyContent="space-between" alignItems="center">
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.primary">
              <strong>Developed by Debasish Debnath (3015)</strong><br />
              For Port Operations
            </Typography>
          </Grid>
          <Grid item xs={12} sm="auto">
            <Stack direction="row" spacing={2}>
              <Button
                variant="outlined"
                color="primary"
                onClick={() => setHelpOpen(true)}
                sx={{ textTransform: 'none', fontWeight: 600 }}
              >
                How to Use
              </Button>
              <Button
                variant="contained"
                color="primary"
                component="a"
                href="mailto:support@centuryports.com?subject=IGM%20Viewer%20Support"
                target="_blank"
                rel="noopener noreferrer"
                sx={{ textTransform: 'none', fontWeight: 600 }}
              >
                Support
              </Button>
            </Stack>
          </Grid>
        </Grid>
        <Box mt={2} textAlign="center">
          <Typography variant="caption" color="#ED1C24">
            © {new Date().getFullYear()} Debasish Debnath (3015). All Rights Reserved.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

// Main App Component
// Sticky NavBar Component
function NavBar() {
  const theme = useTheme();
  // Logo as image, linked to homepage, with fallback
  const [logoError, setLogoError] = React.useState(false);
  const logo = (
    <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
      <a href="/" style={{ display: 'inline-block' }}>
        {logoError ? (
          <Box
            sx={{
              width: 40,
              height: 40,
              bgcolor: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: theme.palette.mode === 'dark' ? 3 : 1,
            }}
          >
            <Typography variant="h6" sx={{ color: theme.palette.mode === 'dark' ? '#fff' : '#ED1C24', fontWeight: 900, fontFamily: 'Inter, sans-serif', letterSpacing: 1 }}>
              IGM
            </Typography>
          </Box>
        ) : (
          <Box
            component="img"
            src="/logo.jpg"
            alt="Logo"
            sx={{
              width: 40,
              height: 40,
              objectFit: 'cover',
              boxShadow: theme.palette.mode === 'dark' ? 3 : 1,
              bgcolor: '#fff',
            }}
            onError={() => setLogoError(true)}
          />
        )}
      </a>
    </Box>
  );

  // PWA install button logic
  const [deferredPrompt, setDeferredPrompt] = React.useState(null);
  const [showInstall, setShowInstall] = React.useState(false);

  React.useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstall(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstall(false);
      setDeferredPrompt(null);
    }
  };

  return (
    <AppBar
      position="sticky"
      sx={{
        zIndex: 1201,
        background: theme.palette.mode === 'dark' ? '#ED1C24' : theme.palette.primary.main,
        color: theme.palette.mode === 'dark' ? '#fff' : '#fff',
        boxShadow: theme.palette.mode === 'dark' ? '0 2px 8px rgba(237,28,36,0.25)' : undefined,
        borderBottom: theme.palette.mode === 'dark' ? '2px solid #fff' : '2px solid #ED1C24',
      }}
    >
      <Toolbar
        sx={{
          minHeight: { xs: 56, sm: 64 },
          px: { xs: 1, sm: 3 },
          flexWrap: 'wrap',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        {logo}
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: { xs: 1, sm: 2 },
            flexGrow: 1,
            minWidth: 0,
          }}
        >
          <Link href="https://www.icegate.gov.in/" color="inherit" underline="none" target="_blank" rel="noopener" sx={{ fontWeight: 600, fontSize: { xs: '0.95rem', sm: '1.05rem' }, whiteSpace: 'nowrap' }}>
            IGM generator
          </Link>
          <Link href="https://www.cbec.gov.in/" color="inherit" underline="none" target="_blank" rel="noopener" sx={{ fontWeight: 600, fontSize: { xs: '0.95rem', sm: '1.05rem' }, whiteSpace: 'nowrap' }}>
            Bapalie
          </Link>
          <Link href="https://www.dgft.gov.in/" color="inherit" underline="none" target="_blank" rel="noopener" sx={{ fontWeight: 600, fontSize: { xs: '0.95rem', sm: '1.05rem' }, whiteSpace: 'nowrap' }}>
            igm&lt;-&gt;json
          </Link>
        </Box>
        {showInstall && (
          <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
            <Button
              onClick={handleInstallClick}
              variant="contained"
              color="inherit"
              sx={{
                bgcolor: '#fff',
                color: '#ED1C24',
                fontWeight: 700,
                boxShadow: 2,
                textTransform: 'none',
                px: 2,
                py: 1,
                minWidth: 0,
                ml: 1,
                '&:hover': { bgcolor: '#f5f5f5' },
              }}
              startIcon={
                <img src="/install-icon.svg" alt="Install" style={{ width: 24, height: 24 }} />
              }
            >
              Install App
            </Button>
          </Box>
        )}
        <Box sx={{ minWidth: 0 }}>
          <Link href="https://www.centuryports.com/" color="inherit" underline="none" target="_blank" rel="noopener" sx={{ fontWeight: 600, fontSize: { xs: '0.95rem', sm: '1.05rem' }, whiteSpace: 'nowrap' }}>
            Century Ports
          </Link>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
export default function App() {
  // All state and logic above the return
  const [inputError, setInputError] = useState("");
  // Core State
  const [input, setInput] = useState("");
  const [fileName, setFileName] = useState("");
  const [data, setData] = useState(null);
  const [errors, setErrors] = useState([]);

  // UI State
  const [mode, setMode] = useState(() => localStorage.getItem("theme-mode") || "dark");
  const [helpOpen, setHelpOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewText, setPreviewText] = useState("");
  const [genOptsOpen, setGenOptsOpen] = useState(false);
  const [defaultOverrides, setDefaultOverrides] = useState(null);

  // Filter & Selection State
  const [filters, setFilters] = useState({ line: "", cfs: "", containerNo: "", status: "", text: "", modeOfTransport: "", iso: "" });
  const [selectedLines, setSelectedLines] = useState([]);

  // Theme
  const theme = useMemo(() => createTheme({
    palette: {
      mode,
      primary: { main: "#ED1C24" },
      background: { default: mode === "dark" ? "#000000ff" : "#f6f7fb" }
    },
    typography: { fontFamily: "Inter, sans-serif" },
    shape: { borderRadius: 12 },
  }), [mode]);

  // Downloader
  const downloadFile = useDownloader();

  // Event Handlers & Actions
  const toggleTheme = () => {
    setMode((m) => {
      const newMode = m === "light" ? "dark" : "light";
      localStorage.setItem("theme-mode", newMode);
      return newMode;
    });
  };

  const handleReset = () => {
    setInput("");
    setFileName("");
    setData(null);
    setErrors([]);
    setFilters({ line: "", cfs: "", containerNo: "", status: "", text: "", modeOfTransport: "" });
    setSelectedLines([]);
    setPreviewText("");
    setShowPreview(false);
  };

  const handleParse = (textToParse = input) => {
    if (typeof textToParse !== "string" || !textToParse.trim()) {
      setInputError("Please paste a valid IGM text before parsing.");
      return;
    }
    setInputError("");
    const { collector, addError } = createErrorCollector();
    const parsed = parseIGM(textToParse, addError);
    parsed.rawLines = textToParse.split(/\r?\n/);
    setData(parsed);
    setErrors(collector);
    setSelectedLines([]);
    setFilters({ line: "", cfs: "", containerNo: "", status: "", text: "", modeOfTransport: "" });
  };

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFileName(f.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      setInput(text);
      handleParse(text);
    };
    reader.readAsText(f);
  };

  const handleExportJSON = () => {
    if (!data) return;
    downloadFile(JSON.stringify(data, null, 2), "parsed_igm.json");
  };

  const handleExportAllExcel = () => {
    if (!data) return;
    const cargos = Object.values(data.cargos || {});
    const containers = data.containers || [];
    exportToExcel(cargos, containers, "igm_all_data.xlsx");
  };

  const showErrorContext = (err) => {
    const lines = data?.rawLines || input.split(/\r?\n/);
    const ctx = buildContextPreview(lines, err.lineNumber, 6);
    setPreviewText(ctx);
    setShowPreview(true);
  };

  const selectAllLines = () => {
    if (!data) return;
    const all = unique(filteredContainers.map((c) => c.line));
    setSelectedLines(all);
  };

  const toggleSelectLine = (line) => {
    setSelectedLines(prev =>
      prev.includes(line) ? prev.filter(l => l !== line) : [...prev, line]
    );
  };

  const generateIGMSelectedLines = () => {
    if (!data || selectedLines.length === 0) return;
    const content = generateIGMForLines(data, selectedLines);
    downloadFile(content, "NEW_IGM_SELECTED.igm");
  };

  const previewForSelectedLines = () => {
    if (!data || selectedLines.length === 0) return;
    const content = generateIGMForLines(data, selectedLines);
    setPreviewText(content);
    setShowPreview(true);
  };

  const previewForLine = (line) => {
    if (!data || !line) return;
    const content = generateIGMForLines(data, [line]);
    setPreviewText(content);
    setShowPreview(true);
  };

  const handleGenerateForCfs = (cfs) => {
    if (!data || !cfs) return;
    const content = generateIGMForCFS(data, cfs);
    downloadFile(content, `IGM_${cfs}.cfs.igm`);
  };

  const handleDownloadContainersJSON = () => {
    downloadFile(JSON.stringify(filteredContainers, null, 2), "containers_filtered.json");
  };

  const handleDownloadPreview = (text) => {
    downloadFile(text || previewText, "PREVIEW_IGM.igm");
  };

  // Derived State (Memoized)
  // Helper to normalize modeOfTransport for comparison
  const normalizeMode = (val) => {
    if (!val) return "";
    const v = val.toUpperCase();
    if (v === "T" || v === "TRAIN") return "T";
    if (v === "R" || v === "ROAD") return "R";
    if (v === "S" || v === "SHIP") return "S";
    return v;
  };

  const filteredCargos = useMemo(() => {
    if (!data?.cargos) return [];
    return Object.values(data.cargos).filter(c => {
      const textFilter = filters.text?.toLowerCase() || "";
      const textMatch = !textFilter || (
        c.line?.toString().includes(textFilter) ||
        (c.bl || "").toLowerCase().includes(textFilter) ||
        (c.importer || "").toLowerCase().includes(textFilter) ||
        (c.desc || "").toLowerCase().includes(textFilter) ||
        (c.marks || "").toLowerCase().includes(textFilter)
      );

      const cargoMode = normalizeMode(c.modeOfTransport);
      const filterMode = normalizeMode(filters.modeOfTransport);

      // ISO filter: find all containers for this cargo line, check if any match the ISO filter
      let isoMatch = true;
      if (filters.iso) {
        isoMatch = (data.containers || []).some(
          (container) => container.line === c.line && container.iso === filters.iso
        );
      }

      return (
        (!filters.line || c.line === filters.line) &&
        (!filters.cfs || c.cfs === filters.cfs) &&
        (!filters.modeOfTransport || cargoMode === filterMode) &&
        (!filters.portOfLoading || c.portOfLoading === filters.portOfLoading) &&
        (!filters.portOfDestination || c.portOfDestination === filters.portOfDestination) &&
        isoMatch &&
        textMatch
      );
    });
  }, [data, filters]);

  const filteredContainers = useMemo(() => {
    if (!data?.containers) return [];
    return data.containers.filter(c => {
      const cargo = data.cargos[c.line];
      const cargoMode = normalizeMode(cargo?.modeOfTransport);
      const filterMode = normalizeMode(filters.modeOfTransport);
      return (
        (!filters.line || c.line === filters.line) &&
        (!filters.cfs || c.cfs === filters.cfs) &&
        (!filters.containerNo || c.containerNo.startsWith(filters.containerNo)) &&
        (!filters.status || c.status === filters.status) &&
        (!filters.iso || c.iso === filters.iso) &&
        (!filters.modeOfTransport || cargoMode === filterMode)
      );
    });
  }, [data, filters]);

  // Main return statement
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <NavBar />
      <IGMHelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
      <Container
        maxWidth="md"
        sx={{
          py: { xs: 1, sm: 2, md: 3 },
          px: { xs: 0.5, sm: 2, md: 3 },
          width: '100%',
        }}
      >
        <Stack
          spacing={{ xs: 1.2, sm: 2, md: 3 }}
          sx={{
            width: '100%',
            maxWidth: '100%',
            boxSizing: 'border-box',
          }}
        >
          {/* Header */}
          <Stack
            direction={{ xs: "column", sm: "row" }}
            justifyContent={{ xs: "flex-start", sm: "space-between" }}
            alignItems={{ xs: "flex-start", sm: "center" }}
            spacing={1}
            sx={{
              flexWrap: 'wrap',
              width: '100%',
              mb: { xs: 1, sm: 2 },
            }}
          >
            <Typography
              variant="h5"
              sx={{
                fontWeight: "bold",
                color: "primary.main",
                fontSize: { xs: "1.1rem", sm: "2rem" },
                wordBreak: 'break-word',
                maxWidth: { xs: '100%', sm: '70%' },
              }}
            >
              IGM Viewer - Generator - ICES
            </Typography>
            <Button
              onClick={toggleTheme}
              variant="contained"
              sx={{
                alignSelf: { xs: "flex-end", sm: "center" },
                mt: { xs: 1, sm: 0 },
                px: 2.5,
                py: 1.2,
                borderRadius: 2,
                fontWeight: 700,
                bgcolor: mode === 'dark' ? '#fff' : '#222',
                color: mode === 'dark' ? '#ED1C24' : '#fff',
                boxShadow: 2,
                textTransform: 'none',
                transition: 'all 0.2s',
                '&:hover': {
                  bgcolor: mode === 'dark' ? '#f5f5f5' : '#333',
                  color: mode === 'dark' ? '#ED1C24' : '#fff',
                },
                display: 'flex',
                gap: 1.2,
                fontSize: { xs: '0.95rem', sm: '1.05rem' },
              }}
              startIcon={mode === 'dark' ? '🌞' : '🌙'}
            >
              {mode === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </Button>
          </Stack>
          {/* Upload */}
          {inputError && (
            <Box sx={{ mb: 1 }}>
              <Typography color="error" variant="body2">{inputError}</Typography>
            </Box>
          )}
          <UploadSection
            fileName={fileName}
            input={input}
            setInput={setInput}
            onUploadFile={handleFile}
            onParse={handleParse}
            onReset={handleReset}
            onExportJSON={handleExportJSON}
            hasData={!!data}
            onExportAllExcel={handleExportAllExcel}
            inputProps={{
              multiline: true,
              fullWidth: true,
              minRows: 6,
              maxRows: 24,
              sx: { resize: 'vertical', width: '100%' }
            }}
          />
          {/* Errors Summary */}
          <ErrorsSummary errors={errors} onShowErrorContext={showErrorContext} />
          {/* Filters */}
          {data && (
            <FiltersSection
              data={data}
              filters={filters}
              setFilters={setFilters}
              selectedLines={selectedLines}
              onSelectAllVisible={selectAllLines}
              onGenerateSelected={generateIGMSelectedLines}
              onPreviewSelected={previewForSelectedLines}
              onGenerateForCFS={handleGenerateForCfs}
            />
          )}
          {/* Main Content */}
          {data && (
            <React.Fragment>
              <VesselInfoCard ves={data.vesinfoObj} />
              <CargoTable
                data={data}
                filteredCargos={filteredCargos}
                errors={errors}
                onPreviewLine={previewForLine}
                onShowErrorContext={showErrorContext}
              />
              <ContainersTable
                data={data}
                filteredContainers={filteredContainers}
                selectedLines={selectedLines}
                onToggleSelectLine={toggleSelectLine}
                onSelectAll={setSelectedLines}
                onGenerateSelected={generateIGMSelectedLines}
                onPreviewSelected={previewForSelectedLines}
                onDownloadJSON={handleDownloadContainersJSON}
              />
              {/* Errors Detail */}
              <ErrorsDetailedList errors={errors} onShowErrorContext={showErrorContext} />
              {/* JSON Viewer */}
              <Card sx={{ mt: 2, borderRadius: 2, boxShadow: 3 }}>
                <CardContent>
                  <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} spacing={1}>
                    <Typography variant="h6" sx={{ fontSize: { xs: "1rem", sm: "1.25rem" } }}>Parsed JSON</Typography>
                    <Stack direction="row" spacing={1} sx={{ mt: { xs: 1, sm: 0 } }}>
                      <Button
                        variant="outlined"
                        onClick={() => { setPreviewText(JSON.stringify(data, null, 2)); setShowPreview(true); }}
                        startIcon={<DownloadIcon />}
                      >
                        Export JSON
                      </Button>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
              <PreviewModal
                open={showPreview}
                onClose={() => { setShowPreview(false); setPreviewText(""); }}
                previewText={previewText}
                onDownload={handleDownloadPreview}
                fallbackText={data?.rawLines?.join("\n") || input.split(/\r?\n/).join("\n")}
              />
              <GenerateOptionsModal
                open={genOptsOpen}
                onClose={() => setGenOptsOpen(false)}
                defaults={{
                  header: "HREC\u001DZZ\u001DSEACONCCU\u001DZZ\u001DINCCU1\u001DICES1_5\u001DP\u001D\u001DSACHI01\u001D22021W\u001D20221014\u001D1400",
                  vesinfoF: "F\u001DINCCU1\u001D\u001D\u001D9399117\u001D9V3523\u001D22021W\u001DXCL\u001DAAMCS5523K\u001DVIRENDER SINGH DALAL\u001DINCCU1\u001DLKCMB\u001D\u001D\u001DC\u001D179\u001DGENERAL CARGO\u001D16102022 18:00\u001D\u001DN\u001DY\u001DY\u001DN\u001DY\u001DY\u001DINCCU1KKP1",
                  trec: "TREC\u001D22021W",
                }}
                onConfirm={({ include, values }) => {
                  setGenOptsOpen(false);
                  const defaults = {
                    header: include.header ? values.header : (data.headerLines||[]).join("\n"),
                    vesinfoF: include.vesinfo ? values.vesinfoF : (data.vesinfoLines||[]).find(l=>l.startsWith("F")) || "",
                    trec: include.trec ? values.trec : (data.trecLine || ""),
                  };
                  if (defaultOverrides?.targetCfs) {
                    const content = generateIGMForCFSWithDefaults(data, defaultOverrides.targetCfs, defaults, include);
                    downloadFile(content, `IGM_${defaultOverrides.targetCfs}.cfs.igm`);
                    setDefaultOverrides(null);
                  } else {
                    const content = generateIGMForLinesWithDefaults(data, selectedLines, defaults, include);
                    downloadFile(content, "NEW_IGM_SELECTED.igm");
                  }
                }}
              />
            </React.Fragment>
          )}
        </Stack>
      </Container>
      <Footer setHelpOpen={setHelpOpen} />
    </ThemeProvider>
  );
}
