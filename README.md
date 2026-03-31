# School Science Graph Plotter

A web-based graph plotting tool designed for KS3 and GCSE science students in England (ages 11–16). Students can record experimental data with repeat readings, calculate means automatically, set axis scales, plot graphs on traditional blue millimetre-square graph paper, and draw lines of best fit. Results tables and graphs can be downloaded as PNG image files.

---

## Table of Contents

1. [Features](#features)
2. [How the App Works](#how-the-app-works)
   - [Variable Setup](#variable-setup)
   - [Data Table](#data-table)
   - [Graph Section](#graph-section)
   - [Line of Best Fit](#line-of-best-fit)
   - [Downloading Results](#downloading-results)
3. [Technology Stack](#technology-stack)
4. [Project Structure](#project-structure)
5. [Running Locally](#running-locally)
6. [Deploying to Vercel](#deploying-to-vercel)
7. [Making Changes and Redeploying](#making-changes-and-redeploying)
8. [Known Limitations](#known-limitations)

---

## Features

- **Results table** with three repeat readings per measurement and automatic mean calculation
- **Variable and unit labelling** — column headings update live as you type variable names and units
- **Exercise-book style table** — hand-ruled appearance with double underline on headers, ruled horizontal lines, and vertical dividers on the independent variable and mean columns only
- **Blue millimetre-square graph paper** — three-tier grid: fine 1mm lines, medium 5mm lines, bold 1cm lines, matching traditional school graph paper
- **Responsive canvas** — graph fills the available browser width and redraws at full resolution on window resize
- **HiDPI / Retina rendering** — canvas uses `devicePixelRatio` for sharp output on all screens
- **Smart axis scaling** — auto-scale computes clean "nice" intervals and always leaves a gap between data points and the axes
- **Manual axis scale** — min and max for both axes can be set directly above the graph
- **Plot on demand** — data is only sent to the graph when you click the Plot button; a warning appears if the table has changed since the last plot
- **Data point crosses** — plotted using the standard school science convention (×)
- **Hover tooltips** — hover over any plotted point to see its x and y values; tooltip repositions automatically to avoid edge clipping
- **Line of best fit** — drawn manually by clicking two points on the graph; gradient is calculated and displayed with units
- **Download graph** — saves the canvas as a PNG image
- **Download results table** — renders the data table to a canvas and saves as a PNG image
- **No spinner arrows** on number inputs — students must type values directly
- **2 decimal place rounding** — values are rounded to 2dp when you leave a cell

---

## How the App Works

### Variable Setup

At the top of the page, below the header, is a row of input fields:

| Field | Purpose |
|---|---|
| Graph title | Appears as the title on the plotted graph |
| X-axis variable | Name of the independent variable (e.g. Temperature) |
| X unit | Unit for the x-axis (e.g. °C) |
| Y-axis variable | Name of the dependent variable (e.g. Rate of reaction) |
| Y unit | Unit for the y-axis (e.g. cm³/s) |

The variable names and units update the table column headings and graph axis labels live as you type.

---

### Data Table

The data table sits below the variable setup row. It has a hand-drawn exercise-book appearance: plain white background, ruled horizontal lines under each row, a double underline beneath the header row, and solid vertical lines only on the right edge of the independent variable column and the left edge of the mean column.

**Columns:**

1. **Independent variable (x)** — the value you control in the experiment
2. **Reading 1, Reading 2, Reading 3** — three repeat measurements of the dependent variable
3. **Mean** — calculated automatically from whichever readings have been filled in; highlighted in green when a value is present
4. **Delete** (×) — removes that row

**Entering data:**

- Click any cell and type a number. Spinner arrows have been removed so values must be typed.
- When you click away from a cell, the value is rounded to 2 decimal places automatically.
- Only cells with valid numbers contribute to the mean. You can leave repeat readings blank if fewer than three were taken.

**Adding and removing rows:**

- Click **+ Add row** to add a new blank row at the bottom.
- Click the **×** button at the end of any row to delete it.

---

### Graph Section

Below the data table is the graph section, which contains scale controls, the graph canvas, and action buttons.

**Axis scale controls:**

The X and Y minimum and maximum values are shown in compact input boxes directly above the graph. You can either:

- Type values directly into the min/max boxes to set a custom scale, or
- Click **⚡ Auto-scale** to have the app calculate clean axis limits from your data automatically. Auto-scale always leaves a gap between the first/last data point and the axis edges.

If you leave the scale fields empty, the graph uses auto-scaling automatically when you plot.

**Plotting:**

Click the **📈 Plot graph (n points)** button in the table footer to send the current table data to the graph. The button shows how many valid data points are ready and is greyed out if there is nothing to plot.

The graph is **not** updated automatically as you type — you must click Plot each time you want to refresh it. If you edit the table after plotting, a yellow warning banner appears reminding you to re-plot.

**The graph canvas:**

- Renders on blue millimetre-square graph paper with three grid layers (1mm, 5mm, 1cm)
- The canvas fills the full width of its container and resizes with the browser window
- Data points are plotted as crosses (×) in the standard school science convention
- Axes are labelled with the variable names and units from the setup row
- The graph title appears centred at the top

**Hovering over points:**

Move the mouse over any plotted data point to see a tooltip showing its exact x and y values. The tooltip repositions automatically — flipping to the left or upward — if the point is near the edge of the graph.

---

### Line of Best Fit

1. Click **✏️ Draw best-fit line**. The cursor changes to a crosshair.
2. Click two positions on the graph to define the line. Small red circles appear at each position.
3. Click **✓ Confirm line** to draw the final line of best fit, which extends across the full width of the graph in red.
4. The gradient is calculated from your two points and displayed with units (y-unit / x-unit).
5. Click **✕ Remove** at any time to clear the line.

> **Note:** The line of best fit is cleared automatically when you re-plot the graph with new data.

---

### Downloading Results

Two download buttons appear below the graph:

**⬇ Download graph (PNG)**
Saves the graph canvas exactly as rendered — including the title, grid, data points, and line of best fit if drawn — as a PNG file. On HiDPI / Retina screens the downloaded image is at full resolution.

**⬇ Download results table (PNG)**
Renders the data table programmatically onto a separate canvas and saves it as a PNG file. The image includes all rows that have at least one value entered, uses the same column headings as the on-screen table (with variable names and units), and applies the green exercise-book colour scheme. The filename is derived from the graph title.

---

## Technology Stack

| Technology | Role |
|---|---|
| **React 18** | UI framework — all state, rendering and event handling |
| **Vite** | Build tool and local development server |
| **HTML5 Canvas API** | Graph rendering (grid, axes, data points, LOBF, tooltips) |
| **ResizeObserver API** | Detects container width changes and triggers canvas redraws |
| **CSS-in-JS (inline styles)** | All styling is written as inline React style objects — no external CSS files |
| **Vercel** | Hosting and deployment via GitHub integration |

There are no external runtime dependencies beyond React itself. No charting library is used — the entire graph is drawn directly onto a Canvas element.

---

## Project Structure

After setting up with Vite, the relevant files are:

```
science-grapher/
├── src/
│   ├── App.jsx          ← The entire application (single file)
│   └── main.jsx         ← React entry point
├── index.html           ← HTML shell
├── package.json         ← Project metadata and scripts
├── vite.config.js       ← Vite configuration (default)
└── README.md            ← This file
```

The entire application lives in `src/App.jsx`. There are no separate component files, CSS files, or utility modules.

---

## Running Locally

### Prerequisites

- **Node.js** (version 18 or later) — download from [nodejs.org](https://nodejs.org)
- **Git** — download from [git-scm.com](https://git-scm.com)

### Steps

**1. Create a new Vite React project:**

```bash
npm create vite@latest science-grapher -- --template react
cd science-grapher
npm install
```

**2. Replace the default App component:**

- Open `src/App.jsx` and replace its entire contents with the code from `science_grapher.jsx`
- Open `src/main.jsx` and delete the line `import './index.css'`
- Delete `src/App.css` and `src/index.css` (they are not needed)

**3. Start the development server:**

```bash
npm run dev
```

Open the URL shown in the terminal (usually `http://localhost:5173`) to view the app.

**4. Build for production (optional check):**

```bash
npm run build
```

This creates a `dist/` folder containing the optimised static files that Vercel will serve.

---

## Deploying to Vercel

### One-time setup

**Step 1 — Create a GitHub repository**

- Sign in to [github.com](https://github.com)
- Click **+** → **New repository**
- Name it `science-grapher`, leave it public, and click **Create repository**

**Step 2 — Push your code to GitHub**

In your terminal, inside the project folder:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/science-grapher.git
git push -u origin main
```

Replace `YOUR-USERNAME` with your actual GitHub username.

> If `git push` fails with an authentication error, install the GitHub CLI (`gh`) from [cli.github.com](https://cli.github.com) and run `gh auth login` to authenticate, then retry.

**Step 3 — Connect to Vercel**

- Go to [vercel.com](https://vercel.com) and sign up using your GitHub account
- Click **Add New → Project**
- Select your `science-grapher` repository and click **Import**
- Vercel auto-detects the Vite framework — leave all settings as default
- Click **Deploy**

Vercel will build and deploy the app in around 30 seconds and provide a public URL such as `https://science-grapher.vercel.app`.

---

## Making Changes and Redeploying

After the initial deployment, updating the live app is straightforward:

1. Edit `src/App.jsx` locally
2. Test your changes with `npm run dev`
3. Commit and push to GitHub:

```bash
git add .
git commit -m "Description of your changes"
git push
```

Vercel detects the new commit automatically and redeploys within about 30 seconds. No action is needed on the Vercel website.

---

## Known Limitations

- **No data persistence** — data entered in the table is held in React state only and is lost if the page is refreshed. There is no save/load functionality.
- **Single session** — the app is designed for use within a single sitting. Students should download their graph and table before closing the browser.
- **No negative axes** — the auto-scale will produce negative axis minimums if data starts at zero (to leave a gap from the origin). If this is undesirable, set the axis minimum manually to 0.
- **Line of best fit is manual** — the line is positioned by the user clicking two points rather than being calculated by linear regression. This is intentional — drawing a line of best fit by judgement is a required skill at GCSE.
- **Single graph per session** — the app plots one dataset at a time. Multiple data series on one graph are not supported.
- **Download requires a modern browser** — the PNG download uses `canvas.toDataURL()` and programmatic anchor clicks, which work in all current browsers but may not work in very old versions of Internet Explorer.
