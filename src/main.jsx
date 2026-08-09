import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { createClient } from "@supabase/supabase-js";
import {
  Wallet, Plus, Trash2, Landmark, ReceiptText, PiggyBank,
  ArrowRight, CheckCircle2, CalendarDays, RotateCcw, Download,
  Coins, CircleDollarSign, Banknote, Layers3, Info, Pencil, Undo2, ShieldCheck, AlertTriangle,
  Home, ListPlus, History, Settings, Moon, Sun, BarChart3, Zap, ChevronRight
} from "lucide-react";
import "./style.css";

const STORAGE_KEY = "bilancio-famiglia-zero-based-v2";
const MONTH_KEY = "bilancio-famiglia-zero-based-month";
const YEAR_KEY = "bilancio-famiglia-zero-based-year";
const THEME_KEY = "bilancio-famiglia-theme";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = SUPABASE_URL && SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
// Riga separata dalla vecchia versione: evita di sovrascrivere lo storico legacy.
const CLOUD_ROW_MONTH = "APP_STATE_ZERO_V2";
const CLOUD_ROW_YEAR = 2026;

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

const emptyStore = () => ({ years: {}, closures: {} });

const closureKey = (year, month) => `${year}-${month}`;

function normalizeMonth(raw) {
  return {
    funds: Array.isArray(raw?.funds)
      ? raw.funds.map((f) => ({
          id: f.id || makeId(),
          name: f.name || "Fondo",
          amount: Number(f.amount) || 0,
          archived: Boolean(f.archived)
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
    const result = { years: {}, closures: saved.closures && typeof saved.closures === "object" ? saved.closures : {} };
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

function normalizeCloudStore(raw) {
  const result = { years: {}, closures: raw?.closures && typeof raw.closures === "object" ? raw.closures : {} };
  if (!raw?.years || typeof raw.years !== "object") return result;
  Object.entries(raw.years).forEach(([y, months]) => {
    result.years[y] = makeYear();
    MONTHS.forEach((m) => { result.years[y][m] = normalizeMonth(months?.[m]); });
  });
  return result;
}

function hasMeaningfulData(store) {
  return Object.values(store?.years || {}).some((months) =>
    MONTHS.some((m) => {
      const d = months?.[m];
      return (d?.funds?.length || 0) + (d?.allocations?.length || 0) + (d?.payments?.length || 0) > 0;
    })
  );
}

async function saveStoreToCloud(store, setCloudStatus) {
  try {
    setCloudStatus("Salvataggio cloud…");
    const payload = { mese: CLOUD_ROW_MONTH, anno: CLOUD_ROW_YEAR, dati: store, updated_at: new Date().toISOString() };
    const { data: existing, error: selectError } = await supabase
      .from("bilanci").select("id")
      .eq("mese", CLOUD_ROW_MONTH).eq("anno", CLOUD_ROW_YEAR)
      .limit(1).maybeSingle();
    if (selectError) throw selectError;
    const response = existing?.id
      ? await supabase.from("bilanci").update(payload).eq("id", existing.id)
      : await supabase.from("bilanci").insert(payload);
    if (response.error) throw response.error;
    setCloudStatus("Cloud attivo");
    return true;
  } catch (error) {
    console.error("Errore salvataggio Supabase:", error);
    setCloudStatus("Errore cloud");
    return false;
  }
}

function App() {
  const now = new Date();
  const [store, setStore] = useState(loadStore);
  const [cloudStatus, setCloudStatus] = useState(supabase ? "Connessione cloud…" : "Solo locale");
  const cloudReadyRef = useRef(false);
  const cloudFoundRef = useRef(false);
  const [month, setMonth] = useState(localStorage.getItem(MONTH_KEY) || MONTHS[now.getMonth()]);
  const [year, setYear] = useState(Number(localStorage.getItem(YEAR_KEY)) || now.getFullYear());
  const [theme, setTheme] = useState(() => localStorage.getItem(THEME_KEY) || "dark");

  const toggleTheme = () => {
    setTheme((current) => {
      const next = current === "dark" ? "light" : "dark";
      localStorage.setItem(THEME_KEY, next);
      return next;
    });
  };

  const data = getMonth(store, year, month);
  const result = useMemo(() => calculateMonth(data), [data]);
  const currentClosure = store.closures?.[closureKey(year, month)] || null;

  useEffect(() => {
    let cancelled = false;
    const loadCloud = async () => {
      if (!supabase) { cloudReadyRef.current = true; return; }
      try {
        const { data: row, error } = await supabase
          .from("bilanci").select("dati")
          .eq("mese", CLOUD_ROW_MONTH).eq("anno", CLOUD_ROW_YEAR)
          .limit(1).maybeSingle();
        if (error) throw error;
        if (cancelled) return;
        if (row?.dati?.years) {
          cloudFoundRef.current = true;
          const cloudStore = normalizeCloudStore(row.dati);
          setStore(cloudStore);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(cloudStore));
        }
        cloudReadyRef.current = true;
        setCloudStatus("Cloud attivo");
      } catch (error) {
        console.error("Errore caricamento Supabase:", error);
        cloudReadyRef.current = true;
        setCloudStatus("Errore cloud");
      }
    };
    loadCloud();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    if (!supabase || !cloudReadyRef.current) return;
    // Se il cloud V2 non esiste ancora, un dispositivo vuoto non deve inizializzarlo.
    if (!cloudFoundRef.current && !hasMeaningfulData(store)) return;
    const timer = setTimeout(async () => {
      const ok = await saveStoreToCloud(store, setCloudStatus);
      if (ok) cloudFoundRef.current = true;
    }, 650);
    return () => clearTimeout(timer);
  }, [store]);

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
    const key = closureKey(year, month);
    if (store.closures?.[key]) {
      alert(`${month} ${year} risulta già chiuso. Se vuoi rifare la chiusura, usa prima “Annulla chiusura”.`);
      return;
    }

    const currentIndex = MONTHS.indexOf(month);
    const nextMonth = MONTHS[(currentIndex + 1) % 12];
    const nextYear = currentIndex === 11 ? year + 1 : year;
    const balances = result.funds.filter((f) => f.current > 0.005);
    const unpaidOneOff = result.allocations.filter((a) => a.type !== "Stanziamento" && a.remaining > 0.005);
    const warning = unpaidOneOff.length
      ? `\n\nATTENZIONE: risultano ancora ${unpaidOneOff.length} rate/spese fisse non completamente pagate per ${euro(unpaidOneOff.reduce((sum, a) => sum + a.remaining, 0))}. La chiusura è comunque consentita.`
      : "";

    const confirmed = confirm(
      `CONFERMA CHIUSURA ${month.toUpperCase()} ${year}\n\n` +
      `Saldo reale da trasferire: ${euro(result.totalCurrent)}\n` +
      `Destinazione: ${nextMonth} ${nextYear}\n\n` +
      `Verranno trasferiti solo i saldi reali rimasti nei fondi. Le voci di spesa saranno riportate nel nuovo mese con importo 0 €.\n\n` +
      `Potrai annullare questa chiusura dal pannello Fine mese.${warning}`
    );
    if (!confirmed) return;

    setStore((prev) => {
      const next = structuredClone(prev);
      if (!next.closures) next.closures = {};
      const y = String(nextYear);
      const targetYearExisted = Boolean(next.years[y]);
      if (!next.years[y]) next.years[y] = makeYear();

      // Snapshot del mese di destinazione PRIMA della chiusura: serve per annullare.
      const targetBefore = normalizeMonth(next.years[y][nextMonth]);
      const target = normalizeMonth(next.years[y][nextMonth]);

      balances.forEach((f) => {
        const existing = target.funds.find((x) => x.name.trim().toLowerCase() === f.name.trim().toLowerCase());
        if (existing) existing.amount += f.current;
        else target.funds.push({ id: makeId(), name: f.name, amount: f.current });
      });

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
      next.closures[key] = {
        sourceYear: year,
        sourceMonth: month,
        targetYear: nextYear,
        targetMonth: nextMonth,
        targetBefore,
        targetYearExisted,
        transferredAmount: result.totalCurrent,
        closedAt: new Date().toISOString()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
    alert(`${month} ${year} è stato chiuso. ${nextMonth} ${nextYear} è pronto. Se hai chiuso per errore puoi usare “Annulla chiusura”.`);
  };

  const undoMonthClosure = () => {
    const key = closureKey(year, month);
    const closure = store.closures?.[key];
    if (!closure) return alert(`${month} ${year} non risulta chiuso.`);

    const confirmed = confirm(
      `ANNULLARE LA CHIUSURA DI ${month.toUpperCase()} ${year}?\n\n` +
      `Il mese ${closure.targetMonth} ${closure.targetYear} verrà riportato allo stato che aveva prima della chiusura. ` +
      `Eventuali modifiche fatte in quel mese dopo la chiusura verranno perse.`
    );
    if (!confirmed) return;

    setStore((prev) => {
      const next = structuredClone(prev);
      if (!next.closures?.[key]) return prev;
      const y = String(closure.targetYear);
      if (!next.years[y]) next.years[y] = makeYear();
      next.years[y][closure.targetMonth] = normalizeMonth(closure.targetBefore);
      delete next.closures[key];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
    alert(`Chiusura di ${month} ${year} annullata. ${closure.targetMonth} ${closure.targetYear} è stato ripristinato allo stato precedente.`);
  };

  return (
    <div className={`app-shell ultra-shell theme-${theme}`}>
      <aside className="app-sidebar">
        <div className="sidebar-brand"><div className="sidebar-logo"><PiggyBank size={28}/></div><div><strong>BILANCIO</strong><span>FAMIGLIA</span></div></div>
        <nav className="sidebar-nav">
          <a className="active" href="#panoramica"><Home size={19}/> Panoramica</a>
          <a href="#fondi"><Wallet size={19}/> Fondi</a>
          <a href="#registra"><Pencil size={19}/> Registra spesa</a>
          <a href="#spese"><Landmark size={19}/> Spese da coprire</a>
          <a href="#storico"><History size={19}/> Storico pagamenti</a>
          <a href="#situazione"><BarChart3 size={19}/> Situazione del mese</a>
          <a href="#fine-mese"><CalendarDays size={19}/> Fine mese</a>
          <a href="#impostazioni"><Settings size={19}/> Impostazioni</a>
        </nav>
        <div className="sidebar-bottom"><button type="button" className="theme-pill theme-toggle" onClick={toggleTheme} aria-label={theme === "dark" ? "Attiva tema chiaro" : "Attiva tema scuro"}>{theme === "dark" ? <Moon size={17}/> : <Sun size={17}/>}<span>{theme === "dark" ? "Tema scuro" : "Tema chiaro"}</span><span className={`real-switch ${theme === "light" ? "light" : "dark"}`}><i /></span></button><div className="month-mini"><CalendarDays size={18}/><div><strong>{month} {year}</strong><span>Bilancio mensile</span></div></div></div>
      </aside>

      <main className="main-workspace" id="panoramica">
        <Header month={month} setMonth={setMonth} year={year} setYear={setYear} resetMonth={resetMonth} cloudStatus={cloudStatus} />
        <div id="fondi" className="dashboard-title"><span>PANORAMICA DEL MESE</span><i></i></div>
        <section className="kpi-strip" aria-label="Riepilogo del mese">
          <Metric icon={Wallet} label="Disponibile adesso" value={euro(result.totalCurrent)} tone="green" />
          <Metric icon={ReceiptText} label="Già pagato" value={euro(result.totalPaid)} tone="blue" />
          <Metric icon={Layers3} label="Già impegnato" value={euro(result.totalPlanned)} tone="orange" />
          <Metric icon={CircleDollarSign} label="Libero da assegnare" value={euro(result.freeToAssign)} tone={result.freeToAssign < 0 ? "red" : "purple"} />
        </section>

        <div className="dashboard-title funds-title"><span>FONDI DISPONIBILI</span><i></i></div>
        <section className="funds-dashboard">
          <div className="funds-center-wrap"><FundsPanel data={data} result={result} updateMonth={updateMonth} /></div>
        </section>

        <div id="registra"><PaymentsPanel data={data} result={result} updateMonth={updateMonth} /></div>
        <div id="spese" className="allocations-full-wrap"><AllocationsPanel data={data} result={result} updateMonth={updateMonth} /></div>
        <section className="bottom-grid" id="situazione">
          <MonthlyOverview result={result} />
          <div id="fine-mese"><CarryPanel month={month} year={year} result={result} closure={currentClosure} carryToNextMonth={carryToNextMonth} undoMonthClosure={undoMonthClosure} /></div>
        </section>
        <footer className="footer-tools" id="impostazioni"><button className="secondary-btn" onClick={() => downloadBackup(store)}><Download size={17} /> Scarica backup JSON</button><span><ShieldCheck size={16}/> Dati sincronizzati nel cloud e salvati anche sul dispositivo.</span></footer>
      </main>

      <aside className="right-rail">
        <section className="rail-card situation-card"><h3>SITUAZIONE DEL MESE</h3><div className="coverage-ring" style={{'--pct': `${Math.max(0, Math.min(100, result.totalPlanned ? (result.totalPaid/result.totalPlanned)*100 : 0))}%`}}><div><strong>{result.totalPlanned ? Math.round((result.totalPaid/result.totalPlanned)*100) : 0}%</strong><span>copertura</span></div></div><div className="rail-stat"><span>Soldi iniziali</span><strong>{euro(result.totalInitial)}</strong></div><div className="rail-stat"><span>Pagamenti effettuati</span><strong className="amber">{euro(result.totalPaid)}</strong></div><div className="rail-stat"><span>Saldo attuale</span><strong className="emerald">{euro(result.totalCurrent)}</strong></div></section>
        <section className="rail-card"><h3><Zap size={18}/> AZIONI RAPIDE</h3><a href="#registra"><span className="quick-icon green"><Pencil size={18}/></span><div><strong>Registra una spesa</strong><small>Scala da stanziamenti</small></div><ChevronRight size={18}/></a><a href="#spese"><span className="quick-icon orange"><Landmark size={18}/></span><div><strong>Paga una rata</strong><small>Da fondi disponibili</small></div><ChevronRight size={18}/></a><a href="#storico"><span className="quick-icon blue"><History size={18}/></span><div><strong>Vai allo storico</strong><small>Vedi tutti i pagamenti</small></div><ChevronRight size={18}/></a></section>
      </aside>
      <nav className="mobile-bottom-nav" aria-label="Navigazione mobile">
        <a href="#panoramica"><Home size={20}/><span>Home</span></a>
        <a className="mobile-primary" href="#registra"><Plus size={24}/><span>Spesa</span></a>
        <a href="#spese"><Landmark size={20}/><span>Spese</span></a>
        <a href="#storico"><History size={20}/><span>Storico</span></a>
        <a href="#situazione"><BarChart3 size={20}/><span>Riepilogo</span></a>
      </nav>
    </div>
  );
}

function Header({ month, setMonth, year, setYear, resetMonth, cloudStatus }) {
  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-icon"><PiggyBank size={32} /></div>
        <div>
          <h1>Bilancio Famiglia</h1>
          <p>Assegna ogni euro prima di spenderlo</p>
        </div>
      </div>
      <div className="period-controls"><div className={`cloud-badge ${cloudStatus === "Cloud attivo" ? "ok" : cloudStatus === "Errore cloud" ? "error" : ""}`}><ShieldCheck size={15}/>{cloudStatus}</div>
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
    const fund = result.funds.find((f) => f.id === id);
    if (!fund) return;

    const linkedPayments = data.payments.filter((p) => p.fundId === id);
    const used = linkedPayments.length > 0;
    const sameNameFunds = data.funds.filter(
      (f) => f.id !== id && !f.archived && f.name.trim().toLowerCase() === fund.name.trim().toLowerCase()
    );
    const isDuplicate = sameNameFunds.length > 0;

    // Un fondo mai usato può essere eliminato SEMPRE, anche se contiene ancora denaro:
    // serve anche a correggere fondi duplicati creati per errore.
    if (!used) {
      const duplicateText = isDuplicate ? "

È presente un altro fondo con lo stesso nome: questo sembra un duplicato." : "";
      const balanceText = fund.current > 0.005
        ? `

Eliminandolo verranno rimossi anche ${euro(fund.current)} dal totale dei fondi.`
        : "";
      if (!confirm(`Eliminare il fondo ${fund.name}?${duplicateText}${balanceText}`)) return;
      updateMonth((m) => {
        m.funds = m.funds.filter((f) => f.id !== id);
      });
      return;
    }

    // Un fondo usato e completamente esaurito può essere tolto dalla dashboard,
    // ma rimane nei dati per conservare lo storico e i conti.
    if (fund.current <= 0.005) {
      if (!confirm(`Il fondo ${fund.name} è esaurito e contiene ${linkedPayments.length} movimento/i nello storico.

Rimuoverlo dalla dashboard mantenendo intatti i pagamenti?`)) return;
      updateMonth((m) => {
        const x = m.funds.find((f) => f.id === id);
        if (x) x.archived = true;
      });
      return;
    }

    alert(`Non puoi eliminare ${fund.name} perché è già stato usato e contiene ancora ${euro(fund.current)}. Puoi annullare/spostare i pagamenti collegati oppure aspettare che il fondo arrivi a 0 €.`);
  };

  return (
    <section className="panel">
      <PanelHead icon={Wallet} title="Fondi disponibili" subtitle="Inserisci da dove arrivano i soldi del mese" />
      <div className="entry-row fund-entry">
        <input placeholder="Es. Giulia, Extra, Residuo banca" value={name} onChange={(e) => setName(e.target.value)} />
        <input type="number" step="0.01" min="0" placeholder="Importo €" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <button className="primary-btn" onClick={addFund}><Plus size={17} /> Aggiungi</button>
      </div>

      {data.funds.length === 0 ? <Empty text="Nessun fondo inserito. Tutto parte da 0." /> : (
        <>
          <div className="fund-card-grid">
            {result.funds.filter((f) => !f.archived).map((f, index) => {
              const pct = f.amount > 0 ? Math.max(0, Math.min(100, (f.current / f.amount) * 100)) : 0;
              const share = result.totalCurrent > 0 ? Math.max(0, (f.current / result.totalCurrent) * 100) : 0;
              const exhausted = f.current <= 0.005;
              return (
                <article className={`fund-card fund-tone-${index % 4} ${exhausted ? "fund-exhausted" : ""}`} key={f.id}>
                  <div className="fund-card-top">
                    <div className="fund-card-icon"><Wallet size={20}/></div>
                    <button className="icon-btn fund-delete" onClick={() => removeFund(f.id)} title="Elimina"><Trash2 size={15}/></button>
                  </div>
                  <input className="fund-card-name" value={f.name} onChange={(e) => updateMonth((m) => { const x = m.funds.find((z) => z.id === f.id); if (x) x.name = e.target.value; })} />
                  <div className={`fund-card-balance ${f.current < -0.005 ? "negative" : ""}`}>{euro(f.current)}</div>
                  <div className="fund-caption-row"><span className="fund-card-caption">disponibili ora</span>{exhausted ? <span className="fund-empty-badge">ESAURITO</span> : <span className="fund-share-badge">{share.toFixed(0)}% del saldo</span>}</div>
                  <div className="fund-progress" title={`${pct.toFixed(0)}% del fondo iniziale ancora disponibile`}><i style={{width:`${pct}%`}} /></div>
                  <div className="fund-card-meta"><span>Inizio <MoneyInput value={f.amount} onChange={(v) => updateMonth((m) => { const x = m.funds.find((z) => z.id === f.id); if (x) x.amount = v; })} /></span><span>Pagato <strong>{euro(f.paid)}</strong></span></div>
                </article>
              );
            })}
          </div>
          <div className="fund-total-strip"><span>Totale fondi disponibili</span><strong>{euro(result.totalCurrent)}</strong><small>su {euro(result.totalInitial)} inseriti a inizio mese</small></div>
        </>
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
      <PanelHead icon={Landmark} title="Spese da coprire" subtitle="Stanzia gli importi ora; sceglierai il fondo solo quando paghi" />
      <div className="allocation-form">
        <input placeholder="Es. Mutuo, Alimentari, Benzina…" value={name} onChange={(e) => setName(e.target.value)} />
        <select value={type} onChange={(e) => setType(e.target.value)}>{TYPES.map((t) => <option key={t}>{t}</option>)}</select>
        <input type="number" step="0.01" min="0" placeholder="Stanziato €" value={planned} onChange={(e) => setPlanned(e.target.value)} />
        <button className="primary-btn" onClick={addAllocation}><Plus size={17} /> Aggiungi</button>
      </div>

      {data.allocations.length === 0 ? <Empty text="Nessuna spesa prevista. Inseriscile tu mese per mese." /> : (
        <div className="allocation-list">
          {result.allocations.map((a) => (
            <article className={`allocation-card ${a.remaining <= 0.005 ? "is-paid" : ""} ${a.type === "Stanziamento" ? "is-budget" : "is-fixed"}`} key={a.id}>
              <div className="allocation-top">
                <div className="allocation-name">
                  <div className="allocation-title-row"><input className="bare-input" value={a.name} onChange={(e) => updateMonth((m) => { const x = m.allocations.find((z) => z.id === a.id); if (x) x.name = e.target.value; })} /><span className={`type-badge ${a.type === "Stanziamento" ? "budget" : a.type === "Rata" ? "installment" : a.type === "Altro" ? "other" : "fixed"}`}>{a.type === "Stanziamento" ? "STANZIAMENTO" : a.type === "Rata" ? "RATA" : a.type === "Altro" ? "ALTRO" : "FISSA"}</span></div>
                  <select className="mini-select type-select" value={a.type} onChange={(e) => updateMonth((m) => { const x = m.allocations.find((z) => z.id === a.id); if (x) x.type = e.target.value; })}>{TYPES.map((t) => <option key={t}>{t}</option>)}</select>
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
                    <label className="compact-fund"><span>Scala da entrata/fondo</span><select value={quickFunds[a.id] || ""} onChange={(e) => setQuickFunds((prev) => ({ ...prev, [a.id]: e.target.value }))}><option value="">Scegli da dove scalare</option>{result.funds.filter((f) => !f.archived).map((f) => <option key={f.id} value={f.id}>{f.name} · {euro(f.current)} disponibili</option>)}</select></label>
                    <label className="compact-amount"><span>Importo</span><input type="number" step="0.01" min="0" max={a.remaining} placeholder={a.remaining > 0 ? euro(a.remaining) : "0,00 €"} value={quickAmounts[a.id] ?? ""} onChange={(e) => setQuickAmounts((prev) => ({ ...prev, [a.id]: e.target.value }))} /></label>
                    <button className="pay-btn quick-pay-btn" onClick={() => quickPay(a)}><CheckCircle2 size={17} /> Scala / Paga</button>
                  </>
                )}
              </div>
              {a.planned > 0 && <div className="allocation-progress-wrap"><div className="progress compact-progress"><span style={{ width: `${Math.min(100, (a.paid / a.planned) * 100)}%` }} /></div><small>{a.type === "Stanziamento" ? `${Math.round(Math.min(100, (a.paid / a.planned) * 100))}% utilizzato` : `${Math.round(Math.min(100, (a.paid / a.planned) * 100))}% pagato`}</small></div>}
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
    // Gli stanziamenti sono budget previsionali: la spesa reale può superarli.
    // L'unico limite reale è la disponibilità del fondo scelto.
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
      // Anche in modifica uno stanziamento può essere superato: è un budget, non un tetto.
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
      <PanelHead icon={ReceiptText} title="Registra una spesa" subtitle="Qui trovi solo gli stanziamenti da scalare nel tempo, più ALTRO" />
      <div className="payment-form">
        <label><span>Data</span><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
        <label><span>Voce</span><select value={allocationId} onChange={(e) => setAllocationId(e.target.value)}><option value="">Scegli stanziamento</option>{spendableAllocations.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}<option value={OTHER_PAYMENT_ID}>ALTRO</option></select></label>
        <label><span>Importo</span><input type="number" step="0.01" min="0" placeholder="0,00 €" value={amount} onChange={(e) => setAmount(e.target.value)} /></label>
        <label><span>Nota</span><input placeholder={isOther ? "Es. Farmacia, regalo, parcheggio…" : "Facoltativa"} value={note} onChange={(e) => setNote(e.target.value)} /></label>
        <label><span>Scala da</span><select value={fundId} onChange={(e) => setFundId(e.target.value)}><option value="">Scegli fondo</option>{result.funds.filter((f) => !f.archived).map((f) => <option key={f.id} value={f.id}>{f.name} · {euro(f.current)} disponibili</option>)}</select></label>
        <button className="pay-btn" onClick={addPayment}><CheckCircle2 size={18} /> Registra spesa</button>
      </div>
      {spendableAllocations.length === 0 && (
        <div className="empty small-empty"><Info size={18} /><span>Non hai ancora voci di tipo “Stanziamento”. Le rate e le spese fisse si pagano direttamente nella sezione “Spese da coprire”. Puoi comunque usare ALTRO.</span></div>
      )}

      {result.payments.length === 0 ? <Empty text="Nessun pagamento registrato in questo mese." /> : (
        <>
          <div className="history-toolbar" id="storico">
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
                  <tr key={p.id} className={p.id === filteredPayments[0]?.id ? "latest-payment" : ""}>
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
  const base = Math.max(result.totalInitial, result.totalPaid + result.totalReserved + Math.max(0, result.freeToAssign), 1);
  const paidPct = Math.max(0, Math.min(100, (result.totalPaid / base) * 100));
  const reservedPct = Math.max(0, Math.min(100 - paidPct, (result.totalReserved / base) * 100));
  return (
    <section className="summary-card overview-premium">
      <div className="overview-head"><div><h2><Coins size={20} /> Situazione del mese</h2><p>Una lettura immediata di ciò che hai già pagato, ciò che resta da coprire e quello che è ancora libero.</p></div><div className="month-donut" style={{'--paid': `${paidPct}%`, '--reserved': `${paidPct + reservedPct}%`}}><div><strong>{euro(result.freeToAssign)}</strong><span>liberi</span></div></div></div>
      <div className="donut-legend"><span><i className="paid-dot"/>Pagato <strong>{euro(result.totalPaid)}</strong></span><span><i className="reserved-dot"/>Da coprire <strong>{euro(result.totalReserved)}</strong></span><span><i className="free-dot"/>Libero <strong>{euro(result.freeToAssign)}</strong></span></div>
      <div className="overview-kpis"><div><span>Soldi inseriti</span><strong>{euro(result.totalInitial)}</strong></div><div><span>Destinati alle spese</span><strong>{euro(result.totalPlanned)}</strong></div><div><span>Saldo reale attuale</span><strong>{euro(result.totalCurrent)}</strong></div></div>
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

function CarryPanel({ month, year, result, closure, carryToNextMonth, undoMonthClosure }) {
  const next = MONTHS[(MONTHS.indexOf(month) + 1) % 12];
  const plannedAllocations = result.allocations.filter((a) => a.type === "Stanziamento");
  const oneOffPending = result.allocations.filter((a) => a.type !== "Stanziamento" && a.remaining > 0.005);
  const budgetPlanned = plannedAllocations.reduce((sum, a) => sum + (Number(a.planned) || 0), 0);
  const budgetSpent = plannedAllocations.reduce((sum, a) => sum + (Number(a.paid) || 0), 0);
  const budgetDiff = budgetPlanned - budgetSpent;
  const oneOffPendingTotal = oneOffPending.reduce((sum, a) => sum + a.remaining, 0);

  if (closure) {
    return (
      <section className="summary-card carry-card month-closed-card">
        <div className="carry-head">
          <div>
            <h2><CheckCircle2 size={20} /> {month} {year} chiuso</h2>
            <p>I residui sono stati trasferiti a <strong>{closure.targetMonth} {closure.targetYear}</strong>.</p>
          </div>
          <span className="closed-badge"><ShieldCheck size={16}/> Mese chiuso</span>
        </div>
        <div className="closed-summary">
          <div><span>Trasferito alla chiusura</span><strong>{euro(closure.transferredAmount)}</strong></div>
          <div><span>Chiuso il</span><strong>{closure.closedAt ? new Date(closure.closedAt).toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" }) : "—"}</strong></div>
        </div>
        <div className="undo-close-box">
          <Undo2 size={19}/>
          <div><strong>Hai chiuso il mese per errore?</strong><span>Puoi ripristinare il mese successivo esattamente allo stato precedente alla chiusura.</span></div>
        </div>
        <button className="secondary-btn wide undo-close-btn" onClick={undoMonthClosure}>
          <Undo2 size={18}/> Annulla chiusura di {month}
        </button>
        <small className="carry-note warning-note">L’annullamento ripristina {closure.targetMonth} allo stato precedente: eventuali modifiche fatte lì dopo la chiusura verranno eliminate.</small>
      </section>
    );
  }

  return (
    <section className="summary-card carry-card">
      <div className="carry-head">
        <div>
          <h2><ArrowRight size={20} /> Fine mese</h2>
          <p>Puoi chiudere {month} anche se le spese reali sono diverse dagli stanziamenti.</p>
        </div>
        <span className="close-ready"><CheckCircle2 size={16}/> Chiusura disponibile</span>
      </div>

      <div className="closing-balance">
        <span>Saldo reale da portare in {next}</span>
        <strong>{euro(result.totalCurrent)}</strong>
        <small>Somma dei saldi realmente rimasti nei tuoi fondi.</small>
      </div>

      <div className="closing-grid">
        <div><span>Stanziamenti previsti</span><strong>{euro(budgetPlanned)}</strong></div>
        <div><span>Spese reali su stanziamenti</span><strong>{euro(budgetSpent)}</strong></div>
        <div className={budgetDiff >= 0 ? "positive" : "negative"}>
          <span>{budgetDiff >= 0 ? "Risparmiato vs budget" : "Oltre il budget"}</span>
          <strong>{euro(Math.abs(budgetDiff))}</strong>
        </div>
      </div>

      {oneOffPending.length > 0 && (
        <div className="closing-warning">
          <AlertTriangle size={18}/>
          <div>
            <strong>Hai ancora {euro(oneOffPendingTotal)} di rate/spese fisse non pagate.</strong>
            <span>{oneOffPending.map((a) => `${a.name} ${euro(a.remaining)}`).join(" · ")}. Questo non blocca la chiusura.</span>
          </div>
        </div>
      )}

      <button className="primary-btn wide close-month-btn" onClick={carryToNextMonth}>
        <CheckCircle2 size={18}/> Chiudi {month} e prepara {next}
      </button>
      <small className="carry-note">
        Nel nuovo mese vengono trasferiti i <strong>saldi reali dei fondi</strong>. Le voci di spesa restano disponibili ma ripartono da <strong>0 €</strong>. La chiusura potrà essere annullata se effettuata per errore.
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
