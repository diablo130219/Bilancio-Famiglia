const months = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];
const fundNames = ["Residuo banca","Stipendio","Mantenimento","Assegno unico","Giulia","Casa","Tasca","Extra"];
const categories = ["🍎 Alimenti + prodotti casa","⛽ Benzina","👦 Paghetta Angelo","🎁 Sfizi","🧿 Deposito","☘️ Altro variabile"];
const fixedBase = [
  ["Findomestic",150],["Nintendo + Scopa elettrica",45],["Netflix",7],["Tim Vision",35],
  ["Wind Fisso",24],["Mutuo",100],["Garage",50],["PS Store",9],["Wind Mobile",20],
  ["Enel",0],["Gas",0],["Gori",140],["Altro finanziamento",0],["Altro abbonamento",0]
];

const euro = value => (Number(value) || 0).toLocaleString("it-IT", {
  style: "currency",
  currency: "EUR"
});

const createMonth = () => ({
  year: 2026,
  funds: {
    "Residuo banca": 0,
    "Stipendio": 0,
    "Mantenimento": 0,
    "Assegno unico": 0,
    "Giulia": 0,
    "Casa": 0,
    "Tasca": 0,
    "Extra": 0
  },
  budgets: {
    "🍎 Alimenti + prodotti casa": 600,
    "⛽ Benzina": 80,
    "👦 Paghetta Angelo": 50,
    "🎁 Sfizi": 100,
    "🧿 Deposito": 0,
    "☘️ Altro variabile": 0
  },
  quick: Object.fromEntries(categories.map(category => [category, { amount: 0, source: "" }])),
  movements: [],
  fixed: Object.fromEntries(fixedBase.map(([name, amount]) => [name, { amount, source: "", paid: "No" }]))
});

const createInitialState = () => {
  const state = {};
  months.forEach(month => state[month] = createMonth());

  state.Giugno.funds = {
    "Residuo banca": 320,
    "Stipendio": 0,
    "Mantenimento": 500,
    "Assegno unico": 200,
    "Giulia": 200,
    "Casa": 300,
    "Tasca": 25,
    "Extra": 0
  };

  state.Giugno.quick["🍎 Alimenti + prodotti casa"] = { amount: 20, source: "Residuo banca" };

  state.Giugno.movements = [
    { date: "04/06/2026", category: "🍎 Alimenti + prodotti casa", amount: 100, source: "Residuo banca", note: "Spesa settimanale" },
    { date: "04/06/2026", category: "🍎 Alimenti + prodotti casa", amount: 20, source: "Residuo banca", note: "Pane e frutta" }
  ];

  state.Giugno.fixed["Findomestic"] = { amount: 150, source: "Casa", paid: "Sì" };
  state.Giugno.fixed["Nintendo + Scopa elettrica"].paid = "Sì";
  state.Giugno.fixed["Netflix"].paid = "Sì";
  state.Giugno.fixed["Garage"].paid = "Sì";
  state.Giugno.fixed["Wind Mobile"].paid = "Sì";

  return state;
};

let appState = JSON.parse(localStorage.getItem("bilancioFamigliaClean") || "null") || createInitialState();
let currentMonth = localStorage.getItem("bilancioFamigliaMonth") || "Giugno";

const saveState = () => {
  localStorage.setItem("bilancioFamigliaClean", JSON.stringify(appState));
  localStorage.setItem("bilancioFamigliaMonth", currentMonth);
};

const monthData = () => appState[currentMonth];

const makeSourceSelect = (value, callback) => {
  const select = document.createElement("select");
  select.innerHTML = '<option value="">Scegli fondo</option>' + fundNames
    .map(name => `<option value="${name}" ${name === value ? "selected" : ""}>${name}</option>`)
    .join("");
  select.addEventListener("change", event => callback(event.target.value));
  return select;
};

const makeYesNoSelect = (value, callback) => {
  const select = document.createElement("select");
  select.innerHTML = ["Sì", "No"]
    .map(option => `<option value="${option}" ${option === value ? "selected" : ""}>${option}</option>`)
    .join("");
  select.addEventListener("change", event => callback(event.target.value));
  return select;
};

const makeCategorySelect = (value, callback) => {
  const select = document.createElement("select");
  select.innerHTML = categories
    .map(category => `<option value="${category}" ${category === value ? "selected" : ""}>${category}</option>`)
    .join("");
  select.addEventListener("change", event => callback(event.target.value));
  return select;
};

const makeNumberInput = (value, callback) => {
  const input = document.createElement("input");
  input.type = "number";
  input.step = "0.01";
  input.value = Number(value) || 0;
  input.addEventListener("input", event => callback(Number(event.target.value) || 0));
  return input;
};

