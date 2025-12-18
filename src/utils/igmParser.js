/**
 * IGM Parser Utilities
 * Core parsing logic extracted from App.jsx for reusability
 */

// exact GS character used in IGM samples (literal Group Separator)
const GS = "\u001D"; // 0x1D

/**
 * Split an IGM record by various delimiters (GS, visible glyph, or pipe)
 * @param {string} line - The line to split
 * @returns {string[]} - Array of fields
 */
export const splitRecord = (line) => {
  if (!line) return [];
  if (line.includes(GS))
    return line.split(GS).map((s) => (s === undefined ? "" : s));
  if (line.includes("\u001D"))
    return line.split("\u001D").map((s) => (s === undefined ? "" : s));
  return line.split("|").map((s) => (s === undefined ? "" : s));
};

/**
 * Get unique values from array, filtering out empty/falsy values
 * @param {any[]} arr - Input array
 * @returns {any[]} - Unique non-falsy values
 */
export const unique = (arr) => [
  ...new Set((arr || []).filter(Boolean)),
];

/**
 * Pad a number to a specific length (for display)
 * @param {number} n - Number to pad
 * @param {number} len - Target length
 * @returns {string} - Padded string
 */
export const pad = (n, len = 4) => String(n).padStart(len, " ");

/**
 * Build a context preview around a specific line number
 * @param {string[]} rawLines - All lines from input
 * @param {number} lineNumber - 1-based line number to center on
 * @param {number} ctx - Number of lines before/after to include
 * @returns {string} - Formatted context preview
 */
export const buildContextPreview = (rawLines, lineNumber, ctx = 6) => {
  if (!rawLines || rawLines.length === 0) return "";
  if (!lineNumber) return rawLines.join("\n");
  const idx = Math.max(0, (lineNumber || 1) - 1);
  const start = Math.max(0, idx - ctx);
  const end = Math.min(rawLines.length - 1, idx + ctx);
  return rawLines
    .slice(start, end + 1)
    .map((l, i) => {
      const ln = start + i + 1;
      const pointer = ln === lineNumber ? ">>" : "  ";
      return `${pointer} ${pad(ln)} | ${l}`;
    })
    .join("\n");
};

/**
 * Parse VESINFO F-record into a structured 26-field object (ICES SACHI01 Part A)
 * @param {string[]} vesinfoLines - Lines from the <vesinfo> section
 * @returns {object|null} - Parsed vessel info object or null
 */
export const parseVesinfoFromLines = (vesinfoLines) => {
  if (!vesinfoLines || vesinfoLines.length === 0) return null;
  // Accept vesinfo lines starting with F, A, or C (per ICEGATE SACHI01 spec)
  const recLine = vesinfoLines.find((l) => {
    const t = l && l.trim();
    return t && (/^[FAC]/.test(t));
  });
  if (!recLine) return null;

  const parts = splitRecord(recLine).map((p) =>
    p === undefined ? "" : p.trim()
  );
  const get = (i) => parts[i] || "";

  const ves = {
    rawLine: recLine,
    field1_messageType: get(0),
    field2_customHouseCode: get(1),
    field3_igmNo: get(2),
    field4_igmDate_ddmmyyyy: get(3),
    field5_imoCode: get(4),
    field6_callSign: get(5),
    field7_voyageNo: get(6),
    field8_shippingLineCode: get(7),
    field9_shippingAgentCode: get(8),
    field10_masterName: get(9),
    field11_portOfArrival: get(10),
    field12_lastPortCalled: get(11),
    field13_portPrior12: get(12),
    field14_portPrior13: get(13),
    field15_vesselType: get(14),
    field16_totalNoOfLines: get(15),
    field17_briefCargoDescription: get(16),
    field18_expectedDateTimeArrival: get(17),
    field19_lighthouseDues: get(18),
    field20_sameBottomCargo: get(19),
    field21_shipStoresDeclaration: get(20),
    field22_crewListDeclaration: get(21),
    field23_passengerList: get(22),
    field24_crewEffectDeclaration: get(23),
    field25_maritimeDeclaration: get(24),
    field26_terminalOperatorCode: get(25),
  };

  // Convert IGM date to ISO format if valid
  if (
    ves.field4_igmDate_ddmmyyyy &&
    ves.field4_igmDate_ddmmyyyy.length === 8
  ) {
    const d = ves.field4_igmDate_ddmmyyyy;
    ves.igmDateISO = `${d.slice(4, 8)}-${d.slice(2, 4)}-${d.slice(0, 2)}`;
  }

  // Convert ETA/ATA to ISO format if valid
  if (ves.field18_expectedDateTimeArrival) {
    const raw = ves.field18_expectedDateTimeArrival.replace(/\s+/g, "");
    if (/^\d{8}\d{4}$/.test(raw)) {
      ves.etaISO = `${raw.slice(4, 8)}-${raw.slice(2, 4)}-${raw.slice(
        0,
        2
      )}T${raw.slice(8, 10)}:${raw.slice(10, 12)}:00`;
    } else if (/^\d{8}$/.test(raw)) {
      ves.etaISO = `${raw.slice(4, 8)}-${raw.slice(2, 4)}-${raw.slice(0, 2)}`;
    } else {
      ves.etaRaw = ves.field18_expectedDateTimeArrival;
    }
  }

  return ves;
};

