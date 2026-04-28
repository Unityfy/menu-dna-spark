import { useMemo, useRef, useState } from "react";
import {
  Package,
  Layers,
  AlertTriangle,
  X,
  ChevronRight,
  ChevronDown,
  Download,
  Upload,
  Pencil,
  Check,
  Plug,
  RefreshCw,
} from "lucide-react";
import { OnboardingData, MenuItemEntry, MOCK_MENU_ITEMS } from "./types";

interface Props {
  data: OnboardingData;
  onChange: (updates: Partial<OnboardingData>) => void;
}

const inputClass =
  "w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-colors";

const CSV_TEMPLATE =
  "name,category,selling_price,variant,is_combo\n" +
  "Butter Chicken,Mains,380,Full,false\n" +
  "Butter Chicken,Mains,260,Half,false\n" +
  "Paneer Tikka,Starters,280,,false\n" +
  "Thali Combo,Mains,450,,true\n";

const parseCsv = (text: string): MenuItemEntry[] => {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const idx = (k: string) => headers.indexOf(k);
  const seen = new Map<string, number>();
  return lines.slice(1).map((line, i) => {
    const cols = line.split(",").map((c) => c.trim());
    const name = cols[idx("name")] || `Item ${i + 1}`;
    const key = name.toLowerCase();
    const dupCount = (seen.get(key) ?? 0) + 1;
    seen.set(key, dupCount);
    return {
      id: `csv-${i}-${Date.now()}`,
      name,
      category: cols[idx("category")] || "Uncategorized",
      sellingPrice: Number(cols[idx("selling_price")]) || 0,
      variant: idx("variant") >= 0 ? cols[idx("variant")] || undefined : undefined,
      isCombo: (cols[idx("is_combo")] || "").toLowerCase() === "true",
      isDuplicate: dupCount > 1,
    };
  });
};