const makeTextInput = (value, callback) => {
  const input = document.createElement("input");
  input.value = value || "";
  input.addEventListener("input", event => callback(event.target.value));
  return input;
};

const calculate = () => {
  const data = monthData();

  const spentByFund = Object.fromEntries(fundNames.map(name => [name, 0]));
  const fixedByFund = Object.fromEntries(fundNames.map(name => [name, 0]));
  const spentByCategory = Object.fromEntries(categories.map(name => [name, 0]));

  Object.entries(data.quick).forEach(([category, item]) => {
    const amount = Number(item.amount) || 0;
    spentByCategory[category] += amount;
    if (item.source) spentByFund[item.source] += amount;
  });

  data.movements.forEach(item => {
    const amount = Number(item.amount) || 0;
    spentByCategory[item.category] = (spentByCategory[item.category] || 0) + amount;
    if (item.source) spentByFund[item.source] += amount;
  });

  let fixedTotal = 0;
  let fixedPaid = 0;
  let fixedToPay = 0;

  Object.values(data.fixed).forEach(item => {
    const amount = Number(item.amount) || 0;
    fixedTotal += amount;

    if (String(item.paid).toLowerCase().startsWith("s")) {
      fixedPaid += amount;
      if (item.source) fixedByFund[item.source] += amount;
    } else {
      fixedToPay += amount;
    }
  });

  const funds = {};
  fundNames.forEach(name => {
    const initial = Number(data.funds[name]) || 0;
    const variable = spentByFund[name] || 0;
    const fixed = fixedByFund[name] || 0;
    funds[name] = {
      initial,
      variable,
      fixed,
      current: initial - variable - fixed
    };
  });

  const budgets = {};
  categories.forEach(category => {
    const budget = Number(data.budgets[category]) || 0;
    const spent = spentByCategory[category] || 0;
    budgets[category] = {
      budget,
      spent,
      left: budget - spent
    };
  });

  const sum = (items, key) => Object.values(items).reduce((total, item) => total + item[key], 0);

  const totalInitial = sum(funds, "initial");
  const totalVariable = sum(funds, "variable");
  const totalFixed = sum(funds, "fixed");
  const totalCurrent = sum(funds, "current");

  const totalBudget = sum(budgets, "budget");
  const totalBudgetSpent = sum(budgets, "spent");
  const totalBudgetLeft = sum(budgets, "left");

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
};

const render = () => {
  const data = monthData();
  const result = calculate();

  document.getElementById("monthSelect").innerHTML = months
    .map(month => `<option value="${month}" ${month === currentMonth ? "selected" : ""}>${month}</option>`)
    .join("");

  document.getElementById("yearInput").value = data.year;

  renderFunds(data, result);
  renderBudgets(data, result);
  renderMovements(data);
  renderFixed(data, result);
  renderSummary(result);
};

const renderFunds = (data, result) => {
  const tbody = document.getElementById("fundsTable");
  tbody.innerHTML = "";

  fundNames.forEach(name => {
    const row = document.createElement("tr");
    row.innerHTML = `<td>${name}</td>`;

    const initial = document.createElement("td");
    initial.appendChild(makeNumberInput(data.funds[name], value => {
      data.funds[name] = value;
      saveState();
      render();
    }));

    row.appendChild(initial);
    row.innerHTML += `
      <td class="money">${euro(result.funds[name].variable)}</td>
      <td class="money">${euro(result.funds[name].fixed)}</td>
      <td class="money ${result.funds[name].current < 0 ? "negative" : ""}">${euro(result.funds[name].current)}</td>
    `;

    tbody.appendChild(row);
  });

  document.getElementById("fundsInitialTotal").textContent = euro(result.totalInitial);
  document.getElementById("fundsVariableTotal").textContent = euro(result.totalVariable);
  document.getElementById("fundsFixedTotal").textContent = euro(result.totalFixed);
  document.getElementById("fundsCurrentTotal").textContent = euro(result.totalCurrent);
};