/**
 * Validate a cargo F-record for common issues
 * @param {string[]} parts - Parsed field parts
 * @param {number} lineNumber - Line number (1-based)
 * @param {function} addError - Callback to add error
 * @param {object} cargosSoFar - Already parsed cargos (for duplicate check)
 */
export const validateCargoLine = (
  parts,
  lineNumber,
  addError,
  cargosSoFar
) => {
  const get = (i) => (parts[i] || "").trim();
  const lineNo = get(7);
  const subLine = get(8);
  const blNo = get(9);
  const nature = get(23) || get(24) || "";

  if (!lineNo) {
    addError({
      lineNumber,
      lineText: parts.join(GS),
      message: "Cargo F-line missing Line No (field 8).",
      severity: "error",
    });
  } else {
    if (!/^\d{1,4}$/.test(lineNo)) {
      addError({
        lineNumber,
        lineText: parts.join(GS),
        message: `Invalid Line No '${lineNo}'. Must be numeric 1-9999.`,
        severity: "error",
      });
    }
    if (cargosSoFar[lineNo]) {
      addError({
        lineNumber,
        lineText: parts.join(GS),
        message: `Duplicate Line No ${lineNo}.`,
        severity: "warning",
      });
    }
  }

  if (subLine && subLine !== "0") {
    addError({
      lineNumber,
      lineText: parts.join(GS),
      message: `Sub Line should be 0 for initial filing; found '${subLine}'.`,
      severity: "warning",
    });
  }

  if (!nature) {
    addError({
      lineNumber,
      lineText: parts.join(GS),
      message: "Nature of Cargo missing (field 24).",
      severity: "error",
    });
  } else {
    if (!/^(C|P|LB|DB|CP)$/i.test(nature)) {
      addError({
        lineNumber,
        lineText: parts.join(GS),
        message: `Unknown Nature of Cargo '${nature}'. Expected C,P,LB,DB,CP.`,
        severity: "warning",
      });
    }
  }

  if (blNo && blNo.toUpperCase() === "EMPTY") {
    addError({
      lineNumber,
      lineText: parts.join(GS),
      message:
        "B/L No is 'EMPTY' (empty container import). Many other fields may be optional.",
      severity: "info",
    });
  }

  const houseBl = get(14);
  const houseBlDate = get(15);
  if (houseBl && !houseBlDate) {
    addError({
      lineNumber,
      lineText: parts.join(GS),
      message: "House B/L No provided but House B/L Date missing.",
      severity: "error",
    });
  }
};

/**
 * Validate a container record for common issues
 * @param {string[]} parts - Parsed field parts
 * @param {number} lineNumber - Line number (1-based)
 * @param {function} addError - Callback to add error
 */
