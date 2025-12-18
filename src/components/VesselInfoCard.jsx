import React from "react";
import {
  Card,
  CardContent,
  Stack,
  Typography,
  Grid,
  Divider,
  Chip,
} from "@mui/material";
import SailingIcon from "@mui/icons-material/Sailing";

/**
 * VesselInfo Component
 * Displays parsed VESINFO (Part A) in a card layout
 */
export default function VesselInfoCard({ ves }) {
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
        <Stack
          direction="row"
          spacing={1.5}
          alignItems="center"
          mb={1}
        >
          <SailingIcon color="primary" />
          <Typography variant="h6">Vessel Information</Typography>
        </Stack>
        <Grid container spacing={1}>
          {fields.map((f, i) => (
            <Grid item xs={12} sm={6} key={i}>
              <Typography variant="caption" color="text.secondary">
                {f[0]}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {f[1] || "—"}
              </Typography>
            </Grid>
          ))}
        </Grid>
        <Divider sx={{ my: 1 }} />
        <Typography variant="subtitle2">Declarations</Typography>
        <Stack
          direction="row"
          spacing={1}
          mt={1}
          flexWrap="wrap"
        >
          {decls.map((d, i) => (
            <Chip
              key={i}
              label={`${d[0]}: ${d[1] || "?"}`}
              size="small"
              color={d[1] === "Y" ? "success" : "default"}
            />
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}
