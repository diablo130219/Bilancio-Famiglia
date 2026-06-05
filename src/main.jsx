import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { createClient } from "@supabase/supabase-js";
import {
  PiggyBank, Wallet, ShoppingCart, ReceiptText, NotebookPen, Target,
  CheckCircle2, Trash2, Plus, Heart, Coffee, Landmark, Briefcase,
  Users, Baby, Home, HandCoins, Star, Fuel, Gift, Info, AlertTriangle,
  RotateCcw, Download, BarChart3, ShieldCheck, DatabaseZap, PieChart, CalendarCheck, TrendingUp, Sparkles, Trophy, Banknote, TrendingDown, CircleDollarSign
} from "lucide-react";
import "./style.css";

const STORAGE_KEY = "bilancio-famiglia-react-v2";
const MONTH_KEY = "bilancio-famiglia-month-v2";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = SUPABASE_URL && SUPABASE_ANON_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;
const CLOUD_ROW_MONTH = "APP_STATE";
const CLOUD_ROW_YEAR = 2026;


const MONTHS = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"
];

const FUNDS = [
  { key: "Residuo banca", icon: Landmark },
  { key: "Stipendio", icon: Briefcase },
  { key: "Mantenimento", icon: Users },
  { key: "Assegno unico", icon: Baby },
  { key: "Giulia", icon: Heart },
  { key: "Casa", icon: Home },
  { key: "Tasca", icon: HandCoins },
  { key: "Extra", icon: Star }
];

const CATEGORIES = [
  { key: "Alimenti + prodotti casa", icon: ShoppingCart },
  { key: "Benzina", icon: Fuel },
  { key: "Paghetta Angelo", icon: Baby },
  { key: "Sfizi", icon: Gift },
  { key: "Deposito", icon: Wallet },
  { key: "Altro variabile", icon: Star }
];

const FIXED_ITEMS = [
  "Findomestic", "Nintendo + Scopa elettrica", "Netflix", "Tim Vision",
  "Wind Fisso", "Mutuo", "Garage", "PS Store", "Wind Mobile",
  "Enel", "Gas", "Gori", "Altro finanziamento", "Altro abbonamento"
];

const euro = (value) =>
  (Number(value) || 0).toLocaleString("it-IT", { style: "currency", currency: "EUR" });

const emptyMonth = () => ({
  year: 2026,
  funds: Object.fromEntries(FUNDS.map(({ key }) => [key, 0])),
  budgets: Object.fromEntries(CATEGORIES.map(({ key }) => [key, 0])),
  quick: Object.fromEntries(CATEGORIES.map(({ key }) => [key, { amount: 0, source: "" }])),
  movements: [],
  fixed: Object.fromEntries(FIXED_ITEMS.map((name) => [name, { amount: 0, source: "", paid: "No" }])),
  goals: [
    { id: makeId(), name: "Obiettivo risparmio", target: 0, current: 0 }
  ]
});

const initialState = () => Object.fromEntries(MONTHS.map((m) => [m, emptyMonth()]));

const makeId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const normalizeMonth = (monthData) => {
  const base = emptyMonth();
  return {
    ...base,
    ...monthData,
    funds: { ...base.funds, ...(monthData?.funds || {}) },
    budgets: { ...base.budgets, ...(monthData?.budgets || {}) },
    quick: { ...base.quick, ...(monthData?.quick || {}) },
    movements: (monthData?.movements || []).map((item) => ({
      id: item.id || makeId(),
      date: item.date || "",
      category: item.category || CATEGORIES[0].key,
      amount: Number(item.amount) || 0,
      source: item.source || "",
      note: item.note || ""
    })),
    fixed: { ...base.fixed, ...(monthData?.fixed || {}) },
    goals: (monthData?.goals || base.goals).map((goal) => ({
      id: goal.id || makeId(),
      name: goal.name || "Obiettivo risparmio",
      target: Number(goal.target) || 0,
      current: Number(goal.current) || 0
    }))
  };
};

const normalizeState = (saved) => {
  const base = initialState();
  MONTHS.forEach((m) => {
    base[m] = normalizeMonth(saved?.[m]);
  });
  return base;
};

const loadState = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return normalizeState(saved);
  } catch {
    return initialState();
  }
};

