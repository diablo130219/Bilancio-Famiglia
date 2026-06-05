import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  PiggyBank,
  Wallet,
  ShoppingCart,
  ReceiptText,
  NotebookPen,
  Target,
  CheckCircle2,
  Trash2,
  Plus,
  CalendarDays,
  Heart,
  Coffee,
  Landmark,
  Briefcase,
  Users,
  Baby,
  Home,
  HandCoins,
  Star,
  Fuel,
  Gift,
  Info
} from "lucide-react";
import "./style.css";

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
  ["Findomestic", 150],
  ["Nintendo + Scopa elettrica", 45],
  ["Netflix", 7],
  ["Tim Vision", 35],
  ["Wind Fisso", 24],
  ["Mutuo", 100],
  ["Garage", 50],
  ["PS Store", 9],
  ["Wind Mobile", 20],
  ["Enel", 0],
  ["Gas", 0],
  ["Gori", 140],
  ["Altro finanziamento", 0],
  ["Altro abbonamento", 0]
];

const euro = (value) =>
  (Number(value) || 0).toLocaleString("it-IT", {
    style: "currency",
    currency: "EUR"
  });

const createMonth = () => ({
  year: 2026,
  funds: Object.fromEntries(FUNDS.map(({ key }) => [key, 0])),
  budgets: {
    "Alimenti + prodotti casa": 600,
    Benzina: 80,
    "Paghetta Angelo": 50,
    Sfizi: 100,
    Deposito: 0,
    "Altro variabile": 0
  },
  quick: Object.fromEntries(CATEGORIES.map(({ key }) => [key, { amount: 0, source: "" }])),
  movements: [],
  fixed: Object.fromEntries(
    FIXED_ITEMS.map(([name, amount]) => [name, { amount, source: "", paid: "No" }])
  )
});

const createInitialState = () => {
  const state = Object.fromEntries(MONTHS.map((m) => [m, createMonth()]));

  state.Giugno.funds = {
    "Residuo banca": 320,
    Stipendio: 0,
    Mantenimento: 500,
    "Assegno unico": 200,
    Giulia: 200,
    Casa: 300,
    Tasca: 25,
    Extra: 0
  };

  state.Giugno.quick["Alimenti + prodotti casa"] = {
    amount: 20,
    source: "Residuo banca"
  };

  state.Giugno.movements = [
    {
      id: crypto.randomUUID(),
      date: "04/06/2026",
      category: "Alimenti + prodotti casa",
      amount: 100,
      source: "Residuo banca",
      note: "Spesa settimanale"
    },
    {
      id: crypto.randomUUID(),
      date: "04/06/2026",
      category: "Alimenti + prodotti casa",
      amount: 20,
      source: "Residuo banca",
      note: "Pane e frutta"
    }
  ];

  state.Giugno.fixed.Findomestic = { amount: 150, source: "Casa", paid: "Sì" };
  state.Giugno.fixed["Nintendo + Scopa elettrica"].paid = "Sì";
  state.Giugno.fixed.Netflix.paid = "Sì";
  state.Giugno.fixed.Garage.paid = "Sì";
  state.Giugno.fixed["Wind Mobile"].paid = "Sì";

  return state;
};

const loadState = () => {
  try {
    return JSON.parse(localStorage.getItem("bilancio-famiglia-react")) || createInitialState();
  } catch {
    return createInitialState();
  }
};

function NumberField({ value, onChange }) {
  return (
    <input
      className="input number"
      type="number"
      step="0.01"
      value={Number(value) || 0}
      onChange={(event) => onChange(Number(event.target.value) || 0)}
    />
  );
}

