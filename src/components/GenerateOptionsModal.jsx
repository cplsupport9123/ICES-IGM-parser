import React, { useEffect, useMemo, useState } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, FormGroup, FormControlLabel, Checkbox, TextField, Stack, Typography, Grid } from "@mui/material";

export default function GenerateOptionsModal({ open, onClose, defaults, onConfirm }) {
  const [includeHeader, setIncludeHeader] = useState(true);
  const [includeManifest, setIncludeManifest] = useState(true);
  const [includeVesinfo, setIncludeVesinfo] = useState(true);
  const [includeTrec, setIncludeTrec] = useState(true);

  const [hrec, setHrec] = useState(defaults?.header || "");
  const [vesinfoF, setVesinfoF] = useState(defaults?.vesinfoF || "");
  const [trec, setTrec] = useState(defaults?.trec || "");

  const GS = "\u001D";

  // HREC helpers (indexes based on observed samples)
  const hrecLabels = [
    { idx: 1, key: "senderQualifier", label: "Sender Qualifier" },
    { idx: 2, key: "senderId", label: "Sender ID" },
    { idx: 3, key: "receiverQualifier", label: "Receiver Qualifier" },
    { idx: 4, key: "receiverId", label: "Receiver ID" },
    { idx: 5, key: "version", label: "Version No" },
    { idx: 6, key: "environment", label: "Test/Prod (T/P)" },
    // idx 7 is blank per samples
    { idx: 8, key: "messageId", label: "Message ID" },
    { idx: 9, key: "voyageNo", label: "Voyage No" },
    { idx: 10, key: "igmDate", label: "IGM Date (YYYYMMDD)" },
    { idx: 11, key: "igmTime", label: "Time (HHMM)" },
  ];

  const parseHrec = (line) => {
    const parts = (line || "").split(GS);
    return hrecLabels.reduce((acc, f) => ({ ...acc, [f.key]: parts[f.idx] || "" }), {});
  };
  const composeHrec = (fields) => {
    const parts = new Array(12).fill("");
    parts[0] = "HREC";
    hrecLabels.forEach((f) => { parts[f.idx] = fields[f.key] || ""; });
    return parts.join(GS);
  };

  // Vesinfo helpers (26 fields as per parser mapping)
  const vesLabels = [
    "Message Type",
    "Custom House Code",
    "IGM No",
    "IGM Date (DDMMYYYY)",
    "IMO Code",
    "Call Sign",
    "Voyage No",
    "Shipping Line Code",
    "Shipping Agent Code",
    "Master Name",
    "Port of Arrival",
    "Last Port Called",
    "Port Prior 12",
    "Port Prior 13",
    "Vessel Type",
    "Total No Of Lines",
    "Brief Cargo Description",
    "Expected DateTime Arrival",
    "Lighthouse Dues",
    "Same Bottom Cargo",
    "Ship Stores Declaration",
    "Crew List Declaration",
    "Passenger List",
    "Crew Effect Declaration",
    "Maritime Declaration",
    "Terminal Operator Code",
  ];

  const parseVesF = (line) => {
    const arr = (line || "").split(GS);
    // ensure at least 26 fields
    while (arr.length < 26) arr.push("");
    return arr.slice(0, 26);
  };
  const composeVesF = (arr) => arr.slice(0, 26).join(GS);

  const [hrecFields, setHrecFields] = useState(parseHrec(hrec));
  const [vesFields, setVesFields] = useState(parseVesF(vesinfoF));

  useEffect(() => {
    const h = defaults?.header || hrec;
    const v = defaults?.vesinfoF || vesinfoF;
    setHrec(h);
    setVesinfoF(v);
    setHrecFields(parseHrec(h));
    setVesFields(parseVesF(v));
    setTrec(defaults?.trec || trec);
  }, [defaults]);

  const confirm = () => {
    const composedHrec = composeHrec(hrecFields);
    const composedVesF = composeVesF(vesFields);
    onConfirm({
      include: { header: includeHeader, manifest: includeManifest, vesinfo: includeVesinfo, trec: includeTrec },
      values: { header: composedHrec, vesinfoF: composedVesF, trec },
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Generate Options</DialogTitle>
      <DialogContent>
        <FormGroup>
          <FormControlLabel control={<Checkbox checked={includeHeader} onChange={(e)=>setIncludeHeader(e.target.checked)} />} label="Include Header (HREC)" />
          <FormControlLabel control={<Checkbox checked={includeManifest} onChange={(e)=>setIncludeManifest(e.target.checked)} />} label="Include Manifest wrapper" />
          <FormControlLabel control={<Checkbox checked={includeVesinfo} onChange={(e)=>setIncludeVesinfo(e.target.checked)} />} label="Include Vesinfo block" />
          <FormControlLabel control={<Checkbox checked={includeTrec} onChange={(e)=>setIncludeTrec(e.target.checked)} />} label="Include TREC" />
        </FormGroup>

        <Stack spacing={3} sx={{ mt: 2 }}>
          <Typography variant="subtitle2">Header (HREC) fields</Typography>
          <Grid container spacing={2}>
            {hrecLabels.map((f) => (
              <Grid key={f.key} item xs={12} sm={6} md={4}>
                <TextField
                  label={f.label}
                  value={hrecFields[f.key] || ""}
                  onChange={(e)=>setHrecFields(prev=>({ ...prev, [f.key]: e.target.value }))}
                  fullWidth
                />
              </Grid>
            ))}
          </Grid>
          <Typography variant="caption">Message ID, Voyage No, IGM Date and Time are used to build the HREC line. Test/Prod is T/P. Version is typically ICES1_5.</Typography>

          <Typography variant="subtitle2">Vesinfo (F) fields</Typography>
          <Grid container spacing={2}>
            {vesLabels.map((label, i) => (
              <Grid key={i} item xs={12} sm={6} md={4}>
                <TextField
                  label={`${i}. ${label}`}
                  value={vesFields[i] || ""}
                  onChange={(e)=>{
                    const val = e.target.value;
                    setVesFields(prev=>{
                      const arr = [...prev];
                      arr[i] = val;
                      return arr;
                    });
                  }}
                  fullWidth
                />
              </Grid>
            ))}
          </Grid>

          <Typography variant="subtitle2">TREC</Typography>
          <TextField label="TREC line" value={trec} onChange={(e)=>setTrec(e.target.value)} fullWidth />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={confirm}>Apply & Generate</Button>
      </DialogActions>
    </Dialog>
  );
}