function App() {
  const [saveStatus, setSaveStatus] = useState("Pronto");
  const [state, setState] = useState(loadState);
  const [month, setMonth] = useState(localStorage.getItem(MONTH_KEY) || "Giugno");
  const [cloudStatus, setCloudStatus] = useState(supabase ? "Connessione cloud..." : "Solo locale");
  const cloudReadyRef = useRef(false);
  const data = state[month];

  const saveLocal = (next, selectedMonth = month) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    localStorage.setItem(MONTH_KEY, selectedMonth);
  };

  useEffect(() => {
    let cancelled = false;

    const loadCloud = async () => {
      if (!supabase) {
        cloudReadyRef.current = true;
        return;
      }

      try {
        const { data: row, error } = await supabase
          .from("bilanci")
          .select("dati")
          .eq("mese", CLOUD_ROW_MONTH)
          .eq("anno", CLOUD_ROW_YEAR)
          .limit(1)
          .maybeSingle();

        if (error) throw error;

        if (!cancelled && row?.dati) {
          const cloudState = normalizeState(row.dati);
          setState(cloudState);
          saveLocal(cloudState);
        }

        if (!cancelled) {
          cloudReadyRef.current = true;
          setCloudStatus("Cloud attivo");
        }
      } catch (error) {
        console.error("Errore caricamento Supabase:", error);
        if (!cancelled) {
          cloudReadyRef.current = true;
          setCloudStatus("Errore cloud");
        }
      }
    };

    loadCloud();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    saveLocal(state, month);

    if (!supabase || !cloudReadyRef.current) return;

    const timeout = setTimeout(() => {
      saveStateToCloud(state, setCloudStatus);
    }, 650);

    return () => clearTimeout(timeout);
  }, [state, month]);

  const updateMonth = (updater) => {
    setState((previous) => {
      const next = structuredClone(previous);
      updater(next[month]);
      saveLocal(next);
      return next;
    });
  };

  const switchMonth = (value) => {
    setMonth(value);
    localStorage.setItem(MONTH_KEY, value);
  };

  const resetCurrentMonth = () => {
    if (!confirm(`Vuoi azzerare tutti i dati di ${month}?`)) return;
    setState((previous) => {
      const next = structuredClone(previous);
      next[month] = emptyMonth();
      saveLocal(next);
      return next;
    });
  };

  const result = useMemo(() => calculateMonth(data), [data]);

  return (
    <div className="app-shell">
      <Header
        month={month}
        setMonth={switchMonth}
        year={data.year}
        updateYear={(year) => updateMonth((d) => (d.year = year))}
        resetCurrentMonth={resetCurrentMonth}
        cloudStatus={cloudStatus}
      />

      <CloudToolsPanel state={state} result={result} />
      <ManagerDashboard result={result} data={data} month={month} />

      <main className="dashboard-grid">
        <FundsCard data={data} result={result} updateMonth={updateMonth} />
        <BudgetCard data={data} result={result} updateMonth={updateMonth} />
        <SummaryPanel result={result} />

        <FixedCard data={data} result={result} updateMonth={updateMonth} />
        <GuideCard />
        <MovementsCard data={data} updateMonth={updateMonth} />
        <InsightsPanel data={data} result={result} />
        <GoalsPanel data={data} updateMonth={updateMonth} />
        <CalendarPanel data={data} />
        <FinancialCoachPanel result={result} />
        <AnnualMiniPanel state={state} />
      </main>
    </div>
  );
}

function Header({ month, setMonth, year, updateYear, resetCurrentMonth, cloudStatus }) {
  return (
    <header className="top-hero">
      <section className="brand-block">
        <div className="decor-leaf left">❧</div>
        <h1>Bilancio Mensile <Heart size={34} strokeWidth={2.2} /></h1>
        <p>Parti da zero ogni mese, inserisci entrate e uscite reali</p>
      </section>

      <section className="period-controls">
        <div className="period-pill">
          <span>MESE</span>
          <select value={month} onChange={(event) => setMonth(event.target.value)}>
            {MONTHS.map((item) => <option key={item}>{item}</option>)}
          </select>
        </div>
        <div className="period-pill">
          <span>ANNO</span>
          <input type="number" min="2024" max="2035" value={year} onChange={(event) => updateYear(Number(event.target.value) || 2026)} />
        </div>
      </section>

      <section className="coffee-card"><Coffee size={56} /></section>

      <section className="sticky-note">
        Piccoli passi<br />ogni giorno<br />portano a grandi<br />risultati ♡
      </section>

      <div className={`cloud-badge ${cloudStatus === "Cloud attivo" ? "ok" : cloudStatus === "Errore cloud" ? "error" : "local"}`}>
        {cloudStatus}
      </div>

      <button className="reset-month" onClick={resetCurrentMonth}>
        <RotateCcw size={17} /> Azzera mese
      </button>
    </header>
  );
}