function TextField({ value, onChange, placeholder = "" }) {
  return (
    <input
      className="input"
      value={value || ""}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

function SelectField({ value, onChange, options, placeholder = "Scegli" }) {
  return (
    <select className="input select" value={value || ""} onChange={(event) => onChange(event.target.value)}>
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option value={option} key={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

function App() {
  const [state, setState] = useState(loadState);
  const [month, setMonth] = useState(localStorage.getItem("bilancio-famiglia-month") || "Giugno");

  const data = state[month];

  const updateMonth = (updater) => {
    setState((previous) => {
      const next = structuredClone(previous);
      updater(next[month]);
      localStorage.setItem("bilancio-famiglia-react", JSON.stringify(next));
      return next;
    });
  };

  const switchMonth = (value) => {
    setMonth(value);
    localStorage.setItem("bilancio-famiglia-month", value);
  };

  const result = useMemo(() => calculateMonth(data), [data]);

  return (
    <div className="app-shell">
      <Header month={month} setMonth={switchMonth} year={data.year} updateYear={(year) => updateMonth((d) => (d.year = year))} />

      <main className="dashboard-grid">
        <FundsCard data={data} result={result} updateMonth={updateMonth} />
        <BudgetCard data={data} result={result} updateMonth={updateMonth} />
        <SummaryPanel result={result} />

        <GuideCard />
        <MovementsCard data={data} updateMonth={updateMonth} />
        <FixedCard data={data} result={result} updateMonth={updateMonth} />
      </main>
    </div>
  );
}

function Header({ month, setMonth, year, updateYear }) {
  return (
    <header className="top-hero">
      <section className="brand-block">
        <div className="decor-leaf left">❧</div>
        <h1>
          Bilancio Mensile <Heart size={34} strokeWidth={2.2} />
        </h1>
        <p>Organizza le entrate, gestisci le spese e raggiungi i tuoi obiettivi</p>
      </section>

      <section className="period-controls">
        <div className="period-pill">
          <span>MESE</span>
          <select value={month} onChange={(event) => setMonth(event.target.value)}>
            {MONTHS.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </div>
        <div className="period-pill">
          <span>ANNO</span>
          <input type="number" min="2024" max="2035" value={year} onChange={(event) => updateYear(Number(event.target.value) || 2026)} />
        </div>
      </section>

      <section className="coffee-card">
        <Coffee size={56} />
      </section>

      <section className="sticky-note">
        Piccoli passi
        <br />
        ogni giorno
        <br />
        portano a grandi
        <br />
        risultati ♡
      </section>
    </header>
  );
}

function FundsCard({ data, result, updateMonth }) {
  return (
    <section className="panel funds-panel">
      <PanelTitle color="green" icon={<PiggyBank />} title="Fondi disponibili" subtitle="scegli da dove prelevare" />
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
              <td className="name-cell">
                <Icon size={18} /> {key}
              </td>
              <td>
                <NumberField value={data.funds[key]} onChange={(value) => updateMonth((d) => (d.funds[key] = value))} />
              </td>
              <td className="money">{euro(result.funds[key].variable)}</td>
              <td className="money">{euro(result.funds[key].fixed)}</td>
              <td className={`money strong ${result.funds[key].current < 0 ? "danger" : ""}`}>
                {euro(result.funds[key].current)}
              </td>
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
      <PanelTitle color="rose" icon={<ShoppingCart />} title="Budget variabili" subtitle="registra le spese qui sotto" />
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
              <td className="name-cell">
                <Icon size={18} /> {key}
              </td>
              <td>
                <NumberField value={data.budgets[key]} onChange={(value) => updateMonth((d) => (d.budgets[key] = value))} />
              </td>
              <td>
                <NumberField value={data.quick[key].amount} onChange={(value) => updateMonth((d) => (d.quick[key].amount = value))} />
              </td>
              <td>
                <SelectField
                  value={data.quick[key].source}
                  options={FUNDS.map((f) => f.key)}
                  placeholder="Scegli fondo"
                  onChange={(value) => updateMonth((d) => (d.quick[key].source = value))}
                />
              </td>
              <td className="money">{euro(result.budgets[key].spent)}</td>
              <td className={`money strong ${result.budgets[key].left < 0 ? "danger" : ""}`}>
                {euro(result.budgets[key].left)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td>Totale variabili</td>
            <td>{euro(result.totalBudget)}</td>
            <td>{euro(Object.values(data.quick).reduce((sum, item) => sum + (Number(item.amount) || 0), 0))}</td>
            <td></td>
            <td>{euro(result.totalBudgetSpent)}</td>
            <td>{euro(result.totalBudgetLeft)}</td>
          </tr>
        </tfoot>
      </table>

      <div className="action-row">
        <button className="fake-button green-button">✓ Registra spesa</button>
        <button
          className="fake-button purple-button"
          onClick={() =>
            updateMonth((d) => {
              Object.keys(d.quick).forEach((key) => {
                d.quick[key] = { amount: 0, source: "" };
              });
            })
          }
        >
          <Trash2 size={17} /> Annulla
        </button>
        <div className="tip-card">
          <Info size={18} />
          Inserisci importo e fondo. Tutto si aggiorna automaticamente.
        </div>
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

  return (
    <aside className="summary-panel">
      <div className="summary-title">
        <Wallet size={18} /> Riepilogo — soldi davvero da gestire
      </div>

      <div className="summary-list">
        {rows.map(([label, value, caption, highlight]) => (
          <div className={`summary-row ${highlight ? "highlight" : ""}`} key={label}>
            <span>{label}</span>
            <strong className={value < 0 ? "danger" : ""}>{euro(value)}</strong>
            <small>{caption}</small>
          </div>
        ))}
      </div>

      <div className="money-hero">
        <Heart size={25} />
        <span>Soldi da gestire</span>
        <strong className={result.freeMoney < 0 ? "danger" : ""}>{euro(result.freeMoney)}</strong>
        <small>Quello che resta per imprevisti e libertà</small>
      </div>

      <div className="mini-kpi blue-kpi">
        <span>
          <Target size={18} /> Previsione fine mese
        </span>
        <strong>{euro(result.forecast)}</strong>
      </div>

      <div className="mini-kpi green-kpi">
        <span>
          <CheckCircle2 size={18} /> Stato mese
        </span>
        <strong>{result.freeMoney < 0 ? "RISCHIO" : "OK"}</strong>
      </div>

      <div className="quote-card">La disciplina di oggi<br />è la libertà di domani.<br />♡</div>
    </aside>
  );
}

function GuideCard() {
  return (
    <section className="guide-panel">
      <h3>📌 Come funziona</h3>
      <ol>
        <li>Scegli da dove prelevare i soldi per ogni spesa variabile.</li>
        <li>Inserisci l'importo nella colonna importo spesa oppure nello storico.</li>
        <li>Seleziona il fondo nella colonna “Da dove li prendo”.</li>
        <li>Per le rate scegli fonte e metti pagato = Sì.</li>
        <li>Il fondo si scala e la categoria si aggiorna in automatico.</li>
      </ol>
    </section>
  );
}

function MovementsCard({ data, updateMonth }) {
  const addMovement = () =>
    updateMonth((d) => {
      d.movements.push({
        id: crypto.randomUUID(),
        date: new Date().toLocaleDateString("it-IT"),
        category: CATEGORIES[0].key,
        amount: 0,
        source: "",
        note: ""
      });
    });

  return (
    <section className="panel movements-panel">
      <PanelTitle color="blue" icon={<NotebookPen />} title="Registro spese variabili" subtitle="storico movimenti" />
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
          {data.movements.map((move) => (
            <tr key={move.id}>
              <td>
                <TextField value={move.date} onChange={(value) => updateMonth((d) => (d.movements.find((m) => m.id === move.id).date = value))} />
              </td>
              <td>
                <SelectField
                  value={move.category}
                  options={CATEGORIES.map((c) => c.key)}
                  onChange={(value) => updateMonth((d) => (d.movements.find((m) => m.id === move.id).category = value))}
                />
              </td>
              <td>
                <NumberField value={move.amount} onChange={(value) => updateMonth((d) => (d.movements.find((m) => m.id === move.id).amount = value))} />
              </td>
              <td>
                <SelectField
                  value={move.source}
                  options={FUNDS.map((f) => f.key)}
                  placeholder="Scegli fondo"
                  onChange={(value) => updateMonth((d) => (d.movements.find((m) => m.id === move.id).source = value))}
                />
              </td>
              <td>
                <TextField value={move.note} onChange={(value) => updateMonth((d) => (d.movements.find((m) => m.id === move.id).note = value))} />
              </td>
              <td>
                <button className="icon-button" onClick={() => updateMonth((d) => (d.movements = d.movements.filter((m) => m.id !== move.id)))}>
                  <Trash2 size={16} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button className="add-button" onClick={addMovement}>
        <Plus size={18} /> Aggiungi movimento
      </button>
    </section>
  );
}

function FixedCard({ data, result, updateMonth }) {
  return (
    <section className="panel fixed-panel">
      <PanelTitle color="orange" icon={<ReceiptText />} title="Spese fisse / rate" subtitle="gestione diretta nel mese" />
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
            return (
              <tr key={name}>
                <td className="name-cell">{name}</td>
                <td>
                  <NumberField value={item.amount} onChange={(value) => updateMonth((d) => (d.fixed[name].amount = value))} />
                </td>
                <td>
                  <SelectField
                    value={item.source}
                    options={FUNDS.map((f) => f.key)}
                    placeholder="Scegli fondo"
                    onChange={(value) => updateMonth((d) => (d.fixed[name].source = value))}
                  />
                </td>
                <td>
                  <SelectField value={item.paid} options={["Sì", "No"]} onChange={(value) => updateMonth((d) => (d.fixed[name].paid = value))} />
                </td>
                <td className="money strong">{euro(paid ? 0 : item.amount)}</td>
                <td>{paid ? "Pagata" : "Da pagare"}</td>
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
            <td>{euro(result.fixedToPay)}</td>
            <td>{euro(result.fixedPaid)}</td>
          </tr>
        </tfoot>
      </table>
    </section>
  );
}

function PanelTitle({ color, icon, title, subtitle }) {
  return (
    <div className={`panel-title ${color}`}>
      <div>
        {icon}
        <h2>{title}</h2>
      </div>
      <p>{subtitle}</p>
    </div>
  );
}

function isPaid(value) {
  return String(value || "").toLowerCase().startsWith("s");
}

function calculateMonth(data) {
  const spentByFund = Object.fromEntries(FUNDS.map(({ key }) => [key, 0]));
  const fixedByFund = Object.fromEntries(FUNDS.map(({ key }) => [key, 0]));
  const spentByCategory = Object.fromEntries(CATEGORIES.map(({ key }) => [key, 0]));

  Object.entries(data.quick).forEach(([category, item]) => {
    const amount = Number(item.amount) || 0;
    spentByCategory[category] += amount;
    if (item.source) spentByFund[item.source] += amount;
  });

  data.movements.forEach((item) => {
    const amount = Number(item.amount) || 0;
    spentByCategory[item.category] = (spentByCategory[item.category] || 0) + amount;
    if (item.source) spentByFund[item.source] += amount;
  });

  let fixedTotal = 0;
  let fixedPaid = 0;
  let fixedToPay = 0;

  Object.values(data.fixed).forEach((item) => {
    const amount = Number(item.amount) || 0;
    fixedTotal += amount;

    if (isPaid(item.paid)) {
      fixedPaid += amount;
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
    fixedTotal,
    fixedPaid,
    fixedToPay,
    futureCommitments,
    freeMoney,
    forecast
  };
}

function sumObject(object, key) {
  return Object.values(object).reduce((total, item) => total + (Number(item[key]) || 0), 0);
}

createRoot(document.getElementById("root")).render(<App />);
