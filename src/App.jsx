import { useState, useRef, useEffect, useCallback } from "react";
import { Analytics } from "@vercel/analytics/react"

const FONT = "'Courier New', monospace";
const MONO = "'Courier New', monospace";

const G = {
  dark:    "#1a3d1f",
  mid:     "#2d6a35",
  bright:  "#3d8b46",
  light:   "#a8d5ae",
  pale:    "#e8f5ea",
  paper:   "#f4faf5",
  meanBg:  "#d4edda",
  meanTxt: "#155724",
};

const defaultRows = Array.from({ length: 8 }, (_, i) => ({
  id: i, x: "", r1: "", r2: "", r3: "",
}));

function mean(r1, r2, r3) {
  const nums = [r1, r2, r3].map(Number).filter((v, i) => [r1,r2,r3][i] !== "" && !isNaN(v));
  if (nums.length === 0) return "";
  return (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2);
}

function niceScale(minVal, maxVal, ticks = 8) {
  if (minVal === maxVal) return { min: minVal - 1, max: maxVal + 1, step: 0.5 };
  const range = maxVal - minVal;
  const rawStep = range / ticks;
  const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const nice = [1, 2, 2.5, 5, 10];
  const step = mag * (nice.find((n) => n * mag >= rawStep) || 10);
  const flooredMin = Math.floor(minVal / step) * step;
  const ceiledMax  = Math.ceil(maxVal / step) * step;
  // If the data minimum sits exactly on the axis line, pull the axis back one step
  const scaleMin = (Math.abs(flooredMin - minVal) < step * 0.001) ? flooredMin - step : flooredMin;
  // Same for maximum - push up one step if data sits exactly on top gridline
  const scaleMax = (Math.abs(ceiledMax - maxVal) < step * 0.001) ? ceiledMax + step : ceiledMax;
  return { min: scaleMin, max: scaleMax, step };
}

const MARGIN = { top: 56, right: 36, bottom: 76, left: 86 };
const ASPECT = 3 / 2; // width:height ratio

