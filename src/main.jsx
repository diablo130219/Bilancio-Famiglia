import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Wallet, Plus, Trash2, Landmark, ReceiptText, PiggyBank,
  ArrowRight, CheckCircle2, CalendarDays, RotateCcw, Download,
  Coins, CircleDollarSign, Banknote, Layers3, Info
} from "lucide-react";
import "./style.css";

const STORAGE_KEY = "bilancio-famiglia-zero-based-v2";
const MONTH_KEY = "bilancio-famiglia-zero-based-month";
const YEAR_KEY = "bilancio-famiglia-zero-based-year";

const MONTHS = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"
];

const TYPES = ["Spesa fissa", "Stanziamento", "Rata", "Altro"];

const makeId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const euro = (value) =>
  (Number(value) || 0).toLocaleString("it-IT", {
    style: "currency",
    currency: "EUR"
  });

const emptyMonth = () => ({
  funds: [],
  allocations: [],
  payments: []
});

const makeYear = () => Object.fromEntries(MONTHS.map((m) => [m, emptyMonth()]));

const emptyStore = () => ({ years: {} });

function normalizeMonth(raw) {
  return {
    funds: Array.isArray(raw?.funds)
      ? raw.funds.map((f) => ({
          id: f.id || makeId(),
          name: f.name || "Fondo",
          amount: Number(f.amount) || 0
        }))
      : [],
    allocations: Array.isArray(raw?.allocations)
      ? raw.allocations.map((a) => ({
          id: a.id || makeId(),
          name: a.name || "Spesa",
          type: TYPES.includes(a.type) ? a.type : "Spesa fissa",
          planned: Number(a.planned) || 0,
          fundId: a.fundId || ""
        }))
      : [],
    payments: Array.isArray(raw?.payments)
      ? raw.payments.map((p) => ({
          id: p.id || makeId(),
          date: p.date || "",
          allocationId: p.allocationId || "",
          fundId: p.fundId || "",
          amount: Number(p.amount) || 0,
          note: p.note || ""
        }))
      : []
  };
}

function loadStore() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved?.years) return emptyStore();
    const result = { years: {} };
    Object.entries(saved.years).forEach(([year, months]) => {
      result.years[year] = makeYear();
      MONTHS.forEach((m) => {
        result.years[year][m] = normalizeMonth(months?.[m]);
      });
    });
    return result;
  } catch {
    return emptyStore();
  }
}