export const validateContainerLine = (parts, lineNumber, addError) => {
  const get = (i) => (parts[i] || "").trim();
  const lineNo = get(7);
  const containerNo = get(9);
  const status = get(12) || get(13);
  const iso = get(15);
  const soc = get(16);

  if (!lineNo) {
    addError({
      lineNumber,
      lineText: parts.join(GS),
      message: "Container line missing cargo Line Number (field 8).",
      severity: "error",
    });
  } else if (!/^\d{1,4}$/.test(lineNo)) {
    addError({
      lineNumber,
      lineText: parts.join(GS),
      message: `Invalid Line No on container '${lineNo}'.`,
      severity: "error",
    });
  }

  if (!containerNo) {
    addError({
      lineNumber,
      lineText: parts.join(GS),
      message: "Container No missing (field 10).",
      severity: "error",
    });
  } else {
    if (containerNo.length < 7 || containerNo.length > 12) {
      addError({
        lineNumber,
        lineText: parts.join(GS),
        message: `Container No '${containerNo}' length unusual.`,
        severity: "warning",
      });
    }
  }

  if (status && !/^(FCL|LCL|EMP)$/i.test(status)) {
    addError({
      lineNumber,
      lineText: parts.join(GS),
      message: `Container status '${status}' unexpected (expected FCL/LCL/EMP).`,
      severity: "warning",
    });
  }

  if (iso && iso.length > 4) {
    addError({
      lineNumber,
      lineText: parts.join(GS),
      message: `ISO code '${iso}' seems too long (>4).`,
      severity: "warning",
    });
  }

  if (soc && !/^[YN]$/i.test(soc)) {
    addError({
      lineNumber,
      lineText: parts.join(GS),
      message: `SOC flag should be Y or N. Got '${soc}'.`,
      severity: "warning",
    });
  }
};

/**
 * Main IGM parser: splits manifest into structured cargo, containers, vessel info, etc.
 * @param {string} text - Full IGM text content
 * @param {function} addError - Callback to add parsing errors
 * @returns {object} - Parsed manifest with headerLines, vesinfoLines, vesinfoObj, cargos, containers, trecLine, rawLines
 */
