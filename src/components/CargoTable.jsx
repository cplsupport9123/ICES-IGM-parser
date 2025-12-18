import React from "react";
import { exportToExcel } from "../utils/helpers";
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
  Chip,
  Button,
} from "@mui/material";
import PreviewIcon from "@mui/icons-material/Preview";
import UnfoldMoreIcon from "@mui/icons-material/UnfoldMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

/**
 * CargoTable Component
 * Displays filtered cargo lines with validation status and preview
 */
export default function CargoTable({
  data,
  filteredCargos,
  errors,
  onPreviewLine,
  onShowErrorContext,
}) {
  if (!data) return null;

  const [sortBy, setSortBy] = React.useState(null); // 'weight'
  const [sortDir, setSortDir] = React.useState("asc");

  const sortedCargos = React.useMemo(() => {
    const arr = [...filteredCargos];
    if (!sortBy) return arr;
    const parseWeight = (c) => {
      try {
        const parts = c.parts || [];
        const unitRe = /^(KGS|KG|KILOGRAMS|LBS|LB|TON|T|MT|G)$/i;
        const numRe = /^-?\d{1,9}(?:\.\d+)?$/;
        for (let i = 0; i < parts.length; i++) {
          const p = (parts[i] || "").toString().trim();
          const next = (parts[i + 1] || "").toString().trim();
          if (numRe.test(p) && unitRe.test(next)) {
            return parseFloat(p);
          }
        }
        for (let i = 0; i < parts.length; i++) {
          const p = (parts[i] || "").toString().trim();
          if (numRe.test(p)) return parseFloat(p);
        }
      } catch (e) {}
      return 0;
    };
    arr.sort((a, b) => {
      const va = parseWeight(a);
      const vb = parseWeight(b);
      if (va === vb) return 0;
      return sortDir === "asc" ? va - vb : vb - va;
    });
    return arr;
  }, [filteredCargos, sortBy, sortDir]);

  const handleExportFiltered = () => {
    // Remove 'raw', 'parts', and 'lineNumber' fields from each cargo before export
    const cleaned = filteredCargos.map(({ raw, parts, lineNumber, ...rest }) => rest);
    exportToExcel(cleaned, [], "igm_filtered_cargo.xlsx");
  };

  return (
    <Card sx={{ mt: 2, borderRadius: 2, boxShadow: 3 }}>
      <CardContent>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} mb={1} spacing={1}>
          <Typography variant="h6" sx={{ fontSize: { xs: '1rem', sm: '1.15rem' } }}>
            Cargo Lines (Part II) — {Object.keys(data.cargos || {}).length}
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: { xs: 1, sm: 0 } }}>
            <Typography variant="caption">Filtered: {filteredCargos.length}</Typography>
            <Button variant="outlined" color="success" size="small" onClick={handleExportFiltered} sx={{ fontSize: { xs: '0.85rem', sm: '1rem' } }}>
              Export Filtered Data
            </Button>
          </Stack>
        </Stack>
        <TableContainer sx={{ maxHeight: { xs: 220, sm: 360 }, width: '100%', overflowX: 'auto' }}>
          <Table stickyHeader size="small" sx={{ minWidth: 700 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: "bold" }}>Line No</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>B/L No</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>B/L Date</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>IGM No</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>IGM Date</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Port of Loading</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Port of Destination</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Nature</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Consignee</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>CFS</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>UNO/IMCO</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Type of Package</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Gross Weight</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Gross Volume</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Mode of Transport</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedCargos.map((c) => {
                const errs = errors.filter(
                  (e) => e.lineNumber === c.lineNumber
                );
                // Mode of Transport mapping (use c.modeOfTransport)
                let motLabel = "—";
                const motRaw = c.modeOfTransport || "";
                if (motRaw === "T" || motRaw.toUpperCase() === "TRAIN") motLabel = "Train";
                else if (motRaw === "R" || motRaw.toUpperCase() === "ROAD") motLabel = "Road";
                else if (motRaw === "S" || motRaw.toUpperCase() === "SHIP") motLabel = "Ship";
                else if (motRaw) motLabel = motRaw;
                // Format dates (DDMMYYYY to DD/MM/YYYY)
                const formatDate = (val) => {
                  if (!val || val.length !== 8) return "—";
                  return `${val.slice(0,2)}/${val.slice(2,4)}/${val.slice(4)}`;
                };
                // Cargo type mapping
                const cargoTypeMap = {
                  C: { label: 'Containerized', color: 'primary', desc: 'Containerized Cargo (requires container info)' },
                  P: { label: 'Packaged', color: 'secondary', desc: 'Non-containerised Packaged Cargo' },
                  LB: { label: 'Liquid Bulk', color: 'info', desc: 'Liquid Bulk Cargo' },
                  DB: { label: 'Dry Bulk', color: 'warning', desc: 'Dry Bulk Cargo' },
                  CP: { label: 'Container+Packaged', color: 'success', desc: 'Part containerized, part packaged' },
                };
                const natureKey = (c.nature || '').toUpperCase();
                const cargoType = cargoTypeMap[natureKey] || { label: c.nature || '—', color: 'default', desc: '' };
                // Validation for required weight/volume
                const isLB = natureKey === 'LB';
                const missingWeight = !isLB && !(c.grossWeight && c.grossWeightUnit);
                const missingVolume = isLB && !(c.grossVolume && c.grossVolumeUnit);
                return (
                  <TableRow key={c.lineNumber}>
                    <TableCell>{c.line}</TableCell>
                    <TableCell sx={{ fontFamily: "monospace" }}>{c.blNo || "—"}</TableCell>
                    <TableCell>{formatDate(c.blDate)}</TableCell>
                    <TableCell>{c.igmNo || "—"}</TableCell>
                    <TableCell>{formatDate(c.igmDate)}</TableCell>
                    <TableCell>{c.portOfLoading || "—"}</TableCell>
                    <TableCell>{c.portOfDestination || "—"}</TableCell>
                    <TableCell>
                      <Chip label={cargoType.label} color={cargoType.color} size="small" title={cargoType.desc} />
                    </TableCell>
                    <TableCell sx={{ maxWidth: 640 }}>
                      <Typography noWrap>{c.consignee || "—"}</Typography>
                    </TableCell>
                    <TableCell><Chip label={c.cfs || "—"} size="small" /></TableCell>
                    <TableCell>{(c.uno || "—") + (c.imco ? ` / ${c.imco}` : "")}</TableCell>
                    <TableCell>
                      {(() => {
                        const pkgMap = {
                          UNT: 'Unit',
                          PKG: 'Package',
                          CTN: 'Carton',
                          BAG: 'Bag',
                          BOX: 'Box',
                          BGS: 'Bags',
                          DRU: 'Drum',
                          PCS: 'Pieces',
                          ROL: 'Roll',
                          PAL: 'Pallet',
                          CAN: 'Can',
                          JAR: 'Jar',
                          TIN: 'Tin',
                          BTL: 'Bottle',
                          SCK: 'Sack',
                          CRB: 'Carboy',
                          CSE: 'Case',
                          PKT: 'Packet',
                          TUB: 'Tube',
                          OTH: 'Other',
                        };
                        const code = (c.typeOfPackage || '').toUpperCase();
                        return code ? `${code} (${pkgMap[code] || 'Unknown'})` : '—';
                      })()}
                    </TableCell>
                    <TableCell>
                      {c.grossWeight ? `${c.grossWeight} ${c.grossWeightUnit}` : "—"}
                      {missingWeight && (
                        <span title="Gross weight is required for this cargo type" style={{ color: '#ED1C24', marginLeft: 4, verticalAlign: 'middle' }}>
                          &#9888;
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {c.grossVolume ? `${c.grossVolume} ${c.grossVolumeUnit}` : "—"}
                      {missingVolume && (
                        <span title="Gross volume is required for Liquid Bulk cargo" style={{ color: '#ED1C24', marginLeft: 4, verticalAlign: 'middle' }}>
                          &#9888;
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{motLabel}</TableCell>
                    <TableCell>
                      {errs.length > 0 ? (
                        <Chip
                          label={`${errs.length} issue(s)`}
                          color="error"
                          size="small"
                          onClick={() => onShowErrorContext(errs[0])}
                        />
                      ) : (
                        <Chip label="OK" size="small" color="success" />
                      )}
                      <Button
                        size="small"
                        onClick={() => onPreviewLine(c.line)}
                        sx={{ ml: 1 }}
                      >
                        Preview Line
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredCargos.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    No cargo lines found matching filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
}