function App() {
  const now = new Date();
  const [store, setStore] = useState(loadStore);
  const [month, setMonth] = useState(localStorage.getItem(MONTH_KEY) || MONTHS[now.getMonth()]);
  const [year, setYear] = useState(Number(localStorage.getItem(YEAR_KEY)) || now.getFullYear());

  const data = getMonth(store, year, month);
  const result = useMemo(() => calculateMonth(data), [data]);

  const updateMonth = (updater) => {
    setStore((prev) => {
      const next = structuredClone(prev);
      const y = String(year);
      if (!next.years[y]) next.years[y] = makeYear();
      next.years[y][month] = normalizeMonth(next.years[y][month]);
      updater(next.years[y][month]);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      localStorage.setItem(MONTH_KEY, month);
      localStorage.setItem(YEAR_KEY, String(year));
      return next;
    });
  };

  const resetMonth = () => {
    if (!confirm(`Azzerare completamente ${month} ${year}?`)) return;
    updateMonth((m) => {
      m.funds = [];
      m.allocations = [];
      m.payments = [];
    });
  };

  const carryToNextMonth = () => {
    const currentIndex = MONTHS.indexOf(month);
    const nextMonth = MONTHS[(currentIndex + 1) % 12];
    const nextYear = currentIndex === 11 ? year + 1 : year;
    const balances = result.funds.filter((f) => f.current > 0.005);
    if (!balances.length) {
      alert("Non ci sono residui positivi da portare al mese successivo.");
      return;
    }
    if (!confirm(`Portare i residui reali di ${month} in ${nextMonth} ${nextYear}? Le spese non verranno copiate.`)) return;

    setStore((prev) => {
      const next = structuredClone(prev);
      const y = String(nextYear);
      if (!next.years[y]) next.years[y] = makeYear();
      const target = normalizeMonth(next.years[y][nextMonth]);
      balances.forEach((f) => {
        const existing = target.funds.find((x) => x.name.trim().toLowerCase() === f.name.trim().toLowerCase());
        if (existing) existing.amount += f.current;
        else target.funds.push({ id: makeId(), name: f.name, amount: f.current });
      });
      next.years[y][nextMonth] = target;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
    alert(`Residui portati in ${nextMonth} ${nextYear}.`);
  };

  return (
    <div className="app-shell">
      <Header month={month} setMonth={setMonth} year={year} setYear={setYear} resetMonth={resetMonth} />

      <section className="hero-summary">
        <Metric icon={Banknote} label="Disponibilità totale" value={euro(result.totalInitial)} tone="green" />
        <Metric icon={Layers3} label="Già assegnato" value={euro(result.totalPlanned)} tone="blue" />
        <Metric icon={CircleDollarSign} label="Libero da assegnare" value={euro(result.freeToAssign)} tone={result.freeToAssign < 0 ? "red" : "purple"} />
        <Metric icon={ReceiptText} label="Già pagato" value={euro(result.totalPaid)} tone="orange" />
      </section>

      <section className="explain-strip">
        <Info size={20} />
        <span>
          Prima <strong>stanzi</strong> quanto vuoi destinare alle spese. Solo quando paghi scegli da quale fondo scalare i soldi, in base alla disponibilità del momento.
        </span>
      </section>

      <div className="main-grid">
        <FundsPanel data={data} result={result} updateMonth={updateMonth} />
        <AllocationsPanel data={data} result={result} updateMonth={updateMonth} />
      </div>

      <PaymentsPanel data={data} result={result} updateMonth={updateMonth} />

      <section className="bottom-grid">
        <MonthlyOverview result={result} />
        <CarryPanel month={month} year={year} result={result} carryToNextMonth={carryToNextMonth} />
      </section>

      <footer className="footer-tools">
        <button className="secondary-btn" onClick={() => downloadBackup(store)}><Download size={17} /> Scarica backup JSON</button>
        <span>I dati di questa versione partono da zero e vengono salvati nel browser.</span>
      </footer>
    </div>
  );
}

function Header({ month, setMonth, year, setYear, resetMonth }) {
  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-icon"><PiggyBank size={32} /></div>
        <div>
          <h1>Bilancio Famiglia</h1>
          <p>Assegna ogni euro prima di spenderlo</p>
        </div>
      </div>
      <div className="period-controls">
        <label>
          <span>Mese</span>
          <select value={month} onChange={(e) => { setMonth(e.target.value); localStorage.setItem(MONTH_KEY, e.target.value); }}>
            {MONTHS.map((m) => <option key={m}>{m}</option>)}
          </select>
        </label>
        <label>
          <span>Anno</span>
          <input type="number" value={year} min="2020" max="2100" onChange={(e) => { const v = Number(e.target.value) || new Date().getFullYear(); setYear(v); localStorage.setItem(YEAR_KEY, String(v)); }} />
        </label>
        <button className="danger-btn" onClick={resetMonth}><RotateCcw size={17} /> Azzera mese</button>
      </div>
    </header>
  );
}

function Metric({ icon: Icon, label, value, tone }) {
  return (
    <article className={`metric ${tone}`}>
      <div className="metric-icon"><Icon size={22} /></div>
      <div><span>{label}</span><strong>{value}</strong></div>
    </article>
  );
}

function FundsPanel({ data, result, updateMonth }) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");

  const addFund = () => {
    if (!name.trim()) return;
    updateMonth((m) => m.funds.push({ id: makeId(), name: name.trim(), amount: Number(amount) || 0 }));
    setName("");
    setAmount("");
  };

  const removeFund = (id) => {
    const used = data.payments.some((p) => p.fundId === id);
    if (used) return alert("Questo fondo è già stato usato in uno o più pagamenti. Elimina prima quei pagamenti.");
    updateMonth((m) => { m.funds = m.funds.filter((f) => f.id !== id); });
  };

  return (
    <section className="panel">
      <PanelHead icon={Wallet} title="1. Fondi disponibili" subtitle="Inserisci da dove arrivano i soldi del mese" />
      <div className="entry-row fund-entry">
        <input placeholder="Es. Giulia, Extra, Residuo banca" value={name} onChange={(e) => setName(e.target.value)} />
        <input type="number" step="0.01" min="0" placeholder="Importo €" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <button className="primary-btn" onClick={addFund}><Plus size={17} /> Aggiungi</button>
      </div>

      {data.funds.length === 0 ? <Empty text="Nessun fondo inserito. Tutto parte da 0." /> : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Fondo</th><th>Inizio mese</th><th>Pagato</th><th>Disponibile ora</th><th></th></tr></thead>
            <tbody>
              {result.funds.map((f) => (
                <tr key={f.id}>
                  <td><input className="table-input name-input" value={f.name} onChange={(e) => updateMonth((m) => { const x = m.funds.find((z) => z.id === f.id); if (x) x.name = e.target.value; })} /></td>
                  <td><MoneyInput value={f.amount} onChange={(v) => updateMonth((m) => { const x = m.funds.find((z) => z.id === f.id); if (x) x.amount = v; })} /></td>
                  <td className="money">{euro(f.paid)}</td>
                  <td className={`money strong ${f.current < -0.005 ? "negative" : "positive"}`}>{euro(f.current)}</td>
                  <td><button className="icon-btn" onClick={() => removeFund(f.id)} title="Elimina"><Trash2 size={16} /></button></td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr><td>Totale</td><td>{euro(result.totalInitial)}</td><td>{euro(result.totalPaid)}</td><td>{euro(result.totalCurrent)}</td><td></td></tr></tfoot>
          </table>
        </div>
      )}
    </section>
  );
}

function AllocationsPanel({ data, result, updateMonth }) {
  const [name, setName] = useState("");
  const [type, setType] = useState("Spesa fissa");
  const [planned, setPlanned] = useState("");

  const addAllocation = () => {
    if (!name.trim()) return;
    updateMonth((m) => m.allocations.push({ id: makeId(), name: name.trim(), type, planned: Number(planned) || 0, fundId: "" }));
    setName(""); setPlanned("");
  };

  const removeAllocation = (id) => {
    const hasPayments = data.payments.some((p) => p.allocationId === id);
    if (hasPayments && !confirm("Questa voce ha già dei pagamenti. Eliminandola eliminerai anche quei pagamenti. Continuare?")) return;
    updateMonth((m) => {
      m.allocations = m.allocations.filter((a) => a.id !== id);
      m.payments = m.payments.filter((p) => p.allocationId !== id);
    });
  };

  return (
    <section className="panel">
      <PanelHead icon={Landmark} title="2. Spese da coprire" subtitle="Stanzia gli importi ora; sceglierai il fondo solo quando paghi" />
      <div className="allocation-form">
        <input placeholder="Es. Mutuo, Alimentari, Benzina…" value={name} onChange={(e) => setName(e.target.value)} />
        <select value={type} onChange={(e) => setType(e.target.value)}>{TYPES.map((t) => <option key={t}>{t}</option>)}</select>
        <input type="number" step="0.01" min="0" placeholder="Stanziato €" value={planned} onChange={(e) => setPlanned(e.target.value)} />
        <button className="primary-btn" onClick={addAllocation}><Plus size={17} /> Aggiungi</button>
      </div>

      {data.allocations.length === 0 ? <Empty text="Nessuna spesa prevista. Inseriscile tu mese per mese." /> : (
        <div className="allocation-list">
          {result.allocations.map((a) => (
            <article className="allocation-card" key={a.id}>
              <div className="allocation-top">
                <div className="allocation-name">
                  <input className="bare-input" value={a.name} onChange={(e) => updateMonth((m) => { const x = m.allocations.find((z) => z.id === a.id); if (x) x.name = e.target.value; })} />
                  <select className="mini-select" value={a.type} onChange={(e) => updateMonth((m) => { const x = m.allocations.find((z) => z.id === a.id); if (x) x.type = e.target.value; })}>{TYPES.map((t) => <option key={t}>{t}</option>)}</select>
                </div>
                <button className="icon-btn" onClick={() => removeAllocation(a.id)}><Trash2 size={16} /></button>
              </div>
              <div className="allocation-fields">
                <label><span>Stanziato</span><MoneyInput value={a.planned} onChange={(v) => updateMonth((m) => { const x = m.allocations.find((z) => z.id === a.id); if (x) x.planned = v; })} /></label>
                <div className="allocation-stat"><span>Stato</span><strong>{a.remaining <= 0.005 ? "Coperta" : "Da coprire"}</strong></div>
                <div className="allocation-stat"><span>Pagato</span><strong>{euro(a.paid)}</strong></div>
                <div className="allocation-stat"><span>Da pagare</span><strong>{euro(a.remaining)}</strong></div>
              </div>
              <div className="progress"><span style={{ width: `${Math.min(100, a.planned > 0 ? (a.paid / a.planned) * 100 : 0)}%` }} /></div>
              {a.paid > a.planned + 0.005 && <div className="overrun">Superato lo stanziamento di {euro(a.paid - a.planned)}</div>}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function PaymentsPanel({ data, result, updateMonth }) {
  const [allocationId, setAllocationId] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayLocal());
  const [note, setNote] = useState("");
  const [fundId, setFundId] = useState("");

  const selected = data.allocations.find((a) => a.id === allocationId);
  const selectedFund = data.funds.find((f) => f.id === fundId);
  const selectedFundResult = result.funds.find((f) => f.id === fundId);

  const addPayment = () => {
    if (!selected) return alert("Scegli prima la spesa da pagare.");
    if (!selectedFund) return alert("Scegli da quale fondo scalare questo pagamento.");
    const val = Number(amount) || 0;
    if (val <= 0) return;
    if (selectedFundResult && val > selectedFundResult.current + 0.005) {
      return alert(`Nel fondo ${selectedFund.name} hai ${euro(selectedFundResult.current)} disponibili. Scegli un altro fondo oppure registra un importo più basso.`);
    }
    updateMonth((m) => m.payments.push({ id: makeId(), date, allocationId, fundId, amount: val, note: note.trim() }));
    setAmount(""); setNote("");
  };

  const removePayment = (id) => updateMonth((m) => { m.payments = m.payments.filter((p) => p.id !== id); });

  return (
    <section className="panel payments-panel">
      <PanelHead icon={ReceiptText} title="3. Registra una spesa o una rata" subtitle="Quando paghi scegli da quale fondo scalare l’importo" />
      <div className="payment-form">
        <label><span>Data</span><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
        <label><span>Voce</span><select value={allocationId} onChange={(e) => setAllocationId(e.target.value)}><option value="">Scegli spesa</option>{data.allocations.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
        <label><span>Importo</span><input type="number" step="0.01" min="0" placeholder="0,00 €" value={amount} onChange={(e) => setAmount(e.target.value)} /></label>
        <label><span>Nota</span><input placeholder="Facoltativa" value={note} onChange={(e) => setNote(e.target.value)} /></label>
        <label><span>Scala da</span><select value={fundId} onChange={(e) => setFundId(e.target.value)}><option value="">Scegli fondo</option>{result.funds.map((f) => <option key={f.id} value={f.id}>{f.name} · {euro(f.current)} disponibili</option>)}</select></label>
        <button className="pay-btn" onClick={addPayment}><CheckCircle2 size={18} /> Registra pagamento</button>
      </div>

      {result.payments.length === 0 ? <Empty text="Nessun pagamento registrato in questo mese." /> : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Data</th><th>Spesa</th><th>Fondo</th><th>Nota</th><th>Importo</th><th></th></tr></thead>
            <tbody>
              {result.payments.map((p) => (
                <tr key={p.id}>
                  <td>{formatDate(p.date)}</td>
                  <td className="strong">{p.allocationName}</td>
                  <td>{p.fundName}</td>
                  <td>{p.note || "—"}</td>
                  <td className="money strong">{euro(p.amount)}</td>
                  <td><button className="icon-btn" onClick={() => removePayment(p.id)}><Trash2 size={16} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function MonthlyOverview({ result }) {
  return (
    <section className="summary-card">
      <h2><Coins size={20} /> Situazione del mese</h2>
      <div className="summary-line"><span>Soldi inseriti</span><strong>{euro(result.totalInitial)}</strong></div>
      <div className="summary-line"><span>Destinati alle spese</span><strong>{euro(result.totalPlanned)}</strong></div>
      <div className="summary-line emphasis"><span>Ancora liberi da assegnare</span><strong>{euro(result.freeToAssign)}</strong></div>
      <div className="summary-line"><span>Pagamenti già effettuati</span><strong>{euro(result.totalPaid)}</strong></div>
      <div className="summary-line"><span>Spese previste ancora da pagare</span><strong>{euro(result.totalReserved)}</strong></div>
      <div className="summary-line"><span>Saldo reale attuale</span><strong>{euro(result.totalCurrent)}</strong></div>
      <div className={`status-box ${result.freeToAssign < -0.005 ? "bad" : "good"}`}>
        {result.freeToAssign < -0.005
          ? `Hai assegnato ${euro(Math.abs(result.freeToAssign))} in più rispetto ai soldi disponibili.`
          : `Dopo aver coperto tutte le spese previste ti restano ${euro(result.freeToAssign)} non ancora assegnati.`}
      </div>
    </section>
  );
}

function CarryPanel({ month, year, result, carryToNextMonth }) {
  const next = MONTHS[(MONTHS.indexOf(month) + 1) % 12];
  return (
    <section className="summary-card carry-card">
      <h2><ArrowRight size={20} /> Fine mese</h2>
      <p>Quando hai finito {month}, puoi portare nel mese successivo solo i <strong>saldi reali rimasti</strong> nei fondi.</p>
      <div className="carry-value"><span>Residuo reale complessivo</span><strong>{euro(result.totalCurrent)}</strong></div>
      <button className="primary-btn wide" onClick={carryToNextMonth}>Porta i residui in {next}</button>
      <small>Le vecchie spese e gli stanziamenti non vengono copiati: nel nuovo mese li inserirai di nuovo da zero.</small>
    </section>
  );
}

function PanelHead({ icon: Icon, title, subtitle }) {
  return <div className="panel-head"><div className="panel-head-icon"><Icon size={21} /></div><div><h2>{title}</h2><p>{subtitle}</p></div></div>;
}

function Empty({ text }) {
  return <div className="empty"><CalendarDays size={22} /><span>{text}</span></div>;
}

function MoneyInput({ value, onChange }) {
  return <input className="table-input money-input" type="number" step="0.01" min="0" value={value} onChange={(e) => onChange(Number(e.target.value) || 0)} />;
}

function getMonth(store, year, month) {
  const y = String(year);
  return normalizeMonth(store?.years?.[y]?.[month]);
}

function calculateMonth(data) {
  const paidByAllocation = {};
  const paidByFund = {};

  data.payments.forEach((p) => {
    paidByAllocation[p.allocationId] = (paidByAllocation[p.allocationId] || 0) + (Number(p.amount) || 0);
    const allocation = data.allocations.find((a) => a.id === p.allocationId);
    const sourceFundId = p.fundId || allocation?.fundId || "";
    if (sourceFundId) paidByFund[sourceFundId] = (paidByFund[sourceFundId] || 0) + (Number(p.amount) || 0);
  });

  const allocations = data.allocations.map((a) => {
    const paid = paidByAllocation[a.id] || 0;
    return {
      ...a,
      paid,
      remaining: Math.max(0, (Number(a.planned) || 0) - paid),
      fundName: data.funds.find((f) => f.id === a.fundId)?.name || "Non assegnato"
    };
  });

  const funds = data.funds.map((f) => {
    const paid = paidByFund[f.id] || 0;
    const current = (Number(f.amount) || 0) - paid;
    return { ...f, paid, current };
  });

  const totalInitial = funds.reduce((s, f) => s + (Number(f.amount) || 0), 0);
  const totalPaid = data.payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const totalPlanned = allocations.reduce((s, a) => s + (Number(a.planned) || 0), 0);
  const totalReserved = allocations.reduce((s, a) => s + a.remaining, 0);
  const totalCurrent = totalInitial - totalPaid;
  const freeToAssign = totalCurrent - totalReserved;

  const payments = [...data.payments]
    .map((p) => {
      const allocation = data.allocations.find((a) => a.id === p.allocationId);
      const fund = data.funds.find((f) => f.id === (p.fundId || allocation?.fundId));
      return { ...p, allocationName: allocation?.name || "Voce eliminata", fundName: fund?.name || "—" };
    })
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  return { funds, allocations, payments, totalInitial, totalPaid, totalPlanned, totalReserved, totalCurrent, freeToAssign };
}

function todayLocal() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDate(value) {
  if (!value) return "—";
  const [y, m, d] = value.split("-");
  return `${d}/${m}/${y}`;
}

function downloadBackup(store) {
  const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), app: "Bilancio Famiglia", version: "zero-based-v2", data: store }, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `bilancio-famiglia-${todayLocal()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

createRoot(document.getElementById("root")).render(<App />);