function CloudToolsPanel({ state, result }) {
  const annual = calculateAnnualStats(state);
  const monthlyOut = (result.totalBudgetSpent || 0) + (result.fixedPaid || 0);
  const plannedOut = (result.totalBudget || 0) + (result.fixedTotal || 0);
  const savingRate = result.totalInitial > 0 ? Math.round((result.freeMoney / result.totalInitial) * 100) : 0;
  const active = annual.rows.filter((row) => row.initial !== 0 || row.spent !== 0 || row.free !== 0);

  return (
    <section className="control-center">
      <div className="control-main">
        <div className="control-title">
          <CircleDollarSign size={24} />
          <div>
            <span>Centro controllo mese</span>
            <strong>{euro(result.freeMoney)}</strong>
            <small>Disponibilità reale dopo impegni futuri</small>
          </div>
        </div>

        <div className="control-grid">
          <div>
            <span>Entrate mese</span>
            <strong>{euro(result.totalInitial)}</strong>
          </div>
          <div>
            <span>Uscite già fatte</span>
            <strong>{euro(monthlyOut)}</strong>
          </div>
          <div>
            <span>Uscite previste</span>
            <strong>{euro(plannedOut)}</strong>
          </div>
          <div>
            <span>Tasso libertà</span>
            <strong className={savingRate < 0 ? "danger" : savingRate < 20 ? "attention" : ""}>{savingRate}%</strong>
          </div>
        </div>
      </div>

      <div className="control-side">
        <div className="control-mini">
          <DatabaseZap size={21} />
          <div>
            <span>Cloud</span>
            <strong>Sincronizzato</strong>
            <small>PC casa, lavoro e telefono</small>
          </div>
        </div>

        <div className="control-mini">
          <Trophy size={21} />
          <div>
            <span>Mese migliore</span>
            <strong>{annual.bestActive?.month || "-"}</strong>
            <small>{euro(annual.bestActive?.free || 0)}</small>
          </div>
        </div>

        <button className="backup-button" onClick={() => downloadJsonBackup(state)}>
          <Download size={17} />
          Scarica backup
        </button>
      </div>
    </section>
  );
}



