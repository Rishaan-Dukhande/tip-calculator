import React, { useMemo, useState, useEffect } from "react";
import { DollarSign, Percent, Users, Copy, RefreshCcw, Moon, Sun } from "lucide-react";

function classNames(...cls: (string | false | null | undefined)[]) {
  return cls.filter(Boolean).join(" ");
}

const presets = [12, 15, 18, 20, 22, 25] as const;
const roundingModes = [
  { id: "none", label: "No Rounding" },
  { id: "tip", label: "Round Tip" },
  { id: "total", label: "Round Total" },
  { id: "perPerson", label: "Round Per Person" },
] as const;

export default function TipCalculatorApp() {
  const [bill, setBill] = useState("");
  const [tipPercent, setTipPercent] = useState(18);
  const [people, setPeople] = useState(1);
  const [taxPercent, setTaxPercent] = useState(0);
  const [includeTaxInTip, setIncludeTaxInTip] = useState(false);
  const [rounding, setRounding] = useState<(typeof roundingModes)[number]["id"]>("none");
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    setDark(prefersDark);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    dark ? root.classList.add("dark") : root.classList.remove("dark");
  }, [dark]);

  const locale = typeof navigator !== "undefined" ? navigator.language : "en-US";
  const currency = useMemo(
    () => new Intl.NumberFormat(locale, { style: "currency", currency: guessCurrency(locale) }),
    [locale]
  );

  const numBill = parseToNumber(bill);
  const tax = Math.max(0, numBill * (taxPercent / 100));
  const tipBase = includeTaxInTip ? numBill + tax : numBill;
  const rawTip = Math.max(0, tipBase * (tipPercent / 100));
  const rawTotal = numBill + tax + rawTip;
  const safePeople = Math.max(1, Math.floor(people || 1));
  const rawPerPerson = rawTotal / safePeople;

  const { tip, total, perPerson } = useMemo(() => {
    let tip = rawTip;
    let total = rawTotal;
    let perPerson = rawPerPerson;

    switch (rounding) {
      case "tip":
        tip = Math.round(tip);
        total = numBill + tax + tip;
        perPerson = total / safePeople;
        break;
      case "total":
        total = Math.round(total);
        tip = Math.max(0, total - (numBill + tax));
        perPerson = total / safePeople;
        break;
      case "perPerson":
        perPerson = Math.round(perPerson);
        total = perPerson * safePeople;
        tip = Math.max(0, total - (numBill + tax));
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
  };

  const copy = async () => {
    try {
      const text = `Bill: ${currency.format(numBill)}
Tax (${taxPercent}%): ${currency.format(tax)}
Tip (${new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(effectiveTipPercent)}%): ${currency.format(tip)}
Total: ${currency.format(total)}
Split (${safePeople}): ${currency.format(perPerson)} each`;
      await navigator.clipboard.writeText(text);
    } catch {}
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <header className="flex items-center justify-between mb-6">
          <h1 className="text-2xl sm:text-3xl font-extrabold">🍽️ Smart Tip Calculator</h1>
          <button onClick={() => setDark((d) => !d)} className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-sm border">
            {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />} {dark ? "Light" : "Dark"} mode
          </button>
        </header>

        <div className="grid md:grid-cols-2 gap-6">
          <section className="rounded-3xl border bg-white dark:bg-slate-900 p-5 sm:p-6">
            <h2 className="font-semibold text-lg mb-4">Bill & Settings</h2>

            <LabeledInput label="Bill Amount" icon={<DollarSign className="w-4 h-4" />} value={bill} onChange={(e) => setBill(e.target.value)} />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <LabeledInput
                label="Sales Tax % (optional)"
                icon={<Percent className="w-4 h-4" />}
                value={String(taxPercent)}
                onChange={(e) => setTaxPercent(safeNumber(e.target.value, 0))}
              />
              <div className="flex items-center gap-3 mt-1">
                <input id="includeTax" type="checkbox" className="h-4 w-4" checked={includeTaxInTip} onChange={(e) => setIncludeTaxInTip(e.target.checked)} />
                <label htmlFor="includeTax" className="text-sm">Include tax in tip calculation</label>
              </div>
            </div>

            <div className="mt-3">
              <label className="text-sm font-medium">Tip Percentage</label>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm tabular-nums font-semibold">{new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(tipPercent)}%</span>
              </div>
              <input type="range" min={0} max={40} step={0.5} value={tipPercent} onChange={(e) => setTipPercent(Number(e.target.value))} className="w-full" />
              <div className="flex flex-wrap gap-2 mt-3">
                {presets.map((p) => (
                  <button
                    key={p}
                    onClick={() => setTipPercent(p)}
                    className={classNames("px-3 py-1.5 rounded-full text-sm border", tipPercent === p ? "bg-slate-900 text-white" : "bg-white dark:bg-slate-800")}
                  >
                    {p}%
                  </button>
                ))}
              </div>
            </div>

            <LabeledInput label="Split Between" icon={<Users className="w-4 h-4" />} value={String(people)} onChange={(e) => setPeople(Math.max(1, safeNumber(e.target.value, 1)))} />
          </section>

          <section className="rounded-3xl border bg-white dark:bg-slate-900 p-5 sm:p-6">
            <h2 className="font-semibold text-lg mb-4">Results</h2>
            <KPI label="Bill" value={currency.format(numBill)} />
            <KPI label="Tax" value={currency.format(tax)} />
            <KPI label="Tip" value={currency.format(tip)} />
            <KPI label="Total" value={currency.format(total)} />
            <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 border p-4 mt-4">
              <div className="flex items-baseline justify-between">
                <div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">Per Person ({safePeople})</div>
                  <div className="text-3xl font-bold tabular-nums">{currency.format(perPerson)}</div>
                </div>
                <div className="text-right text-sm">{rounding === "perPerson" ? "Rounded per person" : "Exact split"}</div>
              </div>
            </div>
          </section>
        </div>

        <div className="flex gap-2 mt-6">
          <button onClick={copy} className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm border">
            <Copy className="w-4 h-4" /> Copy Summary
          </button>
          <button onClick={reset} className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm border">
            <RefreshCcw className="w-4 h-4" /> Reset
          </button>
        </div>
      </div>
    </div>
  );
}

function KPI({ label, value }: { label: string; value: string }) {
  return (
    <div className="border rounded-xl p-4 mb-2">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-xl font-bold">{value}</div>
    </div>
  );
}

function LabeledInput(
  props: React.InputHTMLAttributes<HTMLInputElement> & { label: string; icon?: React.ReactNode }
) {
  const { label, icon, className, ...rest } = props;
  return (
    <label className="block mb-3">
      <span className="text-sm font-medium">{label}</span>
      <div className="relative mt-1">
        {icon && <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">{icon}</span>}
        <input {...rest} className={classNames("w-full rounded-2xl border px-3 py-2.5 text-sm outline-none", icon && "pl-9", className)} />
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

function safeNumber(v: string, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function guessCurrency(locale: string): string {
  const map: Record<string, string> = {
    "en-US": "USD", "en-GB": "GBP", "en-CA": "CAD", "fr-CA": "CAD",
    "en-AU": "AUD", "en-NZ": "NZD", "en-IN": "INR", "hi-IN": "INR",
    "ja-JP": "JPY", "de-DE": "EUR", "fr-FR": "EUR", "es-ES": "EUR", "it-IT": "EUR",
  };
  return map[locale] || "USD";
}
