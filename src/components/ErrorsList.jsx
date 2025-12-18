import React from "react";
import {
  Alert,
  AlertTitle,
  Card,
  CardContent,
  Stack,
  Box,
  Typography,
  Paper,
  Button,
} from "@mui/material";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import VisibilityIcon from "@mui/icons-material/Visibility";

/**
 * ErrorsSummary Component
 * Displays parsing errors/warnings at the top
 */
export function ErrorsSummary({
  errors,
  onShowErrorContext,
}) {
  if (!errors || errors.length === 0) return null;

  const hasErrors = errors.some((e) => e.severity === "error");

  return (
    <Alert
      severity={hasErrors ? "error" : "warning"}
      icon={<ErrorOutlineIcon />}
      sx={{ borderRadius: 2 }}
    >
      <AlertTitle>
        {hasErrors ? "Parsing Errors" : "Parsing Warnings"} —{" "}
        {errors.length} issue(s)
      </AlertTitle>
      <Stack spacing={1}>
        {errors.slice(0, 6).map((err, i) => (
          <Box
            key={i}
            sx={{ display: "flex", gap: 1, alignItems: "center" }}
          >
            <Typography
              variant="body2"
              sx={{ fontWeight: 700 }}
            >
              {err.lineNumber
                ? `Line ${err.lineNumber}:`
                : "File:"}
            </Typography>
            <Typography variant="body2">
              {err.message}
            </Typography>
            <Button
              size="small"
              variant="text"
              onClick={() => onShowErrorContext(err)}
              startIcon={<VisibilityIcon />}
            >
              Context
            </Button>
          </Box>
        ))}
        {errors.length > 6 && (
          <Typography variant="caption">
            {errors.length - 6} more...
          </Typography>
        )}
      </Stack>
    </Alert>
  );
}

/**
 * ErrorsDetailedList Component
 * Detailed list of all parsing errors
 */
export function ErrorsDetailedList({
  errors,
  onShowErrorContext,
}) {
  if (!errors || errors.length === 0) return null;

  return (
    <Card sx={{ mt: 2, borderRadius: 2, boxShadow: 3 }}>
      <CardContent>
        <Typography variant="h6">
          Detailed Parsing Issues
        </Typography>
        <Stack spacing={1} sx={{ mt: 1 }}>
          {errors.map((err, i) => (
            <Paper
              key={i}
              variant="outlined"
              sx={{
                p: 1,
                display: "flex",
                alignItems: "center",
                gap: 2,
              }}
            >
              <Box sx={{ minWidth: 120 }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                >
                  {err.severity.toUpperCase()}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 700 }}
                >
                  {err.lineNumber
                    ? `Line ${err.lineNumber}`
                    : "File"}
                </Typography>
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2">
                  {err.message}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                >
                  {err.lineText
                    ? String(err.lineText).slice(0, 220)
                    : ""}
                </Typography>
              </Box>
              <Stack direction="row" spacing={1}>
                <Button
                  size="small"
                  onClick={() =>
                    onShowErrorContext(err)
                  }
                  startIcon={<VisibilityIcon />}
                >
                  Context
                </Button>
              </Stack>
            </Paper>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}
