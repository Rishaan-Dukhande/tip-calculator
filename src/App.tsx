\
import React, { useMemo, useState, useEffect } from "react";
import { DollarSign, Percent, Users, Copy, RefreshCcw, Moon, Sun } from "lucide-react";

function classNames(...cls: (string | false | null | undefined)[]) {
  return cls.filter(Boolean).join(" ");
}

const presets = [12, 15, 18, 20, 22, 25];
const roundingModes = [
  { id: "none", label: "No Rounding" },
  { id: "tip", label: "Round Tip" },
  { id: "total", label: "Round Total" },
  { id: "perPerson", label: "Round Per Person" },
] as const;

export default function TipCalculatorApp() {
  const [bill, setBill] = useState<string>("");
  const [tipPercent, setTipPercent] = useState<number>(18);
  const [people, setPeople] = useState<number>(1);
  const [taxPercent, setTaxPercent] = useState<number>(0);
  const [includeTaxInTip, setIncludeTaxInTip] = useState<boolean>(false);
  const [rounding, setRounding] = useState<(typeof roundingModes)[number]["id"]>("none");
  const [copied, setCopied] = useState(false);
  const [dark, setDark] = useState<boolean>(false);

  useEffect(() => {
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    setDark(prefersDark);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (dark) root.classList.add('dark');
    else root.classList.remove('dark');
  }, [dark]);

  const locale = typeof navigator !== "undefined" ? navigator.language : "en-US";
  const currency = useMemo(() => new Intl.NumberFormat(locale, { style: "currency", currency: guessCurrency(locale) }), [locale]);

  const numBill = parseToNumber(bill);
  const tax = clamp(numBill * (taxPercent / 100), 0, Number.MAX_SAFE_INTEGER);
  const tipBase = includeTaxInTip ? numBill + tax : numBill;
  const rawTip = clamp(tipBase * (tipPercent / 100), 0, Number.MAX_SAFE_INTEGER);
  const rawTotal = numBill + tax + rawTip;
  const safePeople = Math.max(1, Math.floor(people || 1));
  const rawPerPerson = rawTotal / safePeople;

  const { tip, total, perPerson } = React.useMemo(() => {
    let tip = rawTip;
    let total = rawTotal;
    let perPerson = rawPerPerson;

    switch (rounding) {
      case "tip": {
        tip = Math.round(tip);
        total = numBill + tax + tip;
        perPerson = total / safePeople;
        break;
      }
      case "total": {
        total = Math.round(total);
        tip = Math.max(0, total - (numBill + tax));
        perPerson = total / safePeople;
        break;
      }
      case "perPerson": {
        perPerson = Math.round(perPerson);
        total = perPerson * safePeople;
        tip = Math.max(0, total - (numBill + tax));
        break;
      }
      default:
        break;
    }

    return { tip, total, perPerson };
  }, [rounding, rawTip, rawTotal, rawPerPerson, numBill, tax, safePeople]);

  const effectiveTipPercent = tipBase > 0 ? (tip / tipBase) * 100 : 0;

  const reset = () => {
    setBill("");
    setTipPercent(18);
    setPeople(1);
    setTaxPercent(0);
    setIncludeTaxInTip(false);
    setRounding("none");
    setCopied(false);
  };

  const copy = async () => {
    try {
      const text = `Bill: ${currency.format(numBill)}\nTax (${taxPercent}%): ${currency.format(tax)}\nTip (${formatNumber(effectiveTipPercent)}%): ${currency.format(tip)}\nTotal: ${currency.format(total)}\nSplit (${safePeople}): ${currency.format(perPerson)} each`;
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      console.warn("Copy failed", e);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <header className="flex items-center justify-between mb-6">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">🍽️ Smart Tip Calculator</h1>
          <button
            onClick={() => setDark((d) => !d)}
            className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-sm border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow transition bg-white/70 dark:bg-slate-900/50 backdrop-blur"
            aria-label="Toggle theme"
          >
            {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            <span className="hidden sm:inline">{dark ? "Light" : "Dark"} mode</span>
          </button>
        </header>

        <div className="grid md:grid-cols-2 gap-6">
          <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-sm">
            <h2 className="font-semibold text-lg mb-4">Bill & Settings</h2>

            <div className="space-y-4">
              <LabeledInput
                label="Bill Amount"
                icon={<DollarSign className="w-4 h-4" />}
                type="number"
                inputMode="decimal"
                placeholder="0.00"
                value={bill}
                min="0"
                step="0.01"
                onChange={(e) => setBill(e.target.value)}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <LabeledInput
                  label="Sales Tax % (optional)"
                  icon={<Percent className="w-4 h-4" />}
                  type="number"
                  inputMode="decimal"
                  placeholder="0"
                  value={String(taxPercent)}
                  min="0"
                  step="0.1"
                  onChange={(e) => setTaxPercent(safeNumber(e.target.value, 0))}
                />

                <div className="flex items-center gap-3 mt-1">
                  <input
                    id="includeTax"
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                    checked={includeTaxInTip}
                    onChange={(e) => setIncludeTaxInTip(e.target.checked)}
                  />
                  <label htmlFor="includeTax" className="text-sm">Include tax in tip calculation</label>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">Tip Percentage</label>
                  <span className="text-sm tabular-nums font-semibold">{formatNumber(tipPercent)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={40}
                  step={0.5}
                  value={tipPercent}
                  onChange={(e) => setTipPercent(Number(e.target.value))}
                  className="w-full accent-slate-900"
                />
                <div className="flex flex-wrap gap-2 mt-3">
                  {presets.map((p) => (
                    <button
                      key={p}
                      onClick={() => setTipPercent(p)}
                      className={classNames(
                        "px-3 py-1.5 rounded-full text-sm border transition",
                        tipPercent === p
                          ? "bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:border-slate-100"
                          : "bg-white/70 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                      )}
                    >
                      {p}%
                    </button>
                  ))}
                </div>
              </div>

              <LabeledInput
                label="Split Between"
                icon={<Users className="w-4 h-4" />}
                type="number"
                inputMode="numeric"
                placeholder="1"
                value={String(people)}
                min="1"
                step="1"
                onChange={(e) => setPeople(Math.max(1, safeNumber(e.target.value, 1)))}
              />

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1">
                {roundingModes.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setRounding(m.id)}
                    className={classNames(
                      "px-3 py-2 rounded-xl text-xs sm:text-sm border transition",
                      rounding === m.id
                        ? "bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:border-slate-100"
                        : "bg-white/70 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                    )}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  onClick={copy}
                  className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm"
                >
                  <Copy className="w-4 h-4" /> Copy Summary
                </button>
                <button
                  onClick={reset}
                  className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm hover:opacity-90"
                >
                  <RefreshCcw className="w-4 h-4" /> Reset
                </button>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-sm flex flex-col">
            <h2 className="font-semibold text-lg mb-4">Results</h2>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <KPI label="Bill" value={currency.format(numBill)} note="Subtotal" />
              <KPI label="Tax" value={currency.format(tax)} note={`${formatNumber(taxPercent)}%`} />
              <KPI label="Tip" value={currency.format(tip)} note={`${formatNumber(effectiveTipPercent)}% of ${includeTaxInTip ? "(bill + tax)" : "bill"}`} />
              <KPI label="Total" value={currency.format(total)} note="With tax & tip" />
            </div>

            <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-4 mb-4">
              <div className="flex items-baseline justify-between">
                <div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">Per Person ({safePeople})</div>
                  <div className="text-3xl font-bold tabular-nums">{currency.format(perPerson)}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-slate-500 dark:text-slate-400">Each pays</div>
                  <div className="text-sm">{rounding === 'perPerson' ? "Rounded per person" : "Exact split"}</div>
                </div>
              </div>
            </div>

            <ul className="text-sm space-y-2 mt-auto">
              {numBill <= 0 && (
                <li className="text-amber-700 dark:text-amber-400">Enter a bill amount to begin.</li>
              )}
              {safePeople > 1 && rounding === 'none' && (
                <li className="text-slate-600 dark:text-slate-300">Tip and total are exact; amounts may include cents when split.</li>
              )}
              {includeTaxInTip && (
                <li className="text-slate-600 dark:text-slate-300">You are tipping on bill + tax. Turn off above to tip on the pre-tax subtotal.</li>
              )}
            </ul>
          </section>
        </div>

        <footer className="mt-8 text-center text-xs text-slate-500 dark:text-slate-400">
          Built with ❤️ — Adjust sliders & presets, choose rounding, and copy results.
        </footer>
      </div>
    </div>
  );
}

function KPI({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-white dark:bg-slate-900">
      <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</div>
      <div className="text-2xl font-bold tabular-nums">{value}</div>
      {note && <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{note}</div>}
    </div>
  );
}

function LabeledInput(
  props: React.InputHTMLAttributes<HTMLInputElement> & { label: string; icon?: React.ReactNode }
) {
  const { label, icon, className, ...rest } = props;
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <div className="mt-1 relative">
        {icon && (
          <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
            {icon}
          </span>
        )}
        <input
          {...rest}
          className={classNames(
            "w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-slate-400/50 shadow-sm",
            icon && "pl-9",
            className
          )}
        />
      </div>
    </label>
  );
}

function parseToNumber(v: string): number {
  if (!v) return 0;
  const cleaned = v.replace(/[^0-9.\-]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function clamp(n: number, min: number, max: number) {
  return Math.min(Math.max(n, min), max);
}

function safeNumber(v: string, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function formatNumber(n: number) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(n);
}

function guessCurrency(locale: string): string {
  const map: Record<string, string> = {
    "en-US": "USD",
    "en-GB": "GBP",
    "en-CA": "CAD",
    "fr-CA": "CAD",
    "en-AU": "AUD",
    "en-NZ": "NZD",
    "en-IN": "INR",
    "hi-IN": "INR",
    "ja-JP": "JPY",
    "de-DE": "EUR",
    "fr-FR": "EUR",
    "es-ES": "EUR",
    "it-IT": "EUR",
  };
  return map[locale] || "USD";
}