const renderBudgets = (data, result) => {
  const tbody = document.getElementById("budgetTable");
  tbody.innerHTML = "";

  categories.forEach(category => {
    const row = document.createElement("tr");
    row.innerHTML = `<td>${category}</td>`;

    const budget = document.createElement("td");
    budget.appendChild(makeNumberInput(data.budgets[category], value => {
      data.budgets[category] = value;
      saveState();
      render();
    }));

    const amount = document.createElement("td");
    amount.appendChild(makeNumberInput(data.quick[category].amount, value => {
      data.quick[category].amount = value;
      saveState();
      render();
    }));

    const source = document.createElement("td");
    source.appendChild(makeSourceSelect(data.quick[category].source, value => {
      data.quick[category].source = value;
      saveState();
      render();
    }));

    row.appendChild(budget);
    row.appendChild(amount);
    row.appendChild(source);

    row.innerHTML += `
      <td class="money">${euro(result.budgets[category].spent)}</td>
      <td class="money ${result.budgets[category].left < 0 ? "negative" : ""}">${euro(result.budgets[category].left)}</td>
    `;

    tbody.appendChild(row);
  });

  const quickTotal = Object.values(data.quick).reduce((total, item) => total + (Number(item.amount) || 0), 0);

  document.getElementById("budgetTotal").textContent = euro(result.totalBudget);
  document.getElementById("quickTotal").textContent = euro(quickTotal);
  document.getElementById("budgetSpentTotal").textContent = euro(result.totalBudgetSpent);
  document.getElementById("budgetLeftTotal").textContent = euro(result.totalBudgetLeft);
};

const renderMovements = data => {
  const tbody = document.getElementById("movementsTable");
  tbody.innerHTML = "";

  data.movements.forEach((movement, index) => {
    const row = document.createElement("tr");

    const date = document.createElement("td");
    date.appendChild(makeTextInput(movement.date, value => {
      movement.date = value;
      saveState();
    }));

    const category = document.createElement("td");
    category.appendChild(makeCategorySelect(movement.category, value => {
      movement.category = value;
      saveState();
      render();
    }));

    const amount = document.createElement("td");
    amount.appendChild(makeNumberInput(movement.amount, value => {
      movement.amount = value;
      saveState();
      render();
    }));

    const source = document.createElement("td");
    source.appendChild(makeSourceSelect(movement.source, value => {
      movement.source = value;
      saveState();
      render();
    }));

    const note = document.createElement("td");
    note.appendChild(makeTextInput(movement.note, value => {
      movement.note = value;
      saveState();
    }));

    const remove = document.createElement("td");
    remove.innerHTML = `<button class="delete-button">×</button>`;
    remove.querySelector("button").addEventListener("click", () => {
      data.movements.splice(index, 1);
      saveState();
      render();
    });

    row.append(date, category, amount, source, note, remove);
    tbody.appendChild(row);
  });
};

const renderFixed = (data, result) => {
  const tbody = document.getElementById("fixedTable");
  tbody.innerHTML = "";

  Object.entries(data.fixed).forEach(([name, item]) => {
    const paid = String(item.paid).toLowerCase().startsWith("s");
    const row = document.createElement("tr");

    row.innerHTML = `<td>${name}</td>`;

    const amount = document.createElement("td");
    amount.appendChild(makeNumberInput(item.amount, value => {
      item.amount = value;
      saveState();
      render();
    }));

    const source = document.createElement("td");
    source.appendChild(makeSourceSelect(item.source, value => {
      item.source = value;
      saveState();
      render();
    }));

    const paidCell = document.createElement("td");
    paidCell.appendChild(makeYesNoSelect(item.paid, value => {
      item.paid = value;
      saveState();
      render();
    }));

    row.append(amount, source, paidCell);

    row.innerHTML += `
      <td class="money">${euro(paid ? 0 : item.amount)}</td>
      <td>${paid ? "Pagata" : "Da pagare"}</td>
    `;

    tbody.appendChild(row);
  });

  document.getElementById("fixedTotal").textContent = euro(result.fixedTotal);
  document.getElementById("fixedToPay").textContent = euro(result.fixedToPay);
  document.getElementById("fixedPaid").textContent = euro(result.fixedPaid);
};

const renderSummary = result => {
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

  document.getElementById("summaryList").innerHTML = rows.map(row => `
    <div class="summary-row ${row[3] ? "highlight" : ""}">
      <b>${row[0]}</b>
      <strong class="${row[1] < 0 ? "negative" : ""}">${euro(row[1])}</strong>
      <span>${row[2]}</span>
    </div>
  `).join("");

  document.getElementById("freeMoney").textContent = euro(result.freeMoney);
  document.getElementById("monthForecast").textContent = euro(result.forecast);
  document.getElementById("monthStatus").textContent = result.freeMoney < 0 ? "RISCHIO" : "OK";
};

document.getElementById("monthSelect").addEventListener("change", event => {
  currentMonth = event.target.value;
  saveState();
  render();
});

document.getElementById("yearInput").addEventListener("input", event => {
  monthData().year = Number(event.target.value) || 2026;
  saveState();
});

document.getElementById("addMovementBtn").addEventListener("click", () => {
  monthData().movements.push({
    date: new Date().toLocaleDateString("it-IT"),
    category: categories[0],
    amount: 0,
    source: "",
    note: ""
  });

  saveState();
  render();
});

render();
