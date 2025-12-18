import React from "react";
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Select,
  MenuItem,
  TextField,
  Button,
  Stack,
} from "@mui/material";
import SaveAltIcon from "@mui/icons-material/SaveAlt";
import PreviewIcon from "@mui/icons-material/Preview";
import DownloadIcon from "@mui/icons-material/Download";
import { unique } from "../utils/igmParser";

/**
 * FiltersSection Component
 * Unified filter bar for cargo and containers
 */
export default function FiltersSection({
  data,
  filters,
  setFilters,
  selectedLines,
  onSelectAllVisible,
  onGenerateSelected,
  onPreviewSelected,
  onGenerateForCFS,
}) {
  const allCFS = React.useMemo(
    () =>
      data
        ? unique(
            Object.values(data.cargos || {})
              .map((c) => c.cfs)
              .filter(Boolean)
          )
        : [],
    [data]
  );

  const allISO = React.useMemo(
    () => (data ? unique(data.containers.map((c) => c.iso).filter(Boolean)) : []),
    [data]
  );

  if (!data) return null;

  return (
    <Card sx={{ borderRadius: 2, boxShadow: 3 }}>
      <CardContent>
        <Stack spacing={{ xs: 1.5, sm: 2.5 }}>
          <Typography variant="h6" sx={{ fontWeight: "bold", color: "primary.main", fontSize: { xs: '1rem', sm: '1.15rem' } }}>
            📋 Filters (apply to both Cargo & Containers)
          </Typography>

          {/* First Row: Line, CFS, ISO, Status, Mode of Transport */}
          <Grid container spacing={{ xs: 1.5, sm: 3 }}>
                                    <Grid item xs={12} sm={6} md={3}>
                                      <Stack spacing={1}>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                          Port of Loading
                                        </Typography>
                                        <Select
                                          value={filters.portOfLoading || ""}
                                          onChange={(e) => setFilters({ ...filters, portOfLoading: e.target.value })}
                                          displayEmpty
                                          fullWidth
                                        >
                                          <MenuItem value=""><em>All</em></MenuItem>
                                          {unique(Object.values(data.cargos || {}).map((c) => c.portOfLoading).filter(Boolean)).map((port) => (
                                            <MenuItem key={port} value={port}>{port}</MenuItem>
                                          ))}
                                        </Select>
                                      </Stack>
                                    </Grid>
                                    <Grid item xs={12} sm={6} md={3}>
                                      <Stack spacing={1}>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                          Port of Destination
                                        </Typography>
                                        <Select
                                          value={filters.portOfDestination || ""}
                                          onChange={(e) => setFilters({ ...filters, portOfDestination: e.target.value })}
                                          displayEmpty
                                          fullWidth
                                        >
                                          <MenuItem value=""><em>All</em></MenuItem>
                                          {unique(Object.values(data.cargos || {}).map((c) => c.portOfDestination).filter(Boolean)).map((port) => (
                                            <MenuItem key={port} value={port}>{port}</MenuItem>
                                          ))}
                                        </Select>
                                      </Stack>
                                    </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                          <Stack spacing={1}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                              Mode of Transport
                            </Typography>
                            <Select
                              value={filters.modeOfTransport || ""}
                              onChange={(e) => setFilters({ ...filters, modeOfTransport: e.target.value })}
                              displayEmpty
                              fullWidth
                            >
                              <MenuItem value=""><em>All</em></MenuItem>
                              <MenuItem value="S">Ship</MenuItem>
                              <MenuItem value="T">Train</MenuItem>
                              <MenuItem value="R">Road</MenuItem>
                            </Select>
                          </Stack>
                        </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Stack spacing={1}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  Line No
                </Typography>
                <Select
                  value={filters.line}
                  onChange={(e) =>
                    setFilters({ ...filters, line: e.target.value })
                  }
                  displayEmpty
                  fullWidth
                >
                  <MenuItem value="">
                    <em>All</em>
                  </MenuItem>
                  {unique(
                    Object.values(data.cargos || {}).map((c) => c.line)
                  ).map((ln) => (
                    <MenuItem key={ln} value={ln}>
                      {ln}
                    </MenuItem>
                  ))}
                </Select>
              </Stack>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Stack spacing={1}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  CFS
                </Typography>
                <Select
                  value={filters.cfs}
                  onChange={(e) =>
                    setFilters({ ...filters, cfs: e.target.value })
                  }
                  displayEmpty
                  fullWidth
                >
                  <MenuItem value="">
                    <em>All</em>
                  </MenuItem>
                  {allCFS.map((c) => (
                    <MenuItem key={c} value={c}>
                      {c}
                    </MenuItem>
                  ))}
                </Select>
              </Stack>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Stack spacing={1}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  ISO Code
                </Typography>
                <Select
                  value={filters.iso || ""}
                  onChange={(e) => setFilters({ ...filters, iso: e.target.value })}
                  displayEmpty
                  fullWidth
                >
                  <MenuItem value="">
                    <em>All</em>
                  </MenuItem>
                  {allISO.map((iso) => (
                    <MenuItem key={iso} value={iso}>
                      {iso}
                    </MenuItem>
                  ))}
                </Select>
              </Stack>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Stack spacing={1}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  Status
                </Typography>
                <Select
                  value={filters.status}
                  onChange={(e) =>
                    setFilters({ ...filters, status: e.target.value })
                  }
                  displayEmpty
                  fullWidth
                >
                  <MenuItem value="">
                    <em>Any</em>
                  </MenuItem>
                  <MenuItem value="FCL">FCL</MenuItem>
                  <MenuItem value="LCL">LCL</MenuItem>
                  <MenuItem value="EMP">EMP</MenuItem>
                </Select>
              </Stack>
            </Grid>
          </Grid>

          {/* Second Row: Container No, Search Text */}
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={4}>
              <Stack spacing={1}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  Container No
                </Typography>
                <TextField
                  fullWidth
                  value={filters.containerNo}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      containerNo: e.target.value,
                    })
                  }
                  placeholder="Search container..."
                />
              </Stack>
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
              <Stack spacing={1}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  Search text
                </Typography>
                <TextField
                  fullWidth
                  value={filters.text}
                  onChange={(e) =>
                    setFilters({ ...filters, text: e.target.value })
                  }
                  placeholder="consignee / marks / desc"
                />
              </Stack>
            </Grid>

            <Grid item xs={12} md={4} display="flex" gap={1} alignItems="flex-end">
              <Button
                variant="outlined"
                size="small"
                onClick={() => {
                  setFilters({
                    line: "",
                    cfs: "",
                    iso: "",
                    containerNo: "",
                    status: "",
                    text: "",
                  });
                }}
              >
                Clear All Filters
              </Button>
            </Grid>
          </Grid>

          {/* Third Row: Action Buttons */}
          <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1 }}>
            <Button
              variant="contained"
              onClick={onSelectAllVisible}
              startIcon={<SaveAltIcon />}
            >
              Select All Visible
            </Button>
            <Button
              variant="contained"
              color="success"
              onClick={onGenerateSelected}
              disabled={selectedLines.length === 0}
              startIcon={<SaveAltIcon />}
            >
              Generate NEW_IGM
            </Button>
            <Button
              variant="outlined"
              onClick={onPreviewSelected}
              disabled={selectedLines.length === 0}
              startIcon={<PreviewIcon />}
            >
              Preview Selected
            </Button>
            {filters.cfs && (
              <Button
                variant="contained"
                color="secondary"
                onClick={() => onGenerateForCFS(filters.cfs)}
                startIcon={<DownloadIcon />}
              >
                Generate IGM for {filters.cfs}
              </Button>
            )}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