export const parseIGM = (text, addError) => {
  if (typeof text !== "string") text = String(text ?? "");
  const rawLines = text.split(/\r?\n/);
  const lowerAll = (text || "").toLowerCase();
  const headerLines = [];
  const vesinfoLines = [];
  const cargos = {};
  const containers = [];
  let inManifest = false,
    inVesinfo = false,
    inCargo = false,
    inContain = false;
  let trecLine = "";

  try {
    rawLines.forEach((raw, idx) => {
      const lineNumber = idx + 1;
      const line = raw || "";
      const t = line.trim();

      // If manifest not explicitly started, still allow parsing when known blocks appear
      if (!inManifest) {
        if (t.toLowerCase().startsWith("<manifest>")) {
          inManifest = true;
          headerLines.push(line);
          return;
        }
        // Detect blocks even without <manifest> wrapper
        if (t.toLowerCase().startsWith("<vesinfo>")) {
          inManifest = true; // implicit manifest context
          inVesinfo = true;
          vesinfoLines.push(line);
          return;
        }
        if (t.toLowerCase().startsWith("<cargo>") || t.toLowerCase().startsWith("<linfo>")) {
          inManifest = true;
          inCargo = true;
          return;
        }
        if (t.toLowerCase().startsWith("<contain>")) {
          inManifest = true;
          inContain = true;
          return;
        }
        // Accumulate as header until we hit a known block
        headerLines.push(line);
        return;
      }

      if (t.toLowerCase().startsWith("<vesinfo>")) {
        inVesinfo = true;
        vesinfoLines.push(line);
        return;
      }

      if (inVesinfo) {
        vesinfoLines.push(line);
        if (t.toLowerCase().startsWith("<end-vesinfo>")) inVesinfo = false;
        return;
      }

      if (
        t.toLowerCase().startsWith("<cargo>") ||
        t.toLowerCase().startsWith("<linfo>")
      ) {
        inCargo = true;
        return;
      }

      if (
        inCargo &&
        (t.toLowerCase().startsWith("<end-cargo>") ||
          t.toLowerCase().startsWith("<end-linfo>"))
      ) {
        inCargo = false;
        return;
      }

      if (t.toLowerCase().startsWith("<contain>")) {
        inContain = true;
        return;
      }

      if (t.toLowerCase().startsWith("<end-contain>")) {
        inContain = false;
        return;
      }

      if (t.toLowerCase().startsWith("<end-manifest>")) {
        return;
      }

      if (t.startsWith("TREC")) {
        trecLine = line;
        return;
      }

      // cargo lines: they typically start with F (or V/S etc)
      if (inCargo && /^[FVSAD]/i.test(t.charAt(0))) {
        const parts = splitRecord(line).map((p) =>
          p === undefined ? "" : p.trim()
        );
        validateCargoLine(parts, lineNumber, addError, cargos);
        const lineNo = parts[7] || "";
        const blNo = parts[9] || "";
        const consignee = parts[15] || parts[16] || "";
        const lcIndex = parts.findIndex((p) => p === "LC");
        let cfs = "";
        if (lcIndex !== -1 && parts[lcIndex + 1]) {
          cfs = parts[lcIndex + 1];
        } else {
          const cand = parts.find((p) => p && /INCCU/i.test(p));
          if (cand) cfs = cand;
        }
        const uno =
          parts[35] || parts[36] || parts.find((p) => /^\d{5}$/.test(p));
        const imco =
          parts[36] || parts[37] || parts.find((p) => /^\d{3}$/.test(p));
        const goodsDesc = parts[34] || parts[35] || parts.join(" ");
        const nature = parts[23] || parts[24] || "";
          // Mode of Transport: ICES SACHI01 field 40 (index 39)
          const modeOfTransport = parts[39] || "";

        if (lineNo) {
          cargos[lineNo] = {
            raw: line,
            parts,
            lineNumber,
            line: lineNo,
            blNo,
            consignee,
            cfs,
            uno: uno || "",
            imco: imco || "",
            goodsDesc: goodsDesc || "",
            nature: nature || "",
            modeOfTransport,
            // Additional fields for UI headers
            portOfLoading: parts[11] || "",
            portOfDestination: parts[12] || "",
            igmNo: parts[5] || "",
            igmDate: parts[6] || "",
            blDate: parts[10] || "",
            typeOfPackage: parts[28] || "",
            grossWeight: parts[29] || "",
            grossWeightUnit: parts[30] || "",
            grossVolume: parts[31] || "",
            grossVolumeUnit: parts[32] || "",
          };
        }
        return;
      }

      // container lines
      if (inContain) {
        const firstChar = t.charAt(0);
        if (/^[VFSAD]$/i.test(firstChar)) {
          const parts = splitRecord(line).map((p) =>
            p === undefined ? "" : p.trim()
          );
          const msgType = (parts[0] || "").toUpperCase();
          if (!["V", "F", "S", "A", "D"].includes(msgType)) {
            addError({
              lineNumber,
              lineText: line,
              message: `Container line does not start with valid message type (V/F/S/A/D): found '${parts[0]}'`,
              severity: "warning",
            });
          }
          validateContainerLine(parts, lineNumber, addError);
          const lineNo = parts[7] || "";
          const containerNo = parts[9] || "";
          const seal = parts[10] || "";
          const status = parts[12] || parts[13] || "";
          // Field mapping (0-based parts):
          // parts[12] => status (e.g. FCL)
          // parts[13] => number of packages in container
          // parts[14] => weight for that container
          // parts[15] => ISO code of container (or other code)
          // parts[16] => SOC flag
          const noOfPkgs = parts[13] || "";
          const weight = parts[14] || "";
          const iso = parts[15] || "";
          const soc = parts[16] || "";
          const cfs =
            lineNo && cargos[lineNo] ? cargos[lineNo].cfs || "" : "";
          const consignee =
            lineNo && cargos[lineNo] ? cargos[lineNo].consignee || "" : "";

          containers.push({
            raw: line,
            parts,
            lineNumber,
            msgType,
            line: lineNo,
            containerNo,
            seal,
            status,
            noOfPkgs,
            weight,
            iso,
            soc,
            cfs,
            consignee,
          });
          return;
        }
      }
    });

    // structural checks
    const lower = text.toLowerCase();
    const hasManifestStart = lower.includes("<manifest>");
    const hasManifestEnd = lower.includes("<end-manifest>");
    const hasCargoBlock = lower.includes("<cargo>") || lower.includes("<linfo>");
    const hasContainBlock = lower.includes("<contain>");

    if (!hasManifestStart || !hasManifestEnd) {
      addError({
        lineNumber: null,
        lineText: null,
        message: "Manifest <manifest> or <END-manifest> tag missing.",
        severity: hasCargoBlock || hasContainBlock ? "warning" : "error",
      });
    }

    if (!hasCargoBlock) {
      addError({
        lineNumber: null,
        lineText: null,
        message: "Cargo block <cargo> (or <linfo>) missing.",
        severity: "warning",
      });
    }

    if (vesinfoLines.length === 0) {
      addError({
        lineNumber: null,
        lineText: null,
        message: "Vesinfo block <vesinfo> missing.",
        severity: "warning",
      });
    }

    const cargoLines = Object.values(cargos);
    const containerRequired = cargoLines.some((c) =>
      /^(C|CP)$/i.test((c.nature || "").toString())
    );
    if (containerRequired && containers.length === 0) {
      addError({
        lineNumber: null,
        lineText: null,
        message:
          "Container block missing but required for containerized cargo.",
        severity: "error",
      });
    }

    containers.forEach((cont) => {
      if (cont.line && !cargos[cont.line]) {
        addError({
          lineNumber: cont.lineNumber,
          lineText: cont.raw,
          message: `Container references unknown cargo line ${cont.line}.`,
          severity: "warning",
        });
      }
    });
  } catch (err) {
    addError({
      lineNumber: null,
      lineText: null,
      message: `Parsing exception: ${err?.message || String(err)}`,
      severity: "error",
    });
  }

  const vesinfoObj = parseVesinfoFromLines(vesinfoLines);
  return {
    headerLines,
    vesinfoLines,
    vesinfoObj,
    cargos,
    containers,
    trecLine,
    rawLines,
    missing: {
      manifest: !(lowerAll.includes("<manifest>") && lowerAll.includes("<end-manifest>")),
      vesinfo: !vesinfoObj,
      cargo: Object.keys(cargos).length === 0,
      contain: containers.length === 0,
    },
  };
};