function AnnualMiniPanel({ state }) {
  const annual = calculateAnnualStats(state);
  const activeRows = annual.rows.filter((row) => row.initial !== 0 || row.spent !== 0 || row.free !== 0);
  const displayRows = activeRows.length ? activeRows : annual.rows.slice(0, 3);

  return (
    <section className="annual-mini-panel annual-upgraded">
      <div className="section-heading">
        <BarChart3 size={20} />
        <div>
          <h3>Riepilogo annuale</h3>
          <p>Mostra solo i mesi davvero utilizzati e le statistiche importanti</p>
        </div>
      </div>

      <div className="annual-kpis">
        <div>
          <span>Mesi attivi</span>
          <strong>{activeRows.length}</strong>
        </div>
        <div>
          <span>Totale entrate</span>
          <strong>{euro(activeRows.reduce((s, r) => s + r.initial, 0))}</strong>
        </div>
        <div>
          <span>Totale speso</span>
          <strong>{euro(activeRows.reduce((s, r) => s + r.spent, 0))}</strong>
        </div>
        <div>
          <span>Libertà totale</span>
          <strong className={annual.totalFree < 0 ? "danger" : ""}>{euro(annual.totalFree)}</strong>
        </div>
      </div>

      <div className="annual-table compact">
        {displayRows.map((row) => (
          <div className={`annual-row ${row.free < 0 ? "negative-row" : ""}`} key={row.month}>
            <b>{row.month}</b>
            <span>Entrate {euro(row.initial)}</span>
            <span>Uscite {euro(row.spent)}</span>
            <strong className={row.free < 0 ? "danger" : ""}>{euro(row.free)}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}



function ManagerDashboard({ result, data, month }) {
  const budgetUsed = result.totalBudget > 0 ? Math.min(999, Math.round((result.totalBudgetSpent / result.totalBudget) * 100)) : 0;
  const paidRatePercent = result.fixedTotal > 0 ? Math.round((result.fixedPaid / result.fixedTotal) * 100) : 0;
  const daysLeft = getDaysLeftInMonth(data.year, month);
  const status = result.freeMoney < 0 ? "Rischio" : result.freeMoney < 300 ? "Attenzione" : "Ok";

  return (
    <section className="manager-dashboard">
      <ManagerCard icon={<Wallet />} label="Disponibilità reale" value={euro(result.freeMoney)} tone={result.freeMoney < 0 ? "red" : result.freeMoney < 300 ? "yellow" : "green"} />
      <ManagerCard icon={<CalendarCheck />} label="Giorni a fine mese" value={daysLeft} suffix="giorni" tone="blue" />
      <ManagerCard icon={<TrendingUp />} label="Budget consumato" value={`${budgetUsed}%`} tone={budgetUsed >= 90 ? "red" : budgetUsed >= 70 ? "yellow" : "green"} />
      <ManagerCard icon={<ReceiptText />} label="Rate da pagare" value={euro(result.fixedToPay)} tone={result.fixedToPay > 0 ? "orange" : "green"} />
      <ManagerCard icon={<Sparkles />} label="Rate pagate" value={`${paidRatePercent}%`} tone="purple" />
      <ManagerCard icon={<CheckCircle2 />} label="Stato mese" value={status} tone={status === "Rischio" ? "red" : status === "Attenzione" ? "yellow" : "green"} />
    </section>
  );
}

function ManagerCard({ icon, label, value, suffix, tone }) {
  return (
    <div className={`manager-card ${tone}`}>
      <div className="manager-icon">{icon}</div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        {suffix && <small>{suffix}</small>}
      </div>
    </div>
  );
}

function InsightsPanel({ data, result }) {
  const categories = CATEGORIES.map(({ key }) => ({
    key,
    spent: result.budgets[key]?.spent || 0,
    budget: result.budgets[key]?.budget || 0
  })).filter((item) => item.spent > 0 || item.budget > 0);

  const maxSpent = Math.max(1, ...categories.map((item) => item.spent));
  const top = [...categories].sort((a, b) => b.spent - a.spent)[0];

  return (
    <section className="insights-panel">
      <div className="section-heading">
        <PieChart size={20} />
        <div>
          <h3>Analisi consumi</h3>
          <p>Capisci subito dove stanno andando i soldi</p>
        </div>
      </div>

      <div className="category-bars">
        {categories.length === 0 && <div className="empty-state">Nessuna spesa inserita.</div>}
        {categories.map((item) => (
          <div className="category-bar-row" key={item.key}>
            <div className="category-bar-title">
              <span>{item.key}</span>
              <strong>{euro(item.spent)}</strong>
            </div>
            <div className="wide-progress">
              <div style={{ width: `${Math.min(100, (item.spent / maxSpent) * 100)}%` }} />
            </div>
            <small>{item.budget > 0 ? `${Math.round((item.spent / item.budget) * 100)}% del budget` : "Budget non impostato"}</small>
          </div>
        ))}
      </div>

      {top && (
        <div className="smart-tip">
          <Trophy size={18} />
          <span>Categoria più alta: <b>{top.key}</b> con {euro(top.spent)}.</span>
        </div>
      )}
    </section>
  );
}

function GoalsPanel({ data, updateMonth }) {
  const addGoal = () => updateMonth((d) => {
    d.goals.push({ id: makeId(), name: "Nuovo obiettivo", target: 0, current: 0 });
  });

  return (
    <section className="goals-panel">
      <div className="section-heading">
        <Target size={20} />
        <div>
          <h3>Obiettivi risparmio</h3>
          <p>Facoltativo: puoi lasciarli a zero</p>
        </div>
      </div>

      <div className="goals-list">
        {data.goals.map((goal) => {
          const percentage = goal.target > 0 ? Math.min(100, Math.round((goal.current / goal.target) * 100)) : 0;
          return (
            <div className="goal-card" key={goal.id}>
              <div className="goal-fields">
                <TextField value={goal.name} onChange={(value) => updateMonth((d) => findGoal(d, goal.id).name = value)} />
                <NumberField value={goal.current} onChange={(value) => updateMonth((d) => findGoal(d, goal.id).current = value)} />
                <NumberField value={goal.target} onChange={(value) => updateMonth((d) => findGoal(d, goal.id).target = value)} />
                <button className="icon-button" onClick={() => updateMonth((d) => d.goals = d.goals.filter((g) => g.id !== goal.id))}>
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="goal-meta">
                <span>{euro(goal.current)} / {euro(goal.target)}</span>
                <b>{percentage}%</b>
              </div>
              <div className="wide-progress goal-progress">
                <div style={{ width: `${percentage}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      <button className="add-button goal-add" onClick={addGoal}><Plus size={18} /> Aggiungi obiettivo</button>
    </section>
  );
}

function CalendarPanel({ data }) {
  const events = [
    ...data.movements.map((m) => ({ date: m.date, title: m.category, amount: m.amount, source: m.source, type: "spesa" })),
    ...Object.entries(data.fixed)
      .filter(([, item]) => isPaid(item.paid) && Number(item.amount) > 0)
      .map(([name, item]) => ({ date: "Pagata", title: name, amount: item.amount, source: item.source, type: "fissa" }))
  ];

  return (
    <section className="calendar-panel">
      <div className="section-heading">
        <CalendarCheck size={20} />
        <div>
          <h3>Calendario movimenti</h3>
          <p>Vista rapida delle uscite inserite</p>
        </div>
      </div>

      <div className="timeline">
        {events.length === 0 && <div className="empty-state">Nessun movimento inserito.</div>}
        {events.slice(0, 12).map((event, index) => (
          <div className={`timeline-item ${event.type}`} key={`${event.title}-${index}`}>
            <span>{event.date}</span>
            <div>
              <b>{event.title}</b>
              <small>{event.source || "Fonte non scelta"}</small>
            </div>
            <strong>{euro(event.amount)}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}


function FinancialCoachPanel({ result }) {
  const variablePct = result.totalBudget > 0 ? Math.round((result.totalBudgetSpent / result.totalBudget) * 100) : 0;
  const fixedPct = result.fixedTotal > 0 ? Math.round((result.fixedPaid / result.fixedTotal) * 100) : 0;
  const message =
    result.freeMoney < 0
      ? "Attenzione: gli impegni futuri superano la disponibilità attuale. Riduci una spesa variabile o rimanda una voce non essenziale."
      : result.freeMoney < 150
        ? "Margine basso: tieni sotto controllo sfizi e acquisti extra fino a fine mese."
        : result.totalBudgetSpent > result.totalBudget * 0.75 && result.totalBudget > 0
          ? "Budget variabile già molto utilizzato: rallenta sulle categorie meno importanti."
          : "Situazione stabile: hai margine per imprevisti e libertà.";

  return (
    <section className="financial-coach-panel">
      <div className="section-heading">
        <Sparkles size={20} />
        <div>
          <h3>Analisi finanziaria</h3>
          <p>Lettura rapida della situazione del mese</p>
        </div>
      </div>

      <div className="coach-body">
        <div className="coach-message">
          <b>Consiglio del mese</b>
          <p>{message}</p>
        </div>
        <div className="coach-metrics">
          <div>
            <span>Variabili usate</span>
            <strong>{variablePct}%</strong>
            <ProgressBar spent={result.totalBudgetSpent} budget={result.totalBudget} />
          </div>
          <div>
            <span>Rate pagate</span>
            <strong>{fixedPct}%</strong>
            <ProgressBar spent={result.fixedPaid} budget={result.fixedTotal} />
          </div>
          <div>
            <span>Margine finale</span>
            <strong className={result.forecast < 0 ? "danger" : ""}>{euro(result.forecast)}</strong>
          </div>
        </div>
      </div>
    </section>
  );
}

function FundsCard({ data, result, updateMonth }) {
  return (
    <section className="panel funds-panel">
      <PanelTitle color="green" icon={<PiggyBank />} title="Fondi disponibili" subtitle="tutto modificabile, parte da zero" />
      <table>
        <thead>
          <tr>
            <th>Fondo</th>
            <th>Iniziale</th>
            <th>Scalato spese</th>
            <th>Scalato fisse</th>
            <th>Residuo attuale</th>
          </tr>
        </thead>
        <tbody>
          {FUNDS.map(({ key, icon: Icon }) => (
            <tr key={key}>
              <td className="name-cell"><Icon size={18} /> {key}</td>
              <td><NumberField value={data.funds[key]} onChange={(value) => updateMonth((d) => (d.funds[key] = value))} /></td>
              <td className="money">{euro(result.funds[key].variable)}</td>
              <td className="money">{euro(result.funds[key].fixed)}</td>
              <td className={`money strong ${result.funds[key].current < 0 ? "danger" : ""}`}>{euro(result.funds[key].current)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td>Totale fondi</td>
            <td>{euro(result.totalInitial)}</td>
            <td>{euro(result.totalVariable)}</td>
            <td>{euro(result.totalFixed)}</td>
            <td>{euro(result.totalCurrent)}</td>
          </tr>
        </tfoot>
      </table>
    </section>
  );
}

function BudgetCard({ data, result, updateMonth }) {
  return (
    <section className="panel budget-panel">
      <PanelTitle color="rose" icon={<ShoppingCart />} title="Budget variabili" subtitle="budget e spese modificabili" />
      <table>
        <thead>
          <tr>
            <th>Categoria</th>
            <th>Budget</th>
            <th>Importo spesa</th>
            <th>Da dove li prendo</th>
            <th>Speso automatico</th>
            <th>Resta da usare</th>
          </tr>
        </thead>
        <tbody>
          {CATEGORIES.map(({ key, icon: Icon }) => (
            <tr key={key}>
              <td className="name-cell"><Icon size={18} /> {key}</td>
              <td><NumberField value={data.budgets[key]} onChange={(value) => updateMonth((d) => (d.budgets[key] = value))} /></td>
              <td><NumberField value={data.quick[key].amount} onChange={(value) => updateMonth((d) => (d.quick[key].amount = value))} /></td>
              <td>
                <SelectField
                  value={data.quick[key].source}
                  options={FUNDS.map((f) => f.key)}
                  placeholder="Scegli fondo"
                  onChange={(value) => updateMonth((d) => (d.quick[key].source = value))}
                />
                {data.quick[key].amount > 0 && !data.quick[key].source && <small className="warning-inline">Scegli fondo</small>}
              </td>
              <td className="money">{euro(result.budgets[key].spent)}</td>
              <td className={`money strong ${result.budgets[key].left < 0 ? "danger" : ""}`}>
                {euro(result.budgets[key].left)}
                <ProgressBar spent={result.budgets[key].spent} budget={result.budgets[key].budget} />
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td>Totale variabili</td>
            <td>{euro(result.totalBudget)}</td>
            <td>{euro(result.quickTotal)}</td>
            <td></td>
            <td>{euro(result.totalBudgetSpent)}</td>
            <td>{euro(result.totalBudgetLeft)}</td>
          </tr>
        </tfoot>
      </table>

      <div className="budget-control-strip">
        <div className="strip-card">
          <TrendingDown size={18} />
          <div>
            <span>Spese variabili</span>
            <strong>{euro(result.totalBudgetSpent)}</strong>
          </div>
        </div>
        <div className="strip-card">
          <Wallet size={18} />
          <div>
            <span>Ancora da usare</span>
            <strong>{euro(result.totalBudgetLeft)}</strong>
          </div>
        </div>
        <button
          className="strip-action"
          onClick={() => updateMonth((d) => {
            Object.keys(d.quick).forEach((key) => d.quick[key] = { amount: 0, source: "" });
          })}
        >
          <Trash2 size={17} /> Pulisci spese veloci
        </button>
      </div>
    </section>
  );
}

function SummaryPanel({ result }) {
  const rows = [
    ["Fondi iniziali", result.totalInitial, "Totale di ciò che hai disponibile"],
    ["Fondi scalati", result.totalVariable + result.totalFixed, "Soldi già utilizzati"],
    ["Saldo fondi attuale", result.totalCurrent, "Quello che hai ora"],
    ["Budget variabili totali", result.totalBudget, "Budget previsto"],
    ["Variabili spese", result.totalBudgetSpent, "Già speso per variabili"],
    ["Variabili ancora da usare", result.totalBudgetLeft, "Ancora disponibile variabili"],
    ["Fisse/rate previste", result.fixedTotal, "Totale fisso mensile"],
    ["Fisse/rate ancora da pagare", result.fixedToPay, "Quelle non ancora pagate"],
    ["Impegni futuri", result.futureCommitments, "Variabili residue + fisse"],
    ["Soldi da gestire", result.freeMoney, "Per imprevisti e libertà", true]
  ];

  const statusClass = result.freeMoney < 0 ? "danger" : result.freeMoney < 300 ? "attention" : "ok";

  return (
    <aside className="summary-panel">
      <div className="summary-title"><Wallet size={18} /> Riepilogo — soldi davvero da gestire</div>

      <div className="summary-list">
        {rows.map(([label, value, caption, highlight]) => (
          <div className={`summary-row ${highlight ? "highlight" : ""}`} key={label}>
            <span>{label}</span>
            <strong className={value < 0 ? "danger" : ""}>{euro(value)}</strong>
            <small>{caption}</small>
          </div>
        ))}
      </div>

      <div className={`money-hero ${statusClass}`}>
        <Heart size={25} />
        <span>Libertà del mese</span>
        <strong>{euro(result.freeMoney)}</strong>
        <small>Quello che resta per imprevisti e libertà</small>
      </div>

      <div className="mini-kpi blue-kpi">
        <span><Target size={18} /> Previsione fine mese</span>
        <strong className={result.forecast < 0 ? "danger" : ""}>{euro(result.forecast)}</strong>
      </div>

      <div className={`mini-kpi ${statusClass === "danger" ? "red-kpi" : statusClass === "attention" ? "yellow-kpi" : "green-kpi"}`}>
        <span><CheckCircle2 size={18} /> Stato mese</span>
        <strong>{result.freeMoney < 0 ? "RISCHIO" : result.freeMoney < 300 ? "ATTENZIONE" : "OK"}</strong>
      </div>

      {result.missingSources.length > 0 && (
        <div className="alert-card">
          <AlertTriangle size={18} />
          <div>
            <b>Fonti mancanti</b>
            <span>{result.missingSources.length} voce/i pagate o spese senza fondo.</span>
          </div>
        </div>
      )}

      <div className="quote-card">La disciplina di oggi<br />è la libertà di domani.<br />♡</div>
    </aside>
  );
}

function GuideCard() {
  return (
    <section className="guide-panel">
      <h3>📌 Come funziona</h3>
      <ol>
        <li>Ogni mese parte con importi a zero.</li>
        <li>Inserisci fondi, budget, rate e spese reali del mese.</li>
        <li>Se fai una spesa, scegli sempre da dove prendi i soldi.</li>
        <li>Se una rata è pagata, scegli fonte e metti Pagato = Sì.</li>
        <li>Il fondo scala in automatico e il riepilogo si aggiorna.</li>
      </ol>
    </section>
  );
}

function MovementsCard({ data, updateMonth }) {
  const addMovement = () => updateMonth((d) => {
    d.movements.push({
      id: makeId(),
      date: new Date().toLocaleDateString("it-IT"),
      category: CATEGORIES[0].key,
      amount: 0,
      source: "",
      note: ""
    });
  });

  return (
    <section className="panel movements-panel">
      <PanelTitle color="blue" icon={<NotebookPen />} title="Registro spese variabili" subtitle="storico movimenti del mese" />
      <table>
        <thead>
          <tr>
            <th>Data</th>
            <th>Categoria</th>
            <th>Importo</th>
            <th>Da dove li prendo</th>
            <th>Note</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {data.movements.map((move) => {
            const hasWarning = move.amount > 0 && !move.source;
            return (
              <tr key={move.id} className={hasWarning ? "row-warning" : ""}>
                <td><TextField value={move.date} onChange={(value) => updateMonth((d) => findMove(d, move.id).date = value)} /></td>
                <td>
                  <SelectField value={move.category} options={CATEGORIES.map((c) => c.key)} onChange={(value) => updateMonth((d) => findMove(d, move.id).category = value)} />
                </td>
                <td><NumberField value={move.amount} onChange={(value) => updateMonth((d) => findMove(d, move.id).amount = value)} /></td>
                <td>
                  <SelectField value={move.source} options={FUNDS.map((f) => f.key)} placeholder="Scegli fondo" onChange={(value) => updateMonth((d) => findMove(d, move.id).source = value)} />
                  {hasWarning && <small className="warning-inline">Scegli fondo</small>}
                </td>
                <td><TextField value={move.note} onChange={(value) => updateMonth((d) => findMove(d, move.id).note = value)} /></td>
                <td>
                  <button className="icon-button" onClick={() => updateMonth((d) => d.movements = d.movements.filter((m) => m.id !== move.id))}>
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <button className="add-button" onClick={addMovement}><Plus size={18} /> Aggiungi movimento</button>
    </section>
  );
}

function FixedCard({ data, result, updateMonth }) {
  return (
    <section className="panel fixed-panel">
      <PanelTitle color="orange" icon={<ReceiptText />} title="Spese fisse / rate" subtitle="importi modificabili, default zero" />
      <table>
        <thead>
          <tr>
            <th>Voce</th>
            <th>Importo</th>
            <th>Da dove li prendo</th>
            <th>Pagato?</th>
            <th>Da pagare</th>
            <th>Stato</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(data.fixed).map(([name, item]) => {
            const paid = isPaid(item.paid);
            const missingSource = paid && item.amount > 0 && !item.source;
            return (
              <tr key={name} className={missingSource ? "row-warning" : ""}>
                <td className="name-cell">{name}</td>
                <td><NumberField value={item.amount} onChange={(value) => updateMonth((d) => d.fixed[name].amount = value)} /></td>
                <td>
                  <SelectField value={item.source} options={FUNDS.map((f) => f.key)} placeholder="Scegli fondo" onChange={(value) => updateMonth((d) => d.fixed[name].source = value)} />
                  {missingSource && <small className="warning-inline">Scegli fondo</small>}
                </td>
                <td>
                  <SelectField value={item.paid} options={["Sì", "No"]} onChange={(value) => updateMonth((d) => d.fixed[name].paid = value)} />
                </td>
                <td className="money strong">{euro(paid ? 0 : item.amount)}</td>
                <td><span className={`status-badge ${paid ? "paid" : "pending"}`}>{paid ? "Pagata" : "Da pagare"}</span></td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <td>Totale fisse/rate</td>
            <td>{euro(result.fixedTotal)}</td>
            <td></td>
            <td>Già pagate</td>
            <td>Da pagare: {euro(result.fixedToPay)}</td>
            <td>Pagate: {euro(result.fixedPaid)}</td>
          </tr>
        </tfoot>
      </table>
    </section>
  );
}


function ProgressBar({ spent, budget }) {
  const percentage = budget > 0 ? Math.min(100, Math.max(0, (spent / budget) * 100)) : 0;
  const level = percentage >= 90 ? "danger" : percentage >= 70 ? "warn" : "safe";

  return (
    <div className="progress-wrap" title={`${Math.round(percentage)}% usato`}>
      <div className={`progress-fill ${level}`} style={{ width: `${percentage}%` }} />
    </div>
  );
}

function PanelTitle({ color, icon, title, subtitle }) {
  return (
    <div className={`panel-title ${color}`}>
      <div>{icon}<h2>{title}</h2></div>
      <p>{subtitle}</p>
    </div>
  );
}

function NumberField({ value, onChange }) {
  return <input className="input number" type="number" step="0.01" value={Number(value) || 0} onChange={(e) => onChange(Number(e.target.value) || 0)} />;
}

function TextField({ value, onChange, placeholder = "" }) {
  return <input className="input" value={value || ""} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />;
}

function SelectField({ value, onChange, options, placeholder = "Scegli" }) {
  return (
    <select className="input select" value={value || ""} onChange={(e) => onChange(e.target.value)}>
      <option value="">{placeholder}</option>
      {options.map((option) => <option value={option} key={option}>{option}</option>)}
    </select>
  );
}

function findMove(data, id) {
  return data.movements.find((m) => m.id === id);
}

function isPaid(value) {
  return String(value || "").toLowerCase().startsWith("s");
}

function calculateMonth(data) {
  const spentByFund = Object.fromEntries(FUNDS.map(({ key }) => [key, 0]));
  const fixedByFund = Object.fromEntries(FUNDS.map(({ key }) => [key, 0]));
  const spentByCategory = Object.fromEntries(CATEGORIES.map(({ key }) => [key, 0]));
  const missingSources = [];

  Object.entries(data.quick).forEach(([category, item]) => {
    const amount = Number(item.amount) || 0;
    spentByCategory[category] += amount;
    if (amount > 0 && !item.source) missingSources.push(`Spesa veloce: ${category}`);
    if (item.source) spentByFund[item.source] += amount;
  });

  data.movements.forEach((item) => {
    const amount = Number(item.amount) || 0;
    spentByCategory[item.category] = (spentByCategory[item.category] || 0) + amount;
    if (amount > 0 && !item.source) missingSources.push(`Movimento: ${item.category}`);
    if (item.source) spentByFund[item.source] += amount;
  });

  let fixedTotal = 0;
  let fixedPaid = 0;
  let fixedToPay = 0;

  Object.entries(data.fixed).forEach(([name, item]) => {
    const amount = Number(item.amount) || 0;
    fixedTotal += amount;

    if (isPaid(item.paid)) {
      fixedPaid += amount;
      if (amount > 0 && !item.source) missingSources.push(`Rata pagata senza fondo: ${name}`);
      if (item.source) fixedByFund[item.source] += amount;
    } else {
      fixedToPay += amount;
    }
  });

  const funds = {};
  FUNDS.forEach(({ key }) => {
    const initial = Number(data.funds[key]) || 0;
    const variable = spentByFund[key] || 0;
    const fixed = fixedByFund[key] || 0;
    funds[key] = { initial, variable, fixed, current: initial - variable - fixed };
  });

  const budgets = {};
  CATEGORIES.forEach(({ key }) => {
    const budget = Number(data.budgets[key]) || 0;
    const spent = spentByCategory[key] || 0;
    budgets[key] = { budget, spent, left: budget - spent };
  });

  const totalInitial = sumObject(funds, "initial");
  const totalVariable = sumObject(funds, "variable");
  const totalFixed = sumObject(funds, "fixed");
  const totalCurrent = sumObject(funds, "current");

  const totalBudget = sumObject(budgets, "budget");
  const totalBudgetSpent = sumObject(budgets, "spent");
  const totalBudgetLeft = sumObject(budgets, "left");
  const quickTotal = Object.values(data.quick).reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  const futureCommitments = totalBudgetLeft + fixedToPay;
  const freeMoney = totalCurrent - futureCommitments;
  const forecast = totalInitial - (totalBudget + fixedTotal);

  return {
    funds,
    budgets,
    totalInitial,
    totalVariable,
    totalFixed,
    totalCurrent,
    totalBudget,
    totalBudgetSpent,
    totalBudgetLeft,
    quickTotal,
    fixedTotal,
    fixedPaid,
    fixedToPay,
    futureCommitments,
    freeMoney,
    forecast,
    missingSources
  };
}

function findGoal(data, id) {
  return data.goals.find((goal) => goal.id === id);
}

async function saveStateToCloud(state, setCloudStatus) {
  try {
    setCloudStatus("Salvataggio cloud...");

    const payload = {
      mese: CLOUD_ROW_MONTH,
      anno: CLOUD_ROW_YEAR,
      dati: state,
      updated_at: new Date().toISOString()
    };

    const { data: existing, error: selectError } = await supabase
      .from("bilanci")
      .select("id")
      .eq("mese", CLOUD_ROW_MONTH)
      .eq("anno", CLOUD_ROW_YEAR)
      .limit(1)
      .maybeSingle();

    if (selectError) throw selectError;

    const response = existing?.id
      ? await supabase.from("bilanci").update(payload).eq("id", existing.id)
      : await supabase.from("bilanci").insert(payload);

    if (response.error) throw response.error;

    setCloudStatus("Cloud attivo");
  } catch (error) {
    console.error("Errore salvataggio Supabase:", error);
    setCloudStatus("Errore cloud");
  }
}

function getDaysLeftInMonth(year, monthName) {
  const monthIndex = MONTHS.indexOf(monthName);
  const now = new Date();
  const targetYear = Number(year) || now.getFullYear();
  const end = new Date(targetYear, monthIndex + 1, 0);
  const basis = now.getMonth() === monthIndex && now.getFullYear() === targetYear ? now : new Date(targetYear, monthIndex, 1);
  return Math.max(0, Math.ceil((end - basis) / (1000 * 60 * 60 * 24)));
}

function sumObject(object, key) {
  return Object.values(object).reduce((total, item) => total + (Number(item[key]) || 0), 0);
}


function downloadJsonBackup(state) {
  const payload = {
    exportedAt: new Date().toISOString(),
    app: "Bilancio Famiglia Premium",
    version: "V8 Cloud Plus",
    data: state
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `bilancio-famiglia-backup-${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function calculateAnnualStats(state) {
  const rows = Object.entries(state || {}).map(([monthName, data]) => {
    try {
      const r = calculateMonth(data);
      return {
        month: monthName,
        initial: r.totalInitial || 0,
        spent: (r.totalBudgetSpent || 0) + (r.fixedPaid || 0),
        free: r.freeMoney || 0,
        fixedToPay: r.fixedToPay || 0
      };
    } catch {
      return { month: monthName, initial: 0, spent: 0, free: 0, fixedToPay: 0 };
    }
  });

  const active = rows.filter((r) => r.initial !== 0 || r.spent !== 0 || r.free !== 0);
  const best = [...rows].sort((a, b) => b.free - a.free)[0];
  const worst = [...rows].sort((a, b) => a.free - b.free)[0];
  const bestActive = active.length ? [...active].sort((a, b) => b.free - a.free)[0] : null;
  const worstActive = active.length ? [...active].sort((a, b) => a.free - b.free)[0] : null;
  const totalFree = active.reduce((s, r) => s + r.free, 0);
  const activeMonths = active.length;

  return { rows, best, worst, bestActive, worstActive, totalFree, activeMonths };
}

createRoot(document.getElementById("root")).render(<App />);
