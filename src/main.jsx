import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Wallet, Plus, Trash2, Landmark, ReceiptText, PiggyBank,
  ArrowRight, CheckCircle2, CalendarDays, RotateCcw, Download,
  Coins, CircleDollarSign, Banknote, Layers3, Info, Pencil, Undo2, ShieldCheck, AlertTriangle
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
const OTHER_PAYMENT_ID = "__altro__";

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
    if (!confirm(`Chiudere ${month} e preparare ${nextMonth} ${nextYear}? Verranno portati i saldi reali dei fondi e tutte le voci di spesa con importo 0 €.`)) return;

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

      // Riporta nel nuovo mese tutte le voci usate nel mese appena chiuso,
      // ma azzera gli importi e non collega alcun fondo. In questo modo
      // l'utente ritrova l'elenco pronto e decide ogni mese i nuovi importi.
      data.allocations.forEach((a) => {
        const existing = target.allocations.find(
          (x) => x.name.trim().toLowerCase() === a.name.trim().toLowerCase()
        );
        if (!existing) {
          target.allocations.push({
            id: makeId(),
            name: a.name,
            type: a.type,
            planned: 0,
            fundId: ""
          });
        }
      });

      next.years[y][nextMonth] = target;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
    alert(`${nextMonth} ${nextYear} è pronto: residui dei fondi trasferiti e voci di spesa riportate a 0 €.`);
  };

  return (
    <div className="app-shell">
      <Header month={month} setMonth={setMonth} year={year} setYear={setYear} resetMonth={resetMonth} />

      <section className="explain-strip">
        <Info size={20} />
        <span>
          Prima <strong>stanzi</strong> quanto vuoi destinare alle spese. Solo quando paghi scegli da quale fondo scalare i soldi, in base alla disponibilità del momento.
        </span>
      </section>

      <section className="funds-dashboard">
        <aside className="funds-side funds-side-left">
          <Metric icon={Banknote} label="Disponibilità totale" value={euro(result.totalInitial)} tone="green" />
          <Metric icon={ReceiptText} label="Già pagato" value={euro(result.totalPaid)} tone="blue" />
          <Metric icon={Layers3} label="Già impegnato" value={euro(result.totalPlanned)} tone="orange" />
        </aside>

        <div className="funds-center-wrap">
          <FundsPanel data={data} result={result} updateMonth={updateMonth} />
        </div>

        <aside className="funds-side funds-side-right">
          <Metric icon={CircleDollarSign} label="Disponibilità libera" value={euro(result.freeToAssign)} tone={result.freeToAssign < 0 ? "red" : "green"} />
          <Metric icon={Landmark} label="Spese da coprire" value={euro(result.totalReserved)} tone="blue" />
        </aside>
      </section>

      <div className="allocations-full-wrap">
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
  const [quickFunds, setQuickFunds] = useState({});
  const [quickAmounts, setQuickAmounts] = useState({});

  const addAllocation = () => {
    if (!name.trim()) return;
    updateMonth((m) => m.allocations.push({ id: makeId(), name: name.trim(), type, planned: Number(planned) || 0, fundId: "" }));
    setName(""); setPlanned("");
  };

  const quickPay = (allocation) => {
    const fundId = quickFunds[allocation.id] || "";
    const fund = result.funds.find((f) => f.id === fundId);
    if (!fund) return alert("Scegli da quale entrata/fondo scalare la spesa.");
    const raw = quickAmounts[allocation.id];
    const amount = raw === undefined || raw === "" ? allocation.remaining : Number(raw);
    if (!amount || amount <= 0) return alert("Inserisci un importo da scalare.");
    if (amount > allocation.remaining + 0.005) return alert(`Per ${allocation.name} restano da pagare ${euro(allocation.remaining)}.`);
    if (amount > fund.current + 0.005) return alert(`Nel fondo ${fund.name} hai ${euro(fund.current)} disponibili.`);
    updateMonth((m) => m.payments.push({ id: makeId(), date: todayLocal(), allocationId: allocation.id, fundId, amount, note: "" }));
    setQuickAmounts((prev) => ({ ...prev, [allocation.id]: "" }));
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
              <div className="allocation-compact-row">
                <label className="compact-planned"><span>Stanziato</span><MoneyInput value={a.planned} onChange={(v) => updateMonth((m) => { const x = m.allocations.find((z) => z.id === a.id); if (x) x.planned = v; })} /></label>
                <div className="allocation-stat"><span>Pagato</span><strong>{euro(a.paid)}</strong></div>
                <div className="allocation-stat"><span>Da pagare</span><strong>{euro(a.remaining)}</strong></div>
                {a.remaining <= 0.005 ? (
                  <div className="paid-status"><CheckCircle2 size={16} /> Pagata</div>
                ) : a.type === "Stanziamento" ? (
                  <div className="allocation-register-hint"><ReceiptText size={16} /> Scala dal Registro spese</div>
                ) : (
                  <>
                    <label className="compact-fund"><span>Scala da entrata/fondo</span><select value={quickFunds[a.id] || ""} onChange={(e) => setQuickFunds((prev) => ({ ...prev, [a.id]: e.target.value }))}><option value="">Scegli da dove scalare</option>{result.funds.map((f) => <option key={f.id} value={f.id}>{f.name} · {euro(f.current)} disponibili</option>)}</select></label>
                    <label className="compact-amount"><span>Importo</span><input type="number" step="0.01" min="0" max={a.remaining} placeholder={a.remaining > 0 ? euro(a.remaining) : "0,00 €"} value={quickAmounts[a.id] ?? ""} onChange={(e) => setQuickAmounts((prev) => ({ ...prev, [a.id]: e.target.value }))} /></label>
                    <button className="pay-btn quick-pay-btn" onClick={() => quickPay(a)}><CheckCircle2 size={17} /> Scala / Paga</button>
                  </>
                )}
              </div>
              {a.planned > 0 && <div className="progress compact-progress"><span style={{ width: `${Math.min(100, (a.paid / a.planned) * 100)}%` }} /></div>}
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
  const [editingId, setEditingId] = useState("");
  const [editDraft, setEditDraft] = useState(null);
  const [filterFund, setFilterFund] = useState("");
  const [filterVoice, setFilterVoice] = useState("");

  const spendableAllocations = data.allocations.filter((a) => a.type === "Stanziamento");
  const isOther = allocationId === OTHER_PAYMENT_ID;
  const selected = spendableAllocations.find((a) => a.id === allocationId);
  const selectedFund = data.funds.find((f) => f.id === fundId);
  const selectedFundResult = result.funds.find((f) => f.id === fundId);

  const addPayment = () => {
    if (!selected && !isOther) return alert("Scegli prima la spesa da pagare.");
    if (!selectedFund) return alert("Scegli da quale fondo scalare questo pagamento.");
    const val = Number(amount) || 0;
    if (val <= 0) return alert("Inserisci un importo maggiore di 0 €.");
    if (!isOther) {
      const allocationResult = result.allocations.find((a) => a.id === allocationId);
      if (allocationResult && val > allocationResult.remaining + 0.005) {
        return alert(`Per ${allocationResult.name} restano da pagare ${euro(allocationResult.remaining)}.`);
      }
    }
    if (selectedFundResult && val > selectedFundResult.current + 0.005) {
      return alert(`Disponibilità insufficiente. Nel fondo ${selectedFund.name} hai ${euro(selectedFundResult.current)}, ma stai tentando di scalare ${euro(val)}.`);
    }
    updateMonth((m) => m.payments.push({ id: makeId(), date, allocationId, fundId, amount: val, note: note.trim() }));
    setAmount(""); setNote("");
  };

  const startEdit = (payment) => {
    setEditingId(payment.id);
    setEditDraft({
      date: payment.date,
      allocationId: payment.allocationId,
      fundId: payment.fundId,
      amount: payment.amount,
      note: payment.note || ""
    });
  };

  const saveEdit = () => {
    const old = data.payments.find((p) => p.id === editingId);
    if (!old || !editDraft) return;
    const val = Number(editDraft.amount) || 0;
    if (val <= 0) return alert("Inserisci un importo maggiore di 0 €.");
    const targetFund = result.funds.find((f) => f.id === editDraft.fundId);
    if (!targetFund) return alert("Scegli il fondo da cui scalare il pagamento.");

    const availableForEdit = targetFund.current + (old.fundId === editDraft.fundId ? Number(old.amount) || 0 : 0);
    if (val > availableForEdit + 0.005) {
      return alert(`Disponibilità insufficiente. Nel fondo ${targetFund.name} puoi usare al massimo ${euro(availableForEdit)} per questa modifica.`);
    }

    if (editDraft.allocationId !== OTHER_PAYMENT_ID) {
      const targetAllocation = result.allocations.find((a) => a.id === editDraft.allocationId);
      if (!targetAllocation) return alert("La spesa selezionata non esiste più.");
      const reusableOldAmount = old.allocationId === editDraft.allocationId ? Number(old.amount) || 0 : 0;
      const maxAllowed = targetAllocation.remaining + reusableOldAmount;
      if (val > maxAllowed + 0.005) {
        return alert(`Per ${targetAllocation.name} puoi registrare al massimo ${euro(maxAllowed)}.`);
      }
    }

    updateMonth((m) => {
      const p = m.payments.find((x) => x.id === editingId);
      if (p) Object.assign(p, { ...editDraft, amount: val, note: (editDraft.note || "").trim() });
    });
    setEditingId("");
    setEditDraft(null);
  };

  const cancelEdit = () => { setEditingId(""); setEditDraft(null); };

  const undoPayment = (id) => {
    const payment = result.payments.find((p) => p.id === id);
    if (!payment) return;
    if (!confirm(`Annullare il pagamento di ${euro(payment.amount)} per ${payment.allocationName}? L'importo tornerà disponibile nel fondo ${payment.fundName}.`)) return;
    updateMonth((m) => { m.payments = m.payments.filter((p) => p.id !== id); });
  };

  const filteredPayments = result.payments.filter((p) => {
    const fundOk = !filterFund || p.fundId === filterFund;
    const voiceOk = !filterVoice || p.allocationId === filterVoice;
    return fundOk && voiceOk;
  });

  return (
    <section className="panel payments-panel">
      <PanelHead icon={ReceiptText} title="3. Registra una spesa" subtitle="Qui trovi solo gli stanziamenti da scalare nel tempo, più ALTRO" />
      <div className="payment-form">
        <label><span>Data</span><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
        <label><span>Voce</span><select value={allocationId} onChange={(e) => setAllocationId(e.target.value)}><option value="">Scegli stanziamento</option>{spendableAllocations.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}<option value={OTHER_PAYMENT_ID}>ALTRO</option></select></label>
        <label><span>Importo</span><input type="number" step="0.01" min="0" placeholder="0,00 €" value={amount} onChange={(e) => setAmount(e.target.value)} /></label>
        <label><span>Nota</span><input placeholder={isOther ? "Es. Farmacia, regalo, parcheggio…" : "Facoltativa"} value={note} onChange={(e) => setNote(e.target.value)} /></label>
        <label><span>Scala da</span><select value={fundId} onChange={(e) => setFundId(e.target.value)}><option value="">Scegli fondo</option>{result.funds.map((f) => <option key={f.id} value={f.id}>{f.name} · {euro(f.current)} disponibili</option>)}</select></label>
        <button className="pay-btn" onClick={addPayment}><CheckCircle2 size={18} /> Registra spesa</button>
      </div>
      {spendableAllocations.length === 0 && (
        <div className="empty small-empty"><Info size={18} /><span>Non hai ancora voci di tipo “Stanziamento”. Le rate e le spese fisse si pagano direttamente nella sezione “Spese da coprire”. Puoi comunque usare ALTRO.</span></div>
      )}

      {result.payments.length === 0 ? <Empty text="Nessun pagamento registrato in questo mese." /> : (
        <>
          <div className="history-toolbar">
            <strong>Storico pagamenti</strong>
            <div className="history-filters">
              <select value={filterVoice} onChange={(e) => setFilterVoice(e.target.value)}>
                <option value="">Tutte le voci</option>
                <option value={OTHER_PAYMENT_ID}>ALTRO</option>
                {data.allocations.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <select value={filterFund} onChange={(e) => setFilterFund(e.target.value)}>
                <option value="">Tutti i fondi</option>
                {data.funds.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
              {(filterVoice || filterFund) && <button className="secondary-btn compact-btn" onClick={() => { setFilterVoice(""); setFilterFund(""); }}>Azzera filtri</button>}
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Data</th><th>Spesa</th><th>Fondo</th><th>Nota</th><th>Importo</th><th>Azioni</th></tr></thead>
              <tbody>
                {filteredPayments.map((p) => editingId === p.id ? (
                  <tr key={p.id} className="editing-row">
                    <td><input type="date" value={editDraft.date} onChange={(e) => setEditDraft((d) => ({ ...d, date: e.target.value }))} /></td>
                    <td><select value={editDraft.allocationId} onChange={(e) => setEditDraft((d) => ({ ...d, allocationId: e.target.value }))}><option value={OTHER_PAYMENT_ID}>ALTRO</option>{data.allocations.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></td>
                    <td><select value={editDraft.fundId} onChange={(e) => setEditDraft((d) => ({ ...d, fundId: e.target.value }))}>{result.funds.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select></td>
                    <td><input value={editDraft.note} onChange={(e) => setEditDraft((d) => ({ ...d, note: e.target.value }))} placeholder="Nota" /></td>
                    <td><input className="edit-money" type="number" min="0" step="0.01" value={editDraft.amount} onChange={(e) => setEditDraft((d) => ({ ...d, amount: e.target.value }))} /></td>
                    <td className="row-actions"><button className="pay-btn mini-action" onClick={saveEdit}>Salva</button><button className="secondary-btn mini-action" onClick={cancelEdit}>Annulla</button></td>
                  </tr>
                ) : (
                  <tr key={p.id}>
                    <td>{formatDate(p.date)}</td>
                    <td className="strong">{p.allocationName}</td>
                    <td>{p.fundName}</td>
                    <td>{p.note || "—"}</td>
                    <td className="money strong">{euro(p.amount)}</td>
                    <td className="row-actions">
                      <button className="icon-btn" onClick={() => startEdit(p)} title="Modifica pagamento"><Pencil size={16} /></button>
                      <button className="icon-btn warning-icon" onClick={() => undoPayment(p.id)} title="Annulla pagamento"><Undo2 size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredPayments.length === 0 && <div className="empty small-empty"><Info size={18} /><span>Nessun pagamento corrisponde ai filtri selezionati.</span></div>}
        </>
      )}
    </section>
  );
}

function MonthlyOverview({ result }) {
  const coherenceDiff = result.totalInitial - (result.totalCurrent + result.totalPaid);
  const coherent = Math.abs(coherenceDiff) <= 0.005;
  return (
    <section className="summary-card">
      <h2><Coins size={20} /> Situazione del mese</h2>
      <div className="summary-line"><span>Soldi inseriti</span><strong>{euro(result.totalInitial)}</strong></div>
      <div className="summary-line"><span>Destinati alle spese</span><strong>{euro(result.totalPlanned)}</strong></div>
      <div className="summary-line emphasis"><span>Ancora liberi da assegnare</span><strong>{euro(result.freeToAssign)}</strong></div>
      <div className="summary-line"><span>Pagamenti già effettuati</span><strong>{euro(result.totalPaid)}</strong></div>
      <div className="summary-line"><span>Spese previste ancora da pagare</span><strong>{euro(result.totalReserved)}</strong></div>
      <div className="summary-line"><span>Saldo reale attuale</span><strong>{euro(result.totalCurrent)}</strong></div>
      <div className={`coherence-box ${coherent ? "ok" : "error"}`}>
        {coherent ? <ShieldCheck size={18} /> : <AlertTriangle size={18} />}
        <span>{coherent ? "Controllo contabile: i saldi tornano." : `Attenzione: c'è una differenza contabile di ${euro(Math.abs(coherenceDiff))}.`}</span>
      </div>
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
  const hasPendingExpenses = result.totalReserved > 0.005;
  return (
    <section className="summary-card carry-card">
      <h2><ArrowRight size={20} /> Fine mese</h2>
      <p>Questo è quanto prevedi che resterà dopo aver coperto <strong>tutte le spese stanziate</strong> di {month}.</p>
      <div className="carry-value"><span>Residuo previsto a fine mese</span><strong>{euro(result.freeToAssign)}</strong></div>
      <div className="summary-line"><span>Saldo reale oggi</span><strong>{euro(result.totalCurrent)}</strong></div>
      <button className="primary-btn wide" onClick={carryToNextMonth} disabled={hasPendingExpenses}>
        {hasPendingExpenses ? `Prima completa le spese di ${month}` : `Porta i residui reali in ${next}`}
      </button>
      <small>
        {hasPendingExpenses
          ? `Hai ancora ${euro(result.totalReserved)} di spese previste da pagare. Il trasferimento si attiva quando sono tutte coperte.`
          : `A mese chiuso verranno trasferiti i saldi reali rimasti nei singoli fondi. Le voci di spesa saranno riportate nel nuovo mese con importo 0 €.`}
      </small>
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
      return { ...p, allocationName: p.allocationId === OTHER_PAYMENT_ID ? "ALTRO" : (allocation?.name || "Voce eliminata"), fundName: fund?.name || "—" };
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