/**
 * Generate IGM text for a specific set of cargo lines
 * @param {object} data - Parsed IGM data
 * @param {string[]} linesToInclude - Array of line numbers to include
 * @returns {string} - Formatted IGM text
 */
export const generateIGMForLines = (data, linesToInclude) => {
  if (!data || !linesToInclude || linesToInclude.length === 0) return "";

  const headerText = (data.headerLines || []).join("\n") + "\n";
  const ves =
    data.vesinfoLines && data.vesinfoLines.length > 0
      ? data.vesinfoLines.join("\n") + "\n\n"
      : "";

  let cargoText = "<cargo>\n";
  for (const ln of linesToInclude) {
    const cargo = data.cargos[ln];
    if (cargo && cargo.raw) cargoText += cargo.raw + "\n";
  }
  cargoText += "<END-cargo>\n\n";

  let containText = "<contain>\n";
  for (const cont of data.containers) {
    if (linesToInclude.includes(cont.line) && cont.raw)
      containText += cont.raw + "\n";
  }
  containText += "<END-contain>\n";

  const endManifest = "\n<END-manifest>\n";
  const trecText = data.trecLine ? data.trecLine + "\n" : "";

  return headerText + ves + cargoText + containText + endManifest + trecText;
};

// Defaults used when generating a complete IGM if parts are missing
const DEFAULT_HREC = `HREC\u001DZZ\u001DSEACONCCU\u001DZZ\u001DINCCU1\u001DICES1_5\u001DP\u001D\u001DSACHI01\u001D22021W\u001D20221014\u001D1400`;
const DEFAULT_VESINFO_F = `F\u001DINCCU1\u001D\u001D\u001D9399117\u001D9V3523\u001D22021W\u001DXCL\u001DAAMCS5523K\u001DVIRENDER SINGH DALAL\u001DINCCU1\u001DLKCMB\u001D\u001D\u001DC\u001D179\u001DGENERAL CARGO\u001D16102022 18:00\u001D\u001DN\u001DY\u001DY\u001DN\u001DY\u001DY\u001DINCCU1KKP1`;
const DEFAULT_TREC = `TREC\u001D22021W`;

const ensureHeader = (data, defaults) => {
  const hasHrec = (data.headerLines || []).some((l) => l.startsWith("HREC"));
  return hasHrec
    ? (data.headerLines || []).join("\n")
    : (defaults?.header || DEFAULT_HREC);
};

const ensureVesinfoBlock = (data, defaults) => {
  if (data.vesinfoLines && data.vesinfoLines.length > 0) {
    return data.vesinfoLines.join("\n") + "\n\n";
  }
  const f = defaults?.vesinfoF || DEFAULT_VESINFO_F;
  return `<vesinfo>\n${f}\n<END-vesinfo>\n\n`;
};

