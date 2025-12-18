import React from "react";
import {
  Card,
  CardContent,
  Stack,
  Typography,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Checkbox,
  Chip,
  Button,
  Box,
} from "@mui/material";
import { exportToExcel } from "../utils/helpers";
import SaveAltIcon from "@mui/icons-material/SaveAlt";
import PreviewIcon from "@mui/icons-material/Preview";
import DownloadIcon from "@mui/icons-material/Download";
import UnfoldMoreIcon from "@mui/icons-material/UnfoldMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { unique } from "../utils/igmParser";

/**
 * ContainersTable Component
 * Displays filtered containers with selection, status, and CFS info
 */
export default function ContainersTable({
  data,
  filteredContainers,
  selectedLines,
  onToggleSelectLine,
  onSelectAll,
  onGenerateSelected,
  onPreviewSelected,
  onDownloadJSON,
}) {
  const containerLines = React.useMemo(
    () =>
      data ? unique(data.containers.map((c) => c.line)) : [],
    [data]
  );

  const allSelected =
    containerLines.length > 0 &&
    selectedLines.length === containerLines.length;
  const indeterminateSelected =
    selectedLines.length > 0 &&
    selectedLines.length < containerLines.length;

  if (!data) return null;

  // Export filtered containers to Excel
  const handleExportFiltered = () => {
    if (!filteredContainers || filteredContainers.length === 0) return;
    // Remove 'raw', 'parts', and 'lineNumber' fields from each container before export
    const cleaned = filteredContainers.map(({ raw, parts, lineNumber, ...rest }) => rest);
    exportToExcel([], cleaned, "igm_filtered_containers.xlsx");
  };

  const [sortBy, setSortBy] = React.useState(null); // 'pkgs' | 'weight'
  const [sortDir, setSortDir] = React.useState("asc");

  const sortedContainers = React.useMemo(() => {
    const arr = [...filteredContainers];
    if (!sortBy) return arr;
    arr.sort((a, b) => {
      const n = (v) => {
        if (!v) return 0;
        const s = String(v).replace(/[^0-9.\-]/g, "");
        const f = parseFloat(s);
        return Number.isFinite(f) ? f : 0;
      };
      let va = 0, vb = 0;
      if (sortBy === "pkgs") { va = n(a.noOfPkgs); vb = n(b.noOfPkgs); }
      else if (sortBy === "weight") { va = n(a.weight); vb = n(b.weight); }
      if (va === vb) return 0;
      return sortDir === "asc" ? va - vb : vb - va;
    });
    return arr;
  }, [filteredContainers, sortBy, sortDir]);

  return (
    <Card sx={{ mt: 2, borderRadius: 2, boxShadow: 3 }}>
      <CardContent>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          mb={1}
          spacing={1}
        >
          <Typography variant="h6" sx={{ fontSize: { xs: '1rem', sm: '1.15rem' } }}>
            Containers (Part III) — {data.containers.length}
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: { xs: 1, sm: 0 } }}>
            <Typography variant="caption">
              Filtered: {filteredContainers.length}
            </Typography>
            <Button
              variant="outlined"
              color="success"
              size="small"
              onClick={handleExportFiltered}
              sx={{ fontSize: { xs: '0.85rem', sm: '1rem' } }}
            >
              Export Filtered Data
            </Button>
          </Stack>
        </Stack>

        <TableContainer sx={{ maxHeight: { xs: 220, sm: 420 }, width: '100%', overflowX: 'auto' }}>
          <Table stickyHeader size="small" sx={{ minWidth: 700 }}>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={indeterminateSelected}
                    checked={allSelected}
                    onChange={(e) =>
                      onSelectAll(
                        e.target.checked ? containerLines : []
                      )
                    }
                  />
                </TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>
                  Line No
                </TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>
                  Container
                </TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>
                  Msg Type
                </TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>
                  Status
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: "bold",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                  onClick={() => {
                    if (sortBy === "pkgs")
                      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
                    else {
                      setSortBy("pkgs");
                      setSortDir("asc");
                    }
                  }}
                >
                  Pkgs{" "}
                  {sortBy === "pkgs" ? (
                    sortDir === "asc" ? (
                      <ExpandLessIcon
                        sx={{
                          fontSize: 18,
                          ml: 0.5,
                          verticalAlign: "middle",
                        }}
                      />
                    ) : (
                      <ExpandMoreIcon
                        sx={{
                          fontSize: 18,
                          ml: 0.5,
                          verticalAlign: "middle",
                        }}
                      />
                    )
                  ) : (
                    <UnfoldMoreIcon
                      sx={{
                        fontSize: 18,
                        ml: 0.5,
                        verticalAlign: "middle",
                      }}
                    />
                  )}
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: "bold",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                  onClick={() => {
                    if (sortBy === "weight")
                      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
                    else {
                      setSortBy("weight");
                      setSortDir("asc");
                    }
                  }}
                >
                  Weight (TON){" "}
                  {sortBy === "weight" ? (
                    sortDir === "asc" ? (
                      <ExpandLessIcon
                        sx={{
                          fontSize: 18,
                          ml: 0.5,
                          verticalAlign: "middle",
                        }}
                      />
                    ) : (
                      <ExpandMoreIcon
                        sx={{
                          fontSize: 18,
                          ml: 0.5,
                          verticalAlign: "middle",
                        }}
                      />
                    )
                  ) : (
                    <UnfoldMoreIcon
                      sx={{
                        fontSize: 18,
                        ml: 0.5,
                        verticalAlign: "middle",
                      }}
                    />
                  )}
                </TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>ISO</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>CFS</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>
                  Consignee
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedContainers.map((c, idx) => {
                const isSelected = selectedLines.includes(c.line);
                return (
                  <TableRow
                    hover
                    key={`${c.containerNo}_${idx}`}
                    selected={isSelected}
                  >
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={isSelected}
                        onChange={() =>
                          onToggleSelectLine(c.line)
                        }
                      />
                    </TableCell>
                    <TableCell>{c.line}</TableCell>
                    <TableCell sx={{ fontFamily: "monospace" }}>
                      {c.containerNo}
                    </TableCell>
                    <TableCell>{c.msgType}</TableCell>
                    <TableCell>{c.status || "—"}</TableCell>
                    <TableCell>{c.noOfPkgs || "—"}</TableCell>
                    <TableCell>
                      {(() => {
                        const rawWeight = (c.weight || "").toString().trim();
                        if (!rawWeight) return "—";
                        // If weight already contains letters (unit), show as-is
                        if (/[a-zA-Z]/.test(rawWeight)) return rawWeight;
                        // Otherwise, per ICES spec container weights are in TON
                        return `${rawWeight} TON`;
                      })()}
                    </TableCell>
                    <TableCell>{c.iso || "—"}</TableCell>
                    <TableCell>
                      <Chip label={c.cfs || "—"} size="small" />
                    </TableCell>
                    <TableCell sx={{ maxWidth: 400 }}>
                      <Typography noWrap>
                        {c.consignee || "—"}
                      </Typography>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredContainers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} align="center">
                    No containers found matching filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
          <Button
            onClick={onGenerateSelected}
            disabled={selectedLines.length === 0}
            variant="contained"
            startIcon={<SaveAltIcon />}
          >
            Generate NEW_IGM (Selected)
          </Button>
          <Button
            onClick={onPreviewSelected}
            disabled={selectedLines.length === 0}
            variant="outlined"
            startIcon={<PreviewIcon />}
          >
            Preview Selected
          </Button>
          <Button
            onClick={onDownloadJSON}
            variant="outlined"
            startIcon={<DownloadIcon />}
          >
            Export Containers JSON
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}
