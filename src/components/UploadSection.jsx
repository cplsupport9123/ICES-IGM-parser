import React from "react";
import {
  Card,
  CardContent,
  Stack,
  Typography,
  Button,
  TextField,
  Box,
} from "@mui/material";
import FileUploadIcon from "@mui/icons-material/FileUpload";
import PreviewIcon from "@mui/icons-material/Preview";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import DownloadIcon from "@mui/icons-material/Download";

/**
 * UploadSection Component
 * File upload and paste area for IGM input
 */
export default function UploadSection({
  fileName,
  input,
  setInput,
  onUploadFile,
  onParse,
  onReset,
  onExportJSON,
  hasData,
  onExportAllExcel,
}) {
  return (
    <Card sx={{ borderRadius: 2, boxShadow: 3 }}>
      <CardContent>
        <Stack spacing={2}>
          <Typography variant="h6" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
            1. Load IGM Data (Paste or Upload)
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} flexWrap="wrap" useFlexGap>
            <Button
              component="label"
              variant="outlined"
              startIcon={<FileUploadIcon />}
              sx={{ width: { xs: '100%', sm: 'auto' } }}
            >
              Upload .igm / .amd
              <input
                type="file"
                accept=".igm,.amd,.txt"
                hidden
                onChange={onUploadFile}
              />
            </Button>
            <Button
              variant="outlined"
              onClick={onParse}
              startIcon={<PreviewIcon />}
              sx={{ width: { xs: '100%', sm: 'auto' } }}
            >
              Parse Pasted
            </Button>
            <Button
              variant="outlined"
              color="secondary"
              onClick={onReset}
              startIcon={<RestartAltIcon />}
              sx={{ width: { xs: '100%', sm: 'auto' } }}
            >
              Reset
            </Button>
          </Stack>
          {hasData && (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} flexWrap="wrap" useFlexGap sx={{ mt: { xs: 1, sm: 0 } }}>
              <Button
                variant="contained"
                startIcon={<DownloadIcon />}
                onClick={onExportJSON}
                sx={{ width: { xs: '100%', sm: 'auto' } }}
              >
                Export JSON
              </Button>
              <Button
                variant="contained"
                color="secondary"
                startIcon={<DownloadIcon />}
                onClick={onExportAllExcel}
                sx={{ fontWeight: 'bold', fontSize: { xs: '0.95rem', sm: '1rem' }, boxShadow: 3, borderRadius: 2, px: 3, py: 1.5, width: { xs: '100%', sm: 'auto' } }}
              >
                Export All (Cargo & Containers)
              </Button>
            </Stack>
          )}
          {fileName && (
            <Typography variant="body2" color="success.main">
              Loaded file: <strong>{fileName}</strong>
            </Typography>
          )}
          <Box
            sx={{
              width: '100%',
              maxWidth: { xs: '100%', sm: 600 },
              height: 280,
              minHeight: 280,
              maxHeight: 280,
              overflow: 'auto',
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
              backgroundColor: 'background.paper',
              p: 0,
            }}
          >
            <TextField
              label="Or paste raw .igm text here"
              multiline
              minRows={12}
              maxRows={12}
              variant="outlined"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Paste full IGM content (manifest ... )"
              fullWidth
              InputProps={{
                sx: {
                  fontFamily: "monospace",
                  '& textarea': {
                    overflow: 'auto',
                    resize: 'none',
                  },
                },
              }}
              sx={{
                width: '100%',
                fontSize: { xs: '0.95rem', sm: '1rem' },
                boxSizing: 'border-box',
              }}
            />
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}