const ensureTrec = (data, defaults) => {
  return data.trecLine && data.trecLine.trim().length > 0
    ? data.trecLine
    : (defaults?.trec || DEFAULT_TREC);
};

/**
 * Generate IGM text for given lines, ensuring header/manifest/vesinfo/trec present using defaults when missing
 */
export const generateIGMForLinesWithDefaults = (data, linesToInclude, defaults, options) => {
  if (!data || !linesToInclude || linesToInclude.length === 0) return "";
  const include = { header: true, manifest: true, vesinfo: true, trec: true, ...(options || {}) };

  const headerText = include.header ? (ensureHeader(data, defaults) + "\n") : "";
  const ves = include.vesinfo ? ensureVesinfoBlock(data, defaults) : "";

  let cargoText = "<cargo>\n";
  for (const ln of linesToInclude) {
    const cargo = data.cargos[ln];
    if (cargo && cargo.raw) cargoText += cargo.raw + "\n";
  }
  cargoText += "<END-cargo>\n\n";

  let containText = "<contain>\n";
  for (const cont of data.containers || []) {
    if (linesToInclude.includes(cont.line) && cont.raw)
      containText += cont.raw + "\n";
  }
  containText += "<END-contain>\n";

  const manifestStart = include.manifest ? "<manifest>\n" : "";
  const manifestEnd = include.manifest ? "\n<END-manifest>\n" : "";
  const trecText = include.trec ? (ensureTrec(data, defaults) + "\n") : "";

  return headerText + manifestStart + ves + cargoText + containText + manifestEnd + trecText;
};

/**
 * Generate IGM text for a specific CFS, ensuring required wrappers by defaults
 */
export const generateIGMForCFSWithDefaults = (data, cfs, defaults, options) => {
  if (!data || !cfs) return "";
  const include = { header: true, manifest: true, vesinfo: true, trec: true, ...(options || {}) };

  const headerText = include.header ? (ensureHeader(data, defaults) + "\n") : "";
  const ves = include.vesinfo ? ensureVesinfoBlock(data, defaults) : "";

  const cargoLines = Object.values(data.cargos || {})
    .filter((c) => (c.cfs || "") === cfs)
    .map((c) => c.raw)
    .filter(Boolean);

  const cargoText = "<cargo>\n" + cargoLines.join("\n") + "\n<END-cargo>\n\n";

  const containerLines = (data.containers || [])
    .filter((c) => (c.cfs || "") === cfs)
    .map((c) => c.raw)
    .filter(Boolean);

  const containText = "<contain>\n" + containerLines.join("\n") + "\n<END-contain>\n";

  const manifestStart = include.manifest ? "<manifest>\n" : "";
  const manifestEnd = include.manifest ? "\n<END-manifest>\n" : "";
  const trecText = include.trec ? (ensureTrec(data, defaults) + "\n") : "";

  return headerText + manifestStart + ves + cargoText + containText + manifestEnd + trecText;
};

/**
 * Generate IGM text for a specific CFS
 * @param {object} data - Parsed IGM data
 * @param {string} cfs - CFS code to filter by
 * @returns {string} - Formatted IGM text
 */
export const generateIGMForCFS = (data, cfs) => {
  if (!data || !cfs) return "";

  const headerText = (data.headerLines || []).join("\n") + "\n";
  const ves =
    data.vesinfoLines && data.vesinfoLines.length > 0
      ? data.vesinfoLines.join("\n") + "\n\n"
      : "";

  const cargoLines = Object.values(data.cargos || {})
    .filter((c) => (c.cfs || "") === cfs)
    .map((c) => c.raw)
    .filter(Boolean);

  const cargoText =
    "<cargo>\n" + cargoLines.join("\n") + "\n<END-cargo>\n\n";

  const containerLines = (data.containers || [])
    .filter((c) => (c.cfs || "") === cfs)
    .map((c) => c.raw)
    .filter(Boolean);

  const containText =
    "<contain>\n" + containerLines.join("\n") + "\n<END-contain>\n";

  const endManifest = "\n<END-manifest>\n";
  const trecText = data.trecLine ? data.trecLine + "\n" : "";

  return (
    headerText +
    ves +
    cargoText +
    containText +
    endManifest +
    trecText
  );
};