export default function App() {
  const [xLabel, setXLabel] = useState("Independent variable");
  const [yLabel, setYLabel] = useState("Dependent variable");
  const [xUnit, setXUnit]   = useState("");
  const [yUnit, setYUnit]   = useState("");
  const [rows, setRows]     = useState(defaultRows);
  const [xScaleMin, setXScaleMin] = useState("");
  const [xScaleMax, setXScaleMax] = useState("");
  const [yScaleMin, setYScaleMin] = useState("");
  const [yScaleMax, setYScaleMax] = useState("");
  const [lobfMode, setLobfMode]   = useState(false);
  const [lobfPoints, setLobfPoints] = useState([]);
  const [showLobf, setShowLobf]   = useState(false);
  const [graphTitle, setGraphTitle] = useState("My Science Graph");
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [plottedData, setPlottedData] = useState([]);
  const canvasRef = useRef(null);
  const tableRef = useRef(null);
  const wrapperRef = useRef(null);
  const [canvasW, setCanvasW] = useState(900);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 640);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Hide number input spinners globally
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      input[type=number]::-webkit-inner-spin-button,
      input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
      input[type=number] { -moz-appearance: textfield; }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  // Resize observer — canvas fills its wrapper
  useEffect(() => {
    if (!wrapperRef.current) return;
    // Set initial size immediately
    const initialW = Math.floor(wrapperRef.current.getBoundingClientRect().width);
    if (initialW > 0) setCanvasW(initialW);
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        const w = Math.floor(entry.contentRect.width);
        if (w > 0) setCanvasW(w);
      }
    });
    ro.observe(wrapperRef.current);
    return () => ro.disconnect();
  }, []);

  const CW = canvasW;
  const CH = Math.round(canvasW / ASPECT);

  // pendingData: derived live from table, used for the "ready" count
  const pendingData = rows
    .map((r) => ({
      x: r.x !== "" ? Number(r.x) : null,
      y: (r.r1 !== "" || r.r2 !== "" || r.r3 !== "")
        ? Number(mean(r.r1, r.r2, r.r3)) : null,
    }))
    .filter((d) => d.x !== null && d.y !== null && !isNaN(d.x) && !isNaN(d.y));

  // plotData: only updated when user clicks "Plot graph"
  const plotData = plottedData;

  const _autoX = plotData.length ? niceScale(Math.min(...plotData.map(d=>d.x)), Math.max(...plotData.map(d=>d.x))) : { min: 0, max: 10 };
  const _autoY = plotData.length ? niceScale(Math.min(...plotData.map(d=>d.y)), Math.max(...plotData.map(d=>d.y))) : { min: 0, max: 10 };
  const xMin = xScaleMin !== "" ? Number(xScaleMin) : _autoX.min;
  const xMax = xScaleMax !== "" ? Number(xScaleMax) : _autoX.max;
  const yMin = yScaleMin !== "" ? Number(yScaleMin) : _autoY.min;
  const yMax = yScaleMax !== "" ? Number(yScaleMax) : _autoY.max;

  const dataToCanvas = useCallback((dx, dy) => {
    const pW = CW - MARGIN.left - MARGIN.right;
    const pH = CH - MARGIN.top - MARGIN.bottom;
    return {
      cx: MARGIN.left + ((dx - xMin) / (xMax - xMin)) * pW,
      cy: MARGIN.top + pH - ((dy - yMin) / (yMax - yMin)) * pH,
    };
  }, [xMin, xMax, yMin, yMax, CW, CH]);

  const canvasToData = useCallback((px, py) => {
    const pW = CW - MARGIN.left - MARGIN.right;
    const pH = CH - MARGIN.top - MARGIN.bottom;
    return {
      dx: xMin + ((px - MARGIN.left) / pW) * (xMax - xMin),
      dy: yMin + ((CH - MARGIN.bottom - py) / pH) * (yMax - yMin),
    };
  }, [xMin, xMax, yMin, yMax, CW, CH]);

  const autoScale = useCallback(() => {
    if (!plotData.length) return;
    const xs = plotData.map(d => d.x), ys = plotData.map(d => d.y);
    const xS = niceScale(Math.min(...xs), Math.max(...xs));
    const yS = niceScale(Math.min(...ys), Math.max(...ys));
    setXScaleMin(xS.min); setXScaleMax(xS.max);
    setYScaleMin(yS.min); setYScaleMax(yS.max);
  }, [plotData]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = CW * dpr;
    canvas.height = CH * dpr;
    canvas.style.width = CW + "px";
    canvas.style.height = CH + "px";
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    const pW = CW - MARGIN.left - MARGIN.right;
    const pH = CH - MARGIN.top - MARGIN.bottom;

    ctx.fillStyle = "#f5f8ff";
    ctx.fillRect(0, 0, CW, CH);

    const pixPerMM = 3.78;
    const xRange = xMax - xMin, yRange = yMax - yMin;

    // Guard: if range is zero or tiny, skip grid drawing to prevent infinite loops
    if (xRange <= 0 || yRange <= 0) {
      // Just draw axes and return early from grid section
    } else {
    const fineStepsX = Math.round(pW / pixPerMM);
    const fineStepsY = Math.round(pH / pixPerMM);
    const fineStepX = fineStepsX > 0 ? xRange / fineStepsX : xRange;
    const fineStepY = fineStepsY > 0 ? yRange / fineStepsY : yRange;

    // 1mm fine grid
    ctx.strokeStyle = "#c8dff5"; ctx.lineWidth = 0.35;
    if (fineStepX > 0) {
      for (let x = xMin; x <= xMax + fineStepX*0.01; x += fineStepX) {
        const { cx } = dataToCanvas(x, yMin);
        ctx.beginPath(); ctx.moveTo(cx, MARGIN.top); ctx.lineTo(cx, CH-MARGIN.bottom); ctx.stroke();
      }
    }
    if (fineStepY > 0) {
      for (let y = yMin; y <= yMax + fineStepY*0.01; y += fineStepY) {
        const { cy } = dataToCanvas(xMin, y);
        ctx.beginPath(); ctx.moveTo(MARGIN.left, cy); ctx.lineTo(CW-MARGIN.right, cy); ctx.stroke();
      }
    }

    // 5mm grid
    const xScale = niceScale(xMin, xMax), yScale = niceScale(yMin, yMax);
    const xStep5 = xScale.step / 5, yStep5 = yScale.step / 5;
    ctx.strokeStyle = "#88b8e8"; ctx.lineWidth = 0.65;
    if (xStep5 > 0) {
      for (let x = xMin; x <= xMax + xStep5*0.01; x += xStep5) {
        const { cx } = dataToCanvas(x, yMin);
        ctx.beginPath(); ctx.moveTo(cx, MARGIN.top); ctx.lineTo(cx, CH-MARGIN.bottom); ctx.stroke();
      }
    }
    if (yStep5 > 0) {
      for (let y = yMin; y <= yMax + yStep5*0.01; y += yStep5) {
        const { cy } = dataToCanvas(xMin, y);
        ctx.beginPath(); ctx.moveTo(MARGIN.left, cy); ctx.lineTo(CW-MARGIN.right, cy); ctx.stroke();
      }
    }

    // 1cm major grid
    ctx.strokeStyle = "#4a90c4"; ctx.lineWidth = 1.1;
    if (xScale.step > 0) {
      for (let x = xMin; x <= xMax + xScale.step*0.01; x += xScale.step) {
        const { cx } = dataToCanvas(x, yMin);
        ctx.beginPath(); ctx.moveTo(cx, MARGIN.top); ctx.lineTo(cx, CH-MARGIN.bottom); ctx.stroke();
      }
    }
    if (yScale.step > 0) {
      for (let y = yMin; y <= yMax + yScale.step*0.01; y += yScale.step) {
        const { cy } = dataToCanvas(xMin, y);
        ctx.beginPath(); ctx.moveTo(MARGIN.left, cy); ctx.lineTo(CW-MARGIN.right, cy); ctx.stroke();
      }
    }
    } // end range guard

    // Axes
    ctx.strokeStyle = G.dark; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(MARGIN.left, MARGIN.top);
    ctx.lineTo(MARGIN.left, CH-MARGIN.bottom);
    ctx.lineTo(CW-MARGIN.right, CH-MARGIN.bottom);
    ctx.stroke();

    // Tick labels — use safe scale computed outside guard
    const tickScaleX = niceScale(xMin, xMax), tickScaleY = niceScale(yMin, yMax);
    ctx.fillStyle = G.dark; ctx.font = `13px ${MONO}`; ctx.textAlign = "center";
    if (tickScaleX.step > 0) {
      for (let x = xMin; x <= xMax + tickScaleX.step*0.01; x += tickScaleX.step) {
        const { cx, cy } = dataToCanvas(x, yMin);
        ctx.strokeStyle = G.dark; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx, cy+5); ctx.stroke();
        ctx.fillText(+x.toFixed(8), cx, cy+17);
      }
    }
    ctx.textAlign = "right";
    if (tickScaleY.step > 0) {
      for (let y = yMin; y <= yMax + tickScaleY.step*0.01; y += tickScaleY.step) {
        const { cx, cy } = dataToCanvas(xMin, y);
        ctx.strokeStyle = G.dark; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx-5, cy); ctx.stroke();
        ctx.fillText(+y.toFixed(8), cx-7, cy+4);
      }
    }

    // Axis titles
    ctx.fillStyle = G.dark; ctx.font = `bold 14px ${FONT}`; ctx.textAlign = "center";
    const xAxisLabel = xUnit ? `${xLabel} (${xUnit})` : xLabel;
    const yAxisLabel = yUnit ? `${yLabel} (${yUnit})` : yLabel;
    ctx.fillText(xAxisLabel, MARGIN.left + pW/2, CH-8);
    ctx.save();
    ctx.translate(13, MARGIN.top + pH/2);
    ctx.rotate(-Math.PI/2);
    ctx.fillText(yAxisLabel, 0, 0);
    ctx.restore();

    // Graph title
    ctx.font = `bold 17px ${FONT}`; ctx.textAlign = "center"; ctx.fillStyle = G.dark;
    ctx.fillText(graphTitle, MARGIN.left + pW/2, 26);

    // Confirmed LOBF
    if (showLobf && lobfPoints.length === 2) {
      const p1 = dataToCanvas(lobfPoints[0].x, lobfPoints[0].y);
      const p2 = dataToCanvas(lobfPoints[1].x, lobfPoints[1].y);
      const slope = (p2.cy - p1.cy) / (p2.cx - p1.cx);
      ctx.save(); ctx.strokeStyle = "#c0392b"; ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(MARGIN.left, p1.cy + slope*(MARGIN.left - p1.cx));
      ctx.lineTo(CW-MARGIN.right, p1.cy + slope*(CW-MARGIN.right - p1.cx));
      ctx.stroke(); ctx.restore();
    }

    // LOBF preview
    if (lobfMode) {
      lobfPoints.forEach((pt) => {
        const { cx, cy } = dataToCanvas(pt.x, pt.y);
        ctx.beginPath(); ctx.arc(cx, cy, 6, 0, 2*Math.PI);
        ctx.fillStyle = "rgba(192,57,43,0.4)"; ctx.fill();
        ctx.strokeStyle = "#c0392b"; ctx.lineWidth = 2; ctx.stroke();
      });
      if (lobfPoints.length === 2) {
        const p1 = dataToCanvas(lobfPoints[0].x, lobfPoints[0].y);
        const p2 = dataToCanvas(lobfPoints[1].x, lobfPoints[1].y);
        const slope = (p2.cy - p1.cy) / (p2.cx - p1.cx);
        ctx.save(); ctx.strokeStyle = "rgba(192,57,43,0.45)"; ctx.lineWidth = 2; ctx.setLineDash([6,4]);
        ctx.beginPath();
        ctx.moveTo(MARGIN.left, p1.cy + slope*(MARGIN.left - p1.cx));
        ctx.lineTo(CW-MARGIN.right, p1.cy + slope*(CW-MARGIN.right - p1.cx));
        ctx.stroke(); ctx.restore();
      }
    }

    // Data points (crosses)
    plotData.forEach((d) => {
      const { cx, cy } = dataToCanvas(d.x, d.y);
      ctx.strokeStyle = G.dark; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(cx-5, cy); ctx.lineTo(cx+5, cy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx, cy-5); ctx.lineTo(cx, cy+5); ctx.stroke();
    });

    // Hover tooltip
    if (hoveredPoint) {
      const { cx, cy } = dataToCanvas(hoveredPoint.x, hoveredPoint.y);
      // Highlight ring around point
      ctx.beginPath(); ctx.arc(cx, cy, 10, 0, 2*Math.PI);
      ctx.strokeStyle = "#e67e22"; ctx.lineWidth = 2.5; ctx.stroke();
      // Build label
      const lbl = `x: ${hoveredPoint.x},  y: ${hoveredPoint.y}`;
      ctx.font = `bold 13px ${MONO}`;
      const tw = ctx.measureText(lbl).width;
      const boxW = tw + 16, boxH = 24;
      const offset = 18; // distance from point centre
      // Flip to left side if too close to right edge
      const flipX = cx + offset + boxW > CW - MARGIN.right;
      const bx = flipX ? cx - offset - boxW : cx + offset;
      // Flip upward if too close to bottom
      const flipY = cy + offset + boxH > CH - MARGIN.bottom;
      const by = flipY ? cy - offset - boxH : cy - boxH / 2;
      // Shadow
      ctx.shadowColor = "rgba(0,0,0,0.18)"; ctx.shadowBlur = 6; ctx.shadowOffsetX = 2; ctx.shadowOffsetY = 2;
      ctx.fillStyle = "#fffef8";
      ctx.beginPath();
      ctx.roundRect(bx, by, boxW, boxH, 4);
      ctx.fill();
      ctx.shadowColor = "transparent"; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
      ctx.strokeStyle = "#e67e22"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.roundRect(bx, by, boxW, boxH, 4); ctx.stroke();
      ctx.fillStyle = G.dark;
      ctx.fillText(lbl, bx + 8, by + boxH - 7);
    }
  }, [plotData, xMin, xMax, yMin, yMax, xLabel, yLabel, xUnit, yUnit,
      graphTitle, lobfPoints, lobfMode, showLobf, hoveredPoint, dataToCanvas, canvasW]);

  const handleCanvasClick = (e) => {
    if (!lobfMode) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const px = (e.clientX - rect.left) * (CW / rect.width);
    const py = (e.clientY - rect.top)  * (CH / rect.height);
    if (px < MARGIN.left || px > CW-MARGIN.right || py < MARGIN.top || py > CH-MARGIN.bottom) return;
    if (lobfPoints.length < 2) {
      const { dx, dy } = canvasToData(px, py);
      setLobfPoints(prev => [...prev, { x: parseFloat(dx.toFixed(3)), y: parseFloat(dy.toFixed(3)) }]);
    }
  };

  const handleCanvasTouch = (e) => {
    // On mobile, treat a tap as a hover to show the tooltip (or LOBF click)
    const touch = e.touches[0];
    if (!touch) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const px = (touch.clientX - rect.left) * (CW / rect.width);
    const py = (touch.clientY - rect.top)  * (CH / rect.height);
    // Check proximity to data points for tooltip
    let found = null;
    for (const d of plotData) {
      const { cx, cy } = dataToCanvas(d.x, d.y);
      if (Math.hypot(cx-px, cy-py) < 20) { found = d; break; }
    }
    setHoveredPoint(found);
    // If in LOBF mode, treat tap as a click
    if (lobfMode) {
      if (px < MARGIN.left || px > CW-MARGIN.right || py < MARGIN.top || py > CH-MARGIN.bottom) return;
      if (lobfPoints.length < 2) {
        const { dx, dy } = canvasToData(px, py);
        setLobfPoints(prev => [...prev, { x: parseFloat(dx.toFixed(3)), y: parseFloat(dy.toFixed(3)) }]);
      }
    }
  };

  const handleCanvasMouseMove = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const px = (e.clientX - rect.left) * (CW / rect.width);
    const py = (e.clientY - rect.top)  * (CH / rect.height);
    let found = null;
    for (const d of plotData) {
      const { cx, cy } = dataToCanvas(d.x, d.y);
      if (Math.hypot(cx-px, cy-py) < 12) { found = d; break; }
    }
    setHoveredPoint(found);
  };

  const handlePlot = () => {
    const data = rows
      .map((r) => ({
        x: r.x !== "" ? Number(r.x) : null,
        y: (r.r1 !== "" || r.r2 !== "" || r.r3 !== "")
          ? Number(mean(r.r1, r.r2, r.r3)) : null,
      }))
      .filter((d) => d.x !== null && d.y !== null && !isNaN(d.x) && !isNaN(d.y));
    setPlottedData(data);
    clearLobf();
  };

  const commitLobf = () => { if (lobfPoints.length === 2) { setShowLobf(true); setLobfMode(false); } };
  const clearLobf  = () => { setLobfPoints([]); setShowLobf(false); setLobfMode(false); };
  const updateRow  = (id, field, val) => setRows(rows.map(r => r.id === id ? {...r, [field]: val} : r));
  const addRow     = () => setRows([...rows, { id: Date.now(), x:"", r1:"", r2:"", r3:"" }]);
  const removeRow  = (id) => setRows(rows.filter(r => r.id !== id));


  const downloadGraph = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `${graphTitle.replace(/\s+/g, "_") || "graph"}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const downloadTable = () => {
    const rows_data = rows.filter(r => r.x !== "" || r.r1 !== "" || r.r2 !== "" || r.r3 !== "");
    if (rows_data.length === 0) return;

    const dpr = window.devicePixelRatio || 1;
    const FONT_HDR = 13, FONT_BODY = 14;
    const colW = 220, rowH = 36, pad = 10;

    // Measure header height needed (headers may wrap to 2 lines)
    const cols = [
      xLabel + (xUnit ? ` (${xUnit})` : ""),
      `${yLabel}${yUnit ? ` (${yUnit})` : ""} — reading 1`,
      `${yLabel}${yUnit ? ` (${yUnit})` : ""} — reading 2`,
      `${yLabel}${yUnit ? ` (${yUnit})` : ""} — reading 3`,
      `Mean ${yLabel}${yUnit ? ` (${yUnit})` : ""}`,
    ];

    // Helper: split text into lines that fit within maxW
    const wrapText = (ctx, text, maxW) => {
      const words = text.split(" ");
      const lines = [];
      let line = "";
      for (const word of words) {
        const test = line ? line + " " + word : word;
        if (ctx.measureText(test).width > maxW && line) {
          lines.push(line);
          line = word;
        } else {
          line = test;
        }
      }
      if (line) lines.push(line);
      return lines.length ? lines : [text];
    };

    const totalW = colW * cols.length;
    const totalH_approx = 80 + rowH * rows_data.length + 20;

    // Create canvas
    const tc = document.createElement("canvas");
    tc.width = totalW * dpr;
    tc.height = totalH_approx * dpr;
    const tx = tc.getContext("2d");
    tx.scale(dpr, dpr);

    // Measure actual header height using wrap
    tx.font = `bold ${FONT_HDR}px 'Courier New', monospace`;
    let maxLines = 1;
    cols.forEach(c => {
      const lines = wrapText(tx, c, colW - pad * 2);
      if (lines.length > maxLines) maxLines = lines.length;
    });
    const headerH = maxLines * (FONT_HDR + 6) + pad * 2;
    const totalH = headerH + rowH * rows_data.length + 4;

    // Resize canvas to actual height
    tc.width = totalW * dpr;
    tc.height = totalH * dpr;
    tx.scale(dpr, dpr);

    // Background
    tx.fillStyle = "#fafef8";
    tx.fillRect(0, 0, totalW, totalH);

    // Header background
    tx.fillStyle = G.dark;
    tx.fillRect(0, 0, totalW, headerH);

    // Mean col header slightly different shade
    tx.fillStyle = G.mid;
    tx.fillRect(4 * colW, 0, colW, headerH);

    // Header text (wrapped)
    tx.fillStyle = "#ffffff";
    tx.font = `bold ${FONT_HDR}px 'Courier New', monospace`;
    tx.textBaseline = "middle";
    const lineH = FONT_HDR + 6;
    cols.forEach((c, i) => {
      const lines = wrapText(tx, c, colW - pad * 2);
      const totalTextH = lines.length * lineH;
      const startY = (headerH - totalTextH) / 2 + lineH / 2;
      lines.forEach((line, li) => {
        tx.textAlign = "center";
        tx.fillText(line, i * colW + colW / 2, startY + li * lineH);
      });
    });

    // Header dividers
    tx.strokeStyle = "rgba(255,255,255,0.3)"; tx.lineWidth = 1;
    cols.forEach((_, i) => {
      if (i === 0) return;
      tx.beginPath(); tx.moveTo(i * colW, 0); tx.lineTo(i * colW, headerH); tx.stroke();
    });

    // Data rows
    tx.font = `${FONT_BODY}px 'Courier New', monospace`;
    rows_data.forEach((row, ri) => {
      const m = mean(row.r1, row.r2, row.r3);
      const vals = [row.x, row.r1, row.r2, row.r3, m !== "" ? m : "—"];
      const y = headerH + ri * rowH;

      // Row background
      tx.fillStyle = ri % 2 === 0 ? "#edf7ef" : "#ffffff";
      tx.fillRect(0, y, totalW, rowH);
      // Mean col background
      tx.fillStyle = m !== "" ? "#d4edda" : "#f5f5f5";
      tx.fillRect(4 * colW, y, colW, rowH);

      vals.forEach((v, ci) => {
        tx.fillStyle = ci === 4 ? (m !== "" ? G.meanTxt : "#bbb") : G.dark;
        tx.font = ci === 4
          ? `bold ${FONT_BODY}px 'Courier New', monospace`
          : `${FONT_BODY}px 'Courier New', monospace`;
        tx.textAlign = "center";
        tx.textBaseline = "middle";
        tx.fillText(String(v !== "" ? v : ""), ci * colW + colW / 2, y + rowH / 2);
      });

      // Row bottom rule
      tx.strokeStyle = "#b8d4b8"; tx.lineWidth = 1;
      tx.beginPath(); tx.moveTo(0, y + rowH); tx.lineTo(totalW, y + rowH); tx.stroke();
    });

    // Vertical dividers (x col right, mean col left)
    tx.strokeStyle = G.dark; tx.lineWidth = 2;
    tx.beginPath(); tx.moveTo(colW, headerH); tx.lineTo(colW, totalH); tx.stroke();
    tx.beginPath(); tx.moveTo(4 * colW, headerH); tx.lineTo(4 * colW, totalH); tx.stroke();

    // Outer border
    tx.strokeStyle = G.dark; tx.lineWidth = 2;
    tx.strokeRect(1, 1, totalW - 2, totalH - 2);

    // Header bottom double line
    tx.strokeStyle = G.dark; tx.lineWidth = 1;
    tx.beginPath(); tx.moveTo(0, headerH - 3); tx.lineTo(totalW, headerH - 3); tx.stroke();
    tx.beginPath(); tx.moveTo(0, headerH); tx.lineTo(totalW, headerH); tx.stroke();

    const link = document.createElement("a");
    link.download = `${graphTitle.replace(/\s+/g, "_") || "results"}_table.png`;
    link.href = tc.toDataURL("image/png");
    link.click();
  };

  const roundTo2dp = (val, setter, rowId, field) => {
    const n = parseFloat(val);
    if (!isNaN(n)) {
      const rounded = Math.round(n * 100) / 100;
      updateRow(rowId, field, String(rounded));
    }
  };

  const lobfSlope = showLobf && lobfPoints.length === 2
    ? ((lobfPoints[1].y - lobfPoints[0].y) / (lobfPoints[1].x - lobfPoints[0].x)).toFixed(4)
    : null;

  const yColHeader = (n) => `${yLabel || "y"}${yUnit ? ` (${yUnit})` : ""} — reading ${n}`;
  const meanColHeader = () => `Mean ${yLabel || "y"}${yUnit ? ` (${yUnit})` : ""}`;

  const sInput = {
    padding: "6px 9px", border: `1.5px solid ${G.light}`, borderRadius: "5px",
    fontFamily: MONO, fontSize: isMobile ? "13px" : "14px", background: G.paper, color: G.dark,
    width: isMobile ? "100%" : "82px", textAlign: "center", boxSizing: "border-box",
  };

  return (
    <div style={{ fontFamily: FONT, background: "#edf7ef", minHeight: "100vh", padding: isMobile ? "8px" : "14px 16px" }}>

      {/* Header */}
      <div style={{
        background: "#ffffff",
        backgroundImage: "repeating-linear-gradient(transparent, transparent 31px, #b0c4b0 31px, #b0c4b0 32px)",
        borderRadius: "6px", padding: isMobile ? "12px 14px" : "18px 24px", marginBottom: "10px",
        display: "flex", alignItems: "center", gap: "16px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
        borderLeft: "6px solid #c0392b",
        position: "relative", overflow: "hidden",
      }}>
        <svg width="52" height="52" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0, display: isMobile ? "none" : "block" }}>
          {/* Graph paper background */}
          <rect width="52" height="52" rx="4" fill="#f0f8ff"/>
          {/* Fine grid */}
          {[10,20,30,40].map(v => (
            <g key={v}>
              <line x1={v} y1="4" x2={v} y2="48" stroke="#c8dff5" strokeWidth="0.5"/>
              <line x1="4" y1={v} x2="48" y2={v} stroke="#c8dff5" strokeWidth="0.5"/>
            </g>
          ))}
          {/* Axes */}
          <line x1="8" y1="6" x2="8" y2="44" stroke="#1a3d1f" strokeWidth="2"/>
          <line x1="8" y1="44" x2="48" y2="44" stroke="#1a3d1f" strokeWidth="2"/>
          {/* Plotted data points as crosses */}
          {[[14,36],[22,28],[30,20],[38,13]].map(([x,y]) => (
            <g key={x}>
              <line x1={x-3} y1={y} x2={x+3} y2={y} stroke="#1a3d1f" strokeWidth="1.5"/>
              <line x1={x} y1={y-3} x2={x} y2={y+3} stroke="#1a3d1f" strokeWidth="1.5"/>
            </g>
          ))}
          {/* Line of best fit */}
          <line x1="10" y1="40" x2="44" y2="10" stroke="#c0392b" strokeWidth="1.8"/>
        </svg>
        <div style={{ borderLeft: "2px solid rgba(0,0,0,0.1)", paddingLeft: "20px" }}>
          <div style={{ color: "#111", fontSize: isMobile ? "20px" : "34px", fontWeight: "bold", fontFamily: MONO, letterSpacing: "-0.5px", lineHeight: 1.2 }}>School Science Graph Plotter</div>
        </div>
      </div>

      {/* Variable setup */}
      <div style={{
        background: "#fff", borderRadius: "8px", padding: "10px 12px", marginBottom: "10px",
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr 1fr" : "auto auto auto auto auto",
        gap: isMobile ? "8px" : "10px",
        alignItems: "flex-end",
        boxShadow: "0 1px 6px rgba(0,0,0,0.07)",
      }}>
        <Field label="Graph title" style={isMobile ? { gridColumn: "1 / -1" } : {}}>
          <input value={graphTitle} onChange={e => setGraphTitle(e.target.value)}
            style={{ ...sInput, width: isMobile ? "100%" : "180px", textAlign: "left" }} />
        </Field>
        <Field label="X-axis variable">
          <input value={xLabel} onChange={e => setXLabel(e.target.value)}
            style={{ ...sInput, width: isMobile ? "100%" : "150px", textAlign: "left" }} placeholder="e.g. Temperature" />
        </Field>
        <Field label="X unit">
          <input value={xUnit} onChange={e => setXUnit(e.target.value)}
            style={sInput} placeholder="e.g. °C" />
        </Field>
        <Field label="Y-axis variable">
          <input value={yLabel} onChange={e => setYLabel(e.target.value)}
            style={{ ...sInput, width: isMobile ? "100%" : "150px", textAlign: "left" }} placeholder="e.g. Rate" />
        </Field>
        <Field label="Y unit">
          <input value={yUnit} onChange={e => setYUnit(e.target.value)}
            style={sInput} placeholder="e.g. cm³/s" />
        </Field>
      </div>

      {/* Data table */}
      <div style={{
        background: "#fafef8", borderRadius: "8px", padding: isMobile ? "8px" : "10px 14px", marginBottom: "10px",
        boxShadow: "0 1px 6px rgba(0,0,0,0.07)", overflowX: "auto",
        fontFamily: MONO,
        WebkitOverflowScrolling: "touch",
      }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: MONO, fontSize: isMobile ? "12px" : "15px", background: "#fafef8" }}>
          <thead>
            <tr style={{ background: "transparent" }}>
              <th style={thX}>{xLabel || "x"}{xUnit ? ` (${xUnit})` : ""}</th>
              <th style={thMid}>{yColHeader(1)}</th>
              <th style={thMid}>{yColHeader(2)}</th>
              <th style={thMid}>{yColHeader(3)}</th>
              <th style={thMean}>{meanColHeader()}</th>
              <th style={{ ...thMid, width: "30px", borderBottom: "2px solid #1a3d1f" }}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const m = mean(row.r1, row.r2, row.r3);
              return (
                <tr key={row.id} style={{ background: "transparent" }}>
                  <td style={tdX}>
                    <input value={row.x} type="number"
                      onChange={e => updateRow(row.id, "x", e.target.value)}
                      onBlur={e => roundTo2dp(e.target.value, null, row.id, "x")}
                      style={cellS} />
                  </td>
                  {["r1","r2","r3"].map(f => (
                    <td key={f} style={tdMid}>
                      <input value={row[f]} type="number"
                        onChange={e => updateRow(row.id, f, e.target.value)}
                        onBlur={e => roundTo2dp(e.target.value, null, row.id, f)}
                        style={cellS} />
                    </td>
                  ))}
                  <td style={tdMean}>
                    <span style={{ fontWeight: "bold", color: m !== "" ? G.meanTxt : "#bbb" }}>
                      {m !== "" ? m : "—"}
                    </span>
                  </td>
                  <td style={{ ...tdMid, textAlign: "center" }}>
                    <button onClick={() => removeRow(row.id)}
                      style={{ background:"none", border:"none", cursor:"pointer", color:"#c0392b", fontSize:"14px" }}>✕</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div style={{ marginTop: "8px", display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
          <button onClick={addRow} style={btnS(G.mid)}>+ Add row</button>
          <button
            onClick={handlePlot}
            disabled={pendingData.length === 0}
            style={{ ...btnS(pendingData.length > 0 ? G.dark : "#aaa"),
              opacity: pendingData.length > 0 ? 1 : 0.5, cursor: pendingData.length > 0 ? "pointer" : "not-allowed" }}>
            📈 Plot graph ({pendingData.length} point{pendingData.length !== 1 ? "s" : ""})
          </button>
          {plottedData.length > 0 && pendingData.length !== plottedData.length && (
            <span style={{ fontSize: "11px", color: "#856404", fontFamily: MONO, background: "#fff3cd", padding: "4px 8px", borderRadius: "4px" }}>
              ⚠ Table has changed — click Plot graph to update
            </span>
          )}
        </div>
      </div>

      {/* Graph section */}
      <div style={{
        background: "#fff", borderRadius: "8px", padding: "10px 14px",
        boxShadow: "0 1px 6px rgba(0,0,0,0.07)",
      }}>
        {/* Scale + LOBF controls */}
        <div style={{ display: "flex", gap: "8px", alignItems: "flex-end", flexWrap: "wrap", marginBottom: "8px", flexDirection: isMobile ? "column" : "row" }}>
          <div style={{ display:"flex", gap:"6px", alignItems:"flex-end", background: G.pale, padding:"6px 10px", borderRadius:"6px", width: isMobile ? "100%" : "auto" }}>
            <span style={{ fontSize:"11px", fontFamily: MONO, color: G.dark, alignSelf:"center", fontWeight:"bold" }}>X:</span>
            <Field label="min"><input value={xScaleMin} onChange={e=>setXScaleMin(e.target.value)} style={sInput} type="number" /></Field>
            <Field label="max"><input value={xScaleMax} onChange={e=>setXScaleMax(e.target.value)} style={sInput} type="number" /></Field>
          </div>
          <div style={{ display:"flex", gap:"6px", alignItems:"flex-end", background: G.pale, padding:"6px 10px", borderRadius:"6px", width: isMobile ? "100%" : "auto" }}>
            <span style={{ fontSize:"11px", fontFamily: MONO, color: G.dark, alignSelf:"center", fontWeight:"bold" }}>Y:</span>
            <Field label="min"><input value={yScaleMin} onChange={e=>setYScaleMin(e.target.value)} style={sInput} type="number" /></Field>
            <Field label="max"><input value={yScaleMax} onChange={e=>setYScaleMax(e.target.value)} style={sInput} type="number" /></Field>
          </div>
          <button onClick={autoScale} style={btnS(G.bright)}>⚡ Auto-scale</button>

          <div style={{ marginLeft: isMobile ? "0" : "auto", display:"flex", gap:"8px", alignItems:"center", flexWrap:"wrap" }}>
            {!lobfMode && !showLobf && (
              <button onClick={() => { setLobfPoints([]); setLobfMode(true); }} style={btnS("#8e44ad")}>
                ✏️ Draw best-fit line
              </button>
            )}
            {lobfMode && lobfPoints.length < 2 && (
              <span style={{ fontSize:"12px", color:"#6c3483", fontFamily: MONO, background:"#f5e6ff", padding:"5px 10px", borderRadius:"5px" }}>
                Click {2-lobfPoints.length} point{lobfPoints.length===1?"":"s"} on graph
              </span>
            )}
            {lobfMode && lobfPoints.length === 2 && (
              <button onClick={commitLobf} style={btnS("#27ae60")}>✓ Confirm line</button>
            )}
            {(lobfMode || showLobf) && (
              <button onClick={clearLobf} style={btnS("#c0392b")}>✕ Remove</button>
            )}
            {showLobf && lobfSlope && (
              <span style={{ fontSize:"12px", color:"#922b21", fontFamily: MONO, background:"#fadbd8", padding:"5px 10px", borderRadius:"5px" }}>
                Gradient = {lobfSlope}{xUnit && yUnit ? ` ${yUnit}/${xUnit}` : ""}
              </span>
            )}
          </div>
        </div>

        {/* Canvas */}
        <div ref={wrapperRef} style={{
          border: `2px solid ${G.dark}`, borderRadius: "3px", overflow: "hidden",
          cursor: lobfMode ? "crosshair" : "default",
          boxShadow: "3px 3px 12px rgba(0,0,0,0.12)",
          width: "100%",
        }}>
          <canvas ref={canvasRef}
            onClick={handleCanvasClick}
            onMouseMove={handleCanvasMouseMove}
            onMouseLeave={() => setHoveredPoint(null)}
            onTouchStart={handleCanvasTouch}
            style={{ display:"block", touchAction: lobfMode ? "none" : "auto" }}
          />
        </div>
        <div style={{ marginTop:"6px", fontSize: isMobile ? "10px" : "11px", color:"#777", fontFamily: MONO }}>
          💡 {isMobile ? 'Tap a point to see its value. Use "Draw best-fit line" then tap two positions.' : 'Hover over a point to see its value. Use "Draw best-fit line" then click two positions.'}
        </div>
        <div style={{ marginTop:"10px", display:"flex", gap:"8px", flexWrap:"wrap" }}>
          <button onClick={downloadGraph} style={btnS(G.dark)}>⬇ Download graph (PNG)</button>
          <button onClick={downloadTable} style={btnS(G.mid)}>⬇ Download results table (PNG)</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children, style }) {
  return (
    <div style={style}>
      <label style={{ display:"block", fontSize:"10px", fontFamily:"'Courier New',monospace",
        color:"#555", marginBottom:"2px", textTransform:"uppercase", letterSpacing:"0.4px" }}>
        {label}
      </label>
      {children}
	<Analytics />
    </div>
  );
}

// Exercise-book table styles
// Header cells
const thBase = { padding:"8px 8px", textAlign:"center", fontFamily:"'Courier New',monospace", fontSize:"inherit", fontWeight:"bold", letterSpacing:"0.3px", color:"#1a3d1f", background:"transparent" };
const thX    = { ...thBase, borderBottom:"3px double #1a3d1f", borderRight:"2px solid #1a3d1f" };
const thMid  = { ...thBase, borderBottom:"3px double #1a3d1f" };
const thMean = { ...thBase, borderBottom:"3px double #1a3d1f", borderLeft:"2px solid #1a3d1f" };
// Body cells
const tdBase = { padding:"4px 5px", borderBottom:"1px solid #b8d4b8" };
const tdX    = { ...tdBase, borderRight:"2px solid #1a3d1f" };
const tdMid  = { ...tdBase };
const tdMean = { ...tdBase, borderLeft:"2px solid #1a3d1f", textAlign:"center" };
const cellS = { width:"100%", padding:"5px 4px", border:"none", fontFamily:"'Courier New',monospace", fontSize:"inherit", textAlign:"center", background:"transparent", boxSizing:"border-box", outline:"none" };
function btnS(bg) { return { padding:"8px 18px", background:bg, color:"#fff", border:"none", borderRadius:"6px", fontFamily:"'Courier New',monospace", fontSize:"14px", cursor:"pointer", boxShadow:"0 2px 5px rgba(0,0,0,0.14)", whiteSpace:"nowrap" }; }