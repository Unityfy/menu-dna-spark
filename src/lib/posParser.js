/**
 * Menu DNA — POS File Parser
 * Handles Petpooja and generic POS exports in CSV and PDF formats.
 *
 * Petpooja CSV headers (Item Sales Report):
 *   "Item Name", "Category", "Quantity", "Rate", "Gross Amount", "Discount", "Net Amount"
 *
 * Petpooja PDF exports the same tabular data as rendered text blocks.
 */

import * as pdfjsLib from 'pdfjs-dist';

// ── PDF.js worker setup ──────────────────────────────────────────────────────
// Use the bundled worker via CDN to avoid Vite worker config complexity
pdfjsLib.GlobalWorkerOptions.workerSrc =
  `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

// ── Petpooja-specific column aliases ────────────────────────────────────────
// Maps Petpooja export headers → internal field names
const PETPOOJA_ALIASES = {
  // Dish name
  'item name':   'name',
  'item':        'name',
  'dish name':   'name',
  'dish':        'name',
  'product name':'name',
  'product':     'name',
  'menu item':   'name',

  // Category
  'category':    'category',
  'item category':'category',
  'group':       'category',
  'item group':  'category',
  'section':     'category',

  // Quantity sold
  'quantity':    'units_sold',
  'qty':         'units_sold',
  'qty sold':    'units_sold',
  'quantity sold':'units_sold',
  'sold qty':    'units_sold',
  'count':       'units_sold',
  'no of plates':'units_sold',
  'plates':      'units_sold',

  // Selling price / rate
  'rate':        'price',
  'price':       'price',
  'selling price':'price',
  'sell price':  'price',
  'mrp':         'price',
  'unit price':  'price',
  'item rate':   'price',

  // Food cost
  'cost':        'cost',
  'food cost':   'cost',
  'cogs':        'cost',
  'cost price':  'cost',
  'ingredient cost':'cost',
  'recipe cost': 'cost',
  'item cost':   'cost',

  // Revenue (used to derive price when rate is missing)
  'gross amount':    'gross_amount',
  'net amount':      'net_amount',
  'total amount':    'gross_amount',
  'amount':          'gross_amount',
  'gross sales':     'gross_amount',
  'net sales':       'net_amount',
  'revenue':         'gross_amount',
  'total revenue':   'gross_amount',

  // Discount
  'discount':    'discount',
  'disc':        'discount',

  // Prep time
  'prep time':   'prep_time',
  'prep time (minutes)':'prep_time',
  'prep time minutes':  'prep_time',
  'preparation time':   'prep_time',
  'kitchen time':'prep_time',
};

function resolveKey(rawKey) {
  const k = rawKey.trim().toLowerCase().replace(/\s+/g, ' ');
  return PETPOOJA_ALIASES[k] || null;
}

// ── CSV Row Normalizer ───────────────────────────────────────────────────────

export function normalizeRow(rawRow) {
  const mapped = {};

  // Map all columns through alias table
  for (const [key, val] of Object.entries(rawRow)) {
    const resolved = resolveKey(key);
    if (resolved && val !== '' && val !== undefined) {
      // Don't overwrite if already set (first match wins)
      if (!mapped[resolved]) mapped[resolved] = val;
    }
  }

  // Derive price from gross_amount / units_sold if price is missing
  if (!mapped.price && mapped.gross_amount && mapped.units_sold) {
    const qty = parseFloat(mapped.units_sold);
    const gross = parseFloat(mapped.gross_amount);
    if (qty > 0) mapped.price = (gross / qty).toFixed(2);
  }

  // Net amount fallback
  if (!mapped.price && mapped.net_amount && mapped.units_sold) {
    const qty = parseFloat(mapped.units_sold);
    const net = parseFloat(mapped.net_amount);
    if (qty > 0) mapped.price = (net / qty).toFixed(2);
  }

  const name      = (mapped.name || '').trim();
  const category  = (mapped.category || 'Uncategorized').trim();
  const price     = parseFloat(mapped.price   || 0);
  const cost      = parseFloat(mapped.cost    || 0);
  const unitsSold = parseInt(mapped.units_sold || 0, 10);
  const prepTime  = parseInt(mapped.prep_time || 0, 10);

  if (!name || isNaN(price) || isNaN(unitsSold)) return null;
  if (price <= 0 && unitsSold <= 0) return null;

  // Skip summary / total rows
  const lower = name.toLowerCase();
  if (['total', 'grand total', 'subtotal', 'sub total', 'net total', 'summary'].includes(lower)) return null;

  return { name, category, price, cost, unitsSold, prepTime };
}

// ── CSV Parser ───────────────────────────────────────────────────────────────

export async function parseCSV(file) {
  return new Promise((resolve, reject) => {
    const Papa = window.__Papa;
    if (!Papa) return reject(new Error('PapaParse not available'));

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: h => h.trim(), // Keep original header for alias lookup
      complete: ({ data, meta }) => {
        const normalized = data.map(normalizeRow).filter(Boolean);
        if (!normalized.length) {
          reject(new Error('No recognizable dish data found. Check column headers.'));
          return;
        }
        resolve({
          fileType: 'csv',
          rawHeaders: meta.fields,
          rawRows: data,
          normalized,
        });
      },
      error: (err) => reject(new Error(`CSV parse error: ${err.message}`)),
    });
  });
}

// ── PDF Parser ───────────────────────────────────────────────────────────────

/**
 * Extracts text from PDF using PDF.js, then reconstructs the tabular structure
 * by grouping text items by their Y-coordinate (row) and sorting by X (column).
 */
export async function parsePDF(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  // Collect all text items with positions across all pages
  const allItems = [];
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page    = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    for (const item of content.items) {
      if (item.str.trim()) {
        allItems.push({
          text: item.str.trim(),
          x:    Math.round(item.transform[4]),
          y:    Math.round(item.transform[5]),
          page: pageNum,
        });
      }
    }
  }

  if (!allItems.length) throw new Error('No text found in PDF.');

  // ── Reconstruct rows by grouping items with same Y (±4px tolerance) ──
  const rows = groupIntoRows(allItems);

  // ── Find header row (contains recognizable column names) ──────────────
  let headerRowIdx = -1;
  let columnMap    = null; // { colIndex: internalFieldName }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const cm  = buildColumnMap(row);
    if (cm && Object.keys(cm).length >= 2) {
      headerRowIdx = i;
      columnMap    = cm;
      break;
    }
  }

  if (headerRowIdx === -1 || !columnMap) {
    throw new Error(
      'Could not detect column headers in PDF. Ensure it is a Petpooja Item Sales Report.'
    );
  }

  // ── Parse data rows below the header ─────────────────────────────────
  const normalized = [];
  const rawRows    = [];

  for (let i = headerRowIdx + 1; i < rows.length; i++) {
    const cells = rows[i];
    const raw   = {};

    for (const [colIdx, fieldName] of Object.entries(columnMap)) {
      raw[fieldName] = cells[parseInt(colIdx)]?.text || '';
    }

    rawRows.push(raw);
    const dish = normalizeRow(raw);
    if (dish) normalized.push(dish);
  }

  if (!normalized.length) {
    throw new Error('PDF parsed but no valid dish rows extracted. Check report type.');
  }

  return {
    fileType:   'pdf',
    rawHeaders: Object.values(columnMap),
    rawRows,
    normalized,
    pageCount:  pdf.numPages,
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function groupIntoRows(items, tolerance = 4) {
  // Sort by page then Y (descending, PDF Y is from bottom), then X
  const sorted = [...items].sort((a, b) =>
    a.page !== b.page ? a.page - b.page :
    b.y     !== a.y   ? b.y - a.y :
    a.x - b.x
  );

  const rows   = [];
  let   curRow = [];
  let   curY   = null;
  let   curPg  = null;

  for (const item of sorted) {
    if (curY === null || item.page !== curPg || Math.abs(item.y - curY) > tolerance) {
      if (curRow.length) rows.push(curRow);
      curRow = [item];
      curY   = item.y;
      curPg  = item.page;
    } else {
      curRow.push(item);
    }
  }
  if (curRow.length) rows.push(curRow);

  return rows;
}

function buildColumnMap(rowItems) {
  // Try to map each cell in this row to a known field name
  const map = {};
  let hits  = 0;

  rowItems.forEach((item, idx) => {
    const field = resolveKey(item.text);
    if (field) {
      map[idx] = field;
      hits++;
    }
  });

  return hits >= 2 ? map : null;
}

// ── Unified entry point ──────────────────────────────────────────────────────

export async function parseFile(file, PapaParseRef) {
  // Attach PapaParse globally so CSV parser can access it
  window.__Papa = PapaParseRef;

  const ext = file.name.split('.').pop().toLowerCase();

  if (ext === 'csv') return parseCSV(file);
  if (ext === 'pdf') return parsePDF(file);

  throw new Error(`Unsupported file type ".${ext}". Please upload a CSV or PDF.`);
}

// ── Petpooja sample CSV data ─────────────────────────────────────────────────
export const PETPOOJA_SAMPLE_CSV = `Item Name,Category,Quantity,Rate,Gross Amount,Discount,Net Amount
Grilled Chicken,Mains,220,480,105600,0,105600
Paneer Tikka,Starters,180,320,57600,2880,54720
Dal Makhani,Mains,310,260,80600,0,80600
Butter Naan,Breads,520,60,31200,0,31200
Caesar Salad,Salads,45,280,12600,630,11970
Lamb Rogan Josh,Mains,95,620,58900,0,58900
Mango Lassi,Beverages,280,140,39200,0,39200
Fish Amritsari,Starters,70,380,26600,1330,25270
Veg Biryani,Rice,165,340,56100,0,56100
Chocolate Lava Cake,Desserts,125,220,27500,0,27500
Mushroom Risotto,Mains,35,440,15400,0,15400
Club Sandwich,Snacks,90,260,23400,0,23400
Masala Chai,Beverages,400,80,32000,0,32000
Prawn Masala,Mains,60,560,33600,1680,31920
Mixed Veg Handi,Mains,140,280,39200,0,39200
`;
