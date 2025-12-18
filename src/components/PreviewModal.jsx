import React from "react";
import {
  Modal,
  Box,
  Stack,
  Typography,
  Paper,
  Button,
  IconButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import DownloadIcon from "@mui/icons-material/Download";

/**
 * PreviewModal Component
 * Full-screen preview of IGM content
 */
export default function PreviewModal({
  open,
  onClose,
  previewText,
  onDownload,
  fallbackText,
}) {
  const modalStyle = {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: "92%",
    maxWidth: 1100,
    bgcolor: "background.paper",
    border: "2px solid #000",
    boxShadow: 24,
    p: { xs: 2, sm: 3, md: 4 },
    borderRadius: 2,
  };

  const displayText = previewText || fallbackText || "";

  return (
    <Modal
      open={open}
      onClose={onClose}
      aria-labelledby="preview-modal-title"
    >
      <Box sx={modalStyle}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          mb={2}
        >
          <Typography id="preview-modal-title" variant="h6">
            Preview
          </Typography>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Stack>
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            maxHeight: "70vh",
            overflow: "auto",
            fontFamily: "monospace",
            whiteSpace: "pre-wrap",
          }}
        >
          <Box component="pre" sx={{ m: 0 }}>
            {displayText}
          </Box>
        </Paper>
        <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
          <Button
            variant="contained"
            onClick={() => onDownload(displayText)}
            startIcon={<DownloadIcon />}
          >
            Download
          </Button>
        </Stack>
      </Box>
    </Modal>
  );
}