const StepMenuImport = ({ data, onChange }: Props) => {
  const [mode, setMode] = useState<"pos" | "csv">(data.dataSource === "csv" ? "csv" : "pos");
  const [filter, setFilter] = useState<string>("All");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [bulkCategory, setBulkCategory] = useState<string>("");
  const [csvPreview, setCsvPreview] = useState<MenuItemEntry[] | null>(null);
  const [posLoading, setPosLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const items = data.menuItems.length > 0 ? data.menuItems : MOCK_MENU_ITEMS;
  const duplicates = items.filter((i) => i.isDuplicate);
  const combos = items.filter((i) => i.isCombo);

  const grouped = useMemo(() => {
    const map = new Map<string, MenuItemEntry[]>();
    items.forEach((i) => {
      const arr = map.get(i.category) || [];
      arr.push(i);
      map.set(i.category, arr);
    });
    return Array.from(map.entries());
  }, [items]);

  const filteredGroups = filter === "All" ? grouped : grouped.filter(([c]) => c === filter);

  const toggleCat = (cat: string) => {
    const next = new Set(collapsed);
    next.has(cat) ? next.delete(cat) : next.add(cat);
    setCollapsed(next);
  };

  const toggleSelected = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const updateItem = (id: string, patch: Partial<MenuItemEntry>) => {
    const updated = items.map((i) => (i.id === id ? { ...i, ...patch } : i));
    onChange({ menuItems: updated });
  };

  const removeItem = (id: string) => {
    onChange({ menuItems: items.filter((i) => i.id !== id) });
    setSelected((s) => {
      const n = new Set(s);
      n.delete(id);
      return n;
    });
  };

  const bulkAssignCategory = () => {
    if (!bulkCategory || selected.size === 0) return;
    const updated = items.map((i) => (selected.has(i.id) ? { ...i, category: bulkCategory } : i));
    onChange({ menuItems: updated });
    setSelected(new Set());
    setBulkCategory("");
  };

  const bulkMergeDuplicates = () => {
    const seen = new Map<string, MenuItemEntry>();
    const kept: MenuItemEntry[] = [];
    items.forEach((i) => {
      const key = `${i.name.toLowerCase()}|${i.variant ?? ""}`;
      if (selected.has(i.id) && seen.has(key)) return; // skip duplicate
      seen.set(key, i);
      kept.push({ ...i, isDuplicate: false });
    });
    onChange({ menuItems: kept });
    setSelected(new Set());
  };

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "menu-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFile = async (file: File) => {
    const text = await file.text();
    setCsvPreview(parseCsv(text));
  };

  const confirmCsv = () => {
    if (!csvPreview) return;
    const newCats = Array.from(new Set(csvPreview.map((i) => i.category)));
    const mergedCats = Array.from(new Set([...data.categories, ...newCats]));
    onChange({ menuItems: csvPreview, categories: mergedCats });
    setCsvPreview(null);
  };

  const fetchFromPos = async () => {
    setPosLoading(true);
    // Simulated POS fetch — in production this would call the connected POS API
    await new Promise((r) => setTimeout(r, 800));
    onChange({ menuItems: MOCK_MENU_ITEMS });
    setPosLoading(false);
  };

  return (
    <div className="space-y-5">
      <p className="text-xs text-muted-foreground leading-relaxed">
        Confirm your menu structure. We use categories, variants, and combos to make every recommendation accurate.
      </p>

      {/* Mode tabs */}
      <div className="grid grid-cols-2 gap-2">
        <ModeTab active={mode === "pos"} onClick={() => setMode("pos")} icon={<Plug className="h-3.5 w-3.5" />} label="From POS" />
        <ModeTab active={mode === "csv"} onClick={() => setMode("csv")} icon={<Upload className="h-3.5 w-3.5" />} label="From CSV" />
      </div>

      {mode === "pos" && data.menuItems.length === 0 && (
        <div className="rounded-md border border-border bg-secondary/50 p-4 space-y-3">
          <p className="text-xs text-muted-foreground">
            We'll fetch your menu structure from {data.posSystem ? data.posSystem : "your POS"} in read-only mode.
          </p>
          <button
            onClick={fetchFromPos}
            disabled={posLoading}
            className="w-full rounded-md bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${posLoading ? "animate-spin" : ""}`} />
            {posLoading ? "Fetching menu…" : "Fetch menu from POS"}
          </button>
        </div>
      )}

      {mode === "csv" && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <button
              onClick={downloadTemplate}
              className="flex-1 rounded-md border border-border bg-secondary px-3 py-2 text-xs text-secondary-foreground hover:bg-secondary/80 transition-colors inline-flex items-center justify-center gap-2"
            >
              <Download className="h-3.5 w-3.5" /> Download template
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              className="flex-1 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors inline-flex items-center justify-center gap-2"
            >
              <Upload className="h-3.5 w-3.5" /> Upload CSV
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </div>

          {csvPreview && (
            <div className="rounded-md border border-border bg-secondary/30 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs text-foreground font-medium">Preview ({csvPreview.length} items)</p>
                <button onClick={() => setCsvPreview(null)} className="text-xs text-muted-foreground hover:text-foreground">
                  Cancel
                </button>
              </div>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {csvPreview.slice(0, 8).map((i) => (
                  <div key={i.id} className="flex justify-between text-xs">
                    <span className="text-foreground truncate">{i.name}</span>
                    <span className="text-muted-foreground">{i.category} · ₹{i.sellingPrice}</span>
                  </div>
                ))}
                {csvPreview.length > 8 && (
                  <p className="text-xs text-muted-foreground/60 italic">+{csvPreview.length - 8} more…</p>
                )}
              </div>
              <button
                onClick={confirmCsv}
                className="w-full rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background hover:opacity-90 transition-opacity"
              >
                Confirm and import
              </button>
            </div>
          )}
        </div>
      )}

      {/* Summary + tree (shown once items exist) */}
      {items.length > 0 && (
        <>
          <div className="grid grid-cols-3 gap-3">
            <StatCard icon={<Package className="h-4 w-4" />} label="Items" value={items.filter((i) => !i.isDuplicate).length} />
            <StatCard icon={<Layers className="h-4 w-4" />} label="Combos" value={combos.length} />
            <StatCard
              icon={<AlertTriangle className="h-4 w-4 text-warning" />}
              label="Duplicates"
              value={duplicates.length}
              warning={duplicates.length > 0}
            />
          </div>

          {duplicates.length > 0 && (
            <div className="rounded-md border border-warning/30 bg-warning/5 p-3 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-foreground font-medium">{duplicates.length} potential duplicate(s) detected</p>
                <p className="text-xs text-muted-foreground mt-0.5">Select and use Merge duplicates to clean up.</p>
              </div>
            </div>
          )}

          {/* Category filter pills */}
          <div className="flex gap-2 flex-wrap">
            {["All", ...data.categories].map((cat) => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`rounded-full px-3 py-1 text-xs transition-colors ${
                  filter === cat
                    ? "bg-foreground text-background"
                    : "bg-secondary border border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {cat}
                <span className="ml-1 opacity-60">
                  {cat === "All" ? items.length : items.filter((i) => i.category === cat).length}
                </span>
              </button>
            ))}
          </div>

          {/* Bulk action bar */}
          {selected.size > 0 && (
            <div className="rounded-md border border-border bg-card p-2.5 flex flex-wrap items-center gap-2">
              <span className="text-xs text-foreground font-medium">{selected.size} selected</span>
              <select
                value={bulkCategory}
                onChange={(e) => setBulkCategory(e.target.value)}
                className="rounded border border-border bg-secondary px-2 py-1 text-xs text-foreground"
              >
                <option value="">Assign category…</option>
                {data.categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <button
                onClick={bulkAssignCategory}
                disabled={!bulkCategory}
                className="rounded bg-foreground px-2.5 py-1 text-xs text-background disabled:opacity-40"
              >
                Apply
              </button>
              <button
                onClick={bulkMergeDuplicates}
                className="rounded border border-border bg-secondary px-2.5 py-1 text-xs text-secondary-foreground hover:bg-secondary/80"
              >
                Merge duplicates
              </button>
              <button
                onClick={() => setSelected(new Set())}
                className="ml-auto text-xs text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
            </div>
          )}

          {/* Category tree */}
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {filteredGroups.map(([cat, catItems]) => {
              const isCollapsed = collapsed.has(cat);
              return (
                <div key={cat} className="rounded-md border border-border bg-secondary/30">
                  <button
                    onClick={() => toggleCat(cat)}
                    className="w-full flex items-center justify-between px-3 py-2 text-left"
                  >
                    <div className="flex items-center gap-1.5">
                      {isCollapsed ? (
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                      <span className="text-xs font-medium text-foreground">{cat}</span>
                      <span className="text-xs text-muted-foreground">({catItems.length})</span>
                    </div>
                  </button>
                  {!isCollapsed && (
                    <div className="px-2 pb-2 space-y-1">
                      {catItems.map((item) => (
                        <DishCard
                          key={item.id}
                          item={item}
                          categories={data.categories}
                          isSelected={selected.has(item.id)}
                          isEditing={editingId === item.id}
                          onToggleSelect={() => toggleSelected(item.id)}
                          onEdit={() => setEditingId(item.id)}
                          onSaveEdit={(patch) => {
                            updateItem(item.id, patch);
                            setEditingId(null);
                          }}
                          onCancelEdit={() => setEditingId(null)}
                          onRemove={() => removeItem(item.id)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

const ModeTab = ({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) => (
  <button
    onClick={onClick}
    className={`rounded-md border px-3 py-2 text-xs inline-flex items-center justify-center gap-1.5 transition-colors ${
      active
        ? "border-foreground bg-foreground/5 text-foreground"
        : "border-border bg-secondary text-muted-foreground hover:text-foreground"
    }`}
  >
    {icon}
    {label}
  </button>
);

const DishCard = ({
  item,
  categories,
  isSelected,
  isEditing,
  onToggleSelect,
  onEdit,
  onSaveEdit,
  onCancelEdit,
  onRemove,
}: {
  item: MenuItemEntry;
  categories: string[];
  isSelected: boolean;
  isEditing: boolean;
  onToggleSelect: () => void;
  onEdit: () => void;
  onSaveEdit: (patch: Partial<MenuItemEntry>) => void;
  onCancelEdit: () => void;
  onRemove: () => void;
}) => {
  const [name, setName] = useState(item.name);
  const [category, setCategory] = useState(item.category);
  const [variant, setVariant] = useState(item.variant ?? "");
  const [price, setPrice] = useState(item.sellingPrice);
  const [isCombo, setIsCombo] = useState(item.isCombo);

  if (isEditing) {
    return (
      <div className="rounded-md border border-border bg-card p-2.5 space-y-2">
        <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="Dish name" />
        <div className="grid grid-cols-2 gap-2">
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <input
            value={variant}
            onChange={(e) => setVariant(e.target.value)}
            className={inputClass}
            placeholder="Variant (e.g. Half)"
          />
        </div>
        <div className="flex gap-2 items-center">
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(Number(e.target.value))}
            className={inputClass}
            placeholder="Price"
          />
          <label className="text-xs text-muted-foreground inline-flex items-center gap-1.5 shrink-0">
            <input type="checkbox" checked={isCombo} onChange={(e) => setIsCombo(e.target.checked)} />
            Combo
          </label>
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onCancelEdit} className="text-xs text-muted-foreground hover:text-foreground">
            Cancel
          </button>
          <button
            onClick={() => onSaveEdit({ name, category, variant: variant || undefined, sellingPrice: price, isCombo })}
            className="rounded bg-foreground px-2.5 py-1 text-xs text-background inline-flex items-center gap-1"
          >
            <Check className="h-3 w-3" /> Save
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-2 rounded-md border px-2.5 py-2 transition-colors ${
        item.isDuplicate
          ? "border-warning/30 bg-warning/5"
          : isSelected
          ? "border-foreground/40 bg-foreground/5"
          : "border-border bg-secondary/40"
      }`}
    >
      <input
        type="checkbox"
        checked={isSelected}
        onChange={onToggleSelect}
        className="shrink-0"
        aria-label={`Select ${item.name}`}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm text-foreground truncate">{item.name}</p>
          {item.variant && (
            <span className="text-xs text-muted-foreground/80 bg-secondary border border-border px-1.5 py-0.5 rounded">
              {item.variant}
            </span>
          )}
          {item.isCombo && <span className="text-xs bg-info/10 text-info px-1.5 py-0.5 rounded">Combo</span>}
          {item.isDuplicate && (
            <span className="text-xs bg-warning/10 text-warning px-1.5 py-0.5 rounded">Duplicate</span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{item.category}</p>
      </div>
      <span className="text-xs text-muted-foreground shrink-0">₹{item.sellingPrice}</span>
      <button
        onClick={onEdit}
        className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
        aria-label="Edit dish"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={onRemove}
        className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
        aria-label="Remove dish"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};

const StatCard = ({
  icon,
  label,
  value,
  warning,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  warning?: boolean;
}) => (
  <div className="rounded-md border border-border bg-secondary/50 p-3 text-center">
    <div className={`flex justify-center mb-1 ${warning ? "text-warning" : "text-muted-foreground"}`}>{icon}</div>
    <p className="text-lg font-semibold text-foreground">{value}</p>
    <p className="text-xs text-muted-foreground">{label}</p>
  </div>
);

export default StepMenuImport;
