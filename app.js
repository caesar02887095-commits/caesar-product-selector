const PRODUCT_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTntfwmNxwhqWVrPsU4sxhBHfDmvDOMSjjBXySgpOeaZLxdT7lsX6RfjrPgZbiV0N9QXSN_xRy5nWjD/pub?gid=0&single=true&output=csv";

let products = [];
let selectedModelByDemandId = new Map();

const els = {
  status: document.getElementById("statusText"),
  resultList: document.getElementById("resultList"),
  discount: document.getElementById("discountInput"),
  budget: document.getElementById("budgetInput"),
  accessible: document.getElementById("accessibleInput"),
  toiletQty: document.getElementById("toiletQty"),
  basinFaucetQty: document.getElementById("basinFaucetQty"),
  showerFaucetQty: document.getElementById("showerFaucetQty"),
  grabBarQty: document.getElementById("grabBarQty"),
  vanityRows: document.getElementById("vanityRows"),
  mirrorRows: document.getElementById("mirrorRows"),
  runButton: document.getElementById("runButton"),
  totalListPrice: document.getElementById("totalListPrice"),
  totalDiscountedPrice: document.getElementById("totalDiscountedPrice"),
  budgetDiff: document.getElementById("budgetDiff"),
  rowTemplate: document.getElementById("demandRowTemplate")
};

const CATEGORY_MAP = {
  toilet: ["馬桶", "智慧馬桶"],
  vanity: ["浴櫃/臉盆組", "臉盆浴櫃組"],
  mirror: ["鏡櫃", "鏡子", "鏡子/鏡櫃"],
  basinFaucet: ["面盆龍頭", "臉盆龍頭"],
  showerFaucet: ["沐浴龍頭", "浴用龍頭"],
  grabBar: ["扶手", "無障礙", "無障礙/扶手"]
};

document.addEventListener("DOMContentLoaded", async () => {
  addDemandRow("vanity", { qty: 1, width: 600 });
  addDemandRow("mirror", { qty: 1, width: 600 });

  document.querySelectorAll("[data-add-row]").forEach((btn) => {
    btn.addEventListener("click", () => addDemandRow(btn.dataset.addRow));
  });

  els.runButton.addEventListener("click", () => {
    selectedModelByDemandId.clear();
    renderEstimate();
  });

  await loadProducts();
});

async function loadProducts() {
  try {
    setStatus("正在讀取產品資料。");
    const response = await fetch(PRODUCT_CSV_URL, { cache: "no-store" });
    if (!response.ok) throw new Error(`CSV讀取失敗：${response.status}`);
    const csvText = await response.text();
    const rows = parseCSV(csvText);
    products = rows.map(normalizeProduct).filter((p) => p.visible);
    setStatus(`已載入 ${products.length} 筆可顯示產品。`);
  } catch (err) {
    console.error(err);
    setStatus("產品資料載入失敗。請確認 Google Sheet 是否已發布成 CSV。");
  }
}

function normalizeProduct(row) {
  return {
    visible: parseBool(row["是否顯示"]),
    category: clean(row["類別"]),
    model: clean(row["型號"]),
    name: clean(row["品名"]),
    listPrice: parseMoney(row["定價"]),
    width: parseNumber(row["寬度mm"]),
    size: clean(row["尺寸"]),
    features: clean(row["特殊功能"]),
    accessible: parseBool(row["是否無障礙"]),
    sort: parseNumber(row["推薦排序"]) || 9999,
    imageUrl: clean(row["圖片URL"]),
    officialUrl: clean(row["官網URL"]),
    note: clean(row["備註"]),
    source: clean(row["來源頁"])
  };
}

function addDemandRow(type, defaults = {}) {
  const fragment = els.rowTemplate.content.cloneNode(true);
  const row = fragment.querySelector(".demand-row");
  row.querySelector(".qty").value = defaults.qty ?? 1;
  row.querySelector(".width").value = defaults.width ?? "";
  row.querySelector(".remove-row").addEventListener("click", () => row.remove());

  if (type === "vanity") els.vanityRows.appendChild(fragment);
  if (type === "mirror") els.mirrorRows.appendChild(fragment);
}

function renderEstimate() {
  if (!products.length) {
    setStatus("尚未載入產品資料。");
    return;
  }

  const discount = clamp(parseNumber(els.discount.value) || 35, 1, 100);
  const budget = parseNumber(els.budget.value);
  const preferAccessible = els.accessible.checked;
  const demands = buildDemands();
  const selected = demands.map((demand) => {
    const candidates = findCandidates(demand, preferAccessible);
    const savedModel = selectedModelByDemandId.get(demand.id);
    const chosen = candidates.find((p) => p.model === savedModel) || candidates[0];

    if (chosen) return { ...chosen, demand, candidates };
    return { missing: true, demand, candidates: [] };
  });

  drawResults(selected, discount, budget);
}

function buildDemands() {
  const demands = [];

  const toiletQty = parseNumber(els.toiletQty.value);
  if (toiletQty > 0) demands.push({ id: "toilet", type: "toilet", label: "馬桶", qty: toiletQty });

  getDemandRows(els.vanityRows).forEach((item, index) => {
    if (item.qty > 0) demands.push({ id: `vanity-${index}-${item.width || 0}`, type: "vanity", label: `浴櫃/臉盆組 ${index + 1}`, qty: item.qty, width: item.width });
  });

  getDemandRows(els.mirrorRows).forEach((item, index) => {
    if (item.qty > 0) demands.push({ id: `mirror-${index}-${item.width || 0}`, type: "mirror", label: `鏡櫃/鏡子 ${index + 1}`, qty: item.qty, width: item.width });
  });

  const basinQty = parseNumber(els.basinFaucetQty.value);
  if (basinQty > 0) demands.push({ id: "basinFaucet", type: "basinFaucet", label: "面盆龍頭", qty: basinQty });

  const showerQty = parseNumber(els.showerFaucetQty.value);
  if (showerQty > 0) demands.push({ id: "showerFaucet", type: "showerFaucet", label: "沐浴龍頭", qty: showerQty });

  const grabQty = parseNumber(els.grabBarQty.value);
  if (grabQty > 0) demands.push({ id: "grabBar", type: "grabBar", label: "扶手 / 無障礙配件", qty: grabQty, requireAccessible: true });

  return demands;
}

function getDemandRows(container) {
  return Array.from(container.querySelectorAll(".demand-row")).map((row) => ({
    qty: parseNumber(row.querySelector(".qty").value),
    width: parseNumber(row.querySelector(".width").value)
  }));
}

function findCandidates(demand, preferAccessible) {
  const categoryNames = CATEGORY_MAP[demand.type] || [];
  let candidates = products.filter((p) => categoryNames.some((name) => p.category.includes(name) || name.includes(p.category)));

  if (demand.requireAccessible) {
    candidates = candidates.filter((p) => p.accessible || p.category.includes("無障礙") || p.features.includes("無障礙"));
  }

  if (demand.width) {
    const exactOrNear = candidates
      .map((p) => ({ ...p, widthDelta: Math.abs((p.width || 0) - demand.width) }))
      .filter((p) => p.width && p.widthDelta <= 100);
    if (exactOrNear.length) candidates = exactOrNear;
  }

  return candidates.sort((a, b) => {
    if (preferAccessible && a.accessible !== b.accessible) return a.accessible ? -1 : 1;
    if ((a.widthDelta ?? 9999) !== (b.widthDelta ?? 9999)) return (a.widthDelta ?? 9999) - (b.widthDelta ?? 9999);
    if (a.sort !== b.sort) return a.sort - b.sort;
    return a.listPrice - b.listPrice;
  });
}

function drawResults(selected, discount, budget) {
  els.resultList.innerHTML = "";
  let totalList = 0;
  let totalDiscounted = 0;

  if (!selected.length) {
    els.resultList.innerHTML = `<div class="empty">沒有設定任何需求數量。</div>`;
    updateSummary(0, 0, budget);
    return;
  }

  for (const item of selected) {
    if (item.missing) {
      const block = document.createElement("div");
      block.className = "product-card";
      block.innerHTML = `
        <div class="product-img">無資料</div>
        <div>
          <p class="model">${escapeHtml(item.demand.label)}</p>
          <p class="name">找不到符合條件的產品，請檢查類別、寬度或 PRODUCT_MASTER 是否顯示。</p>
        </div>
      `;
      els.resultList.appendChild(block);
      continue;
    }

    const qty = item.demand.qty || 1;
    const discountedUnit = Math.round(item.listPrice * discount / 100);
    const subtotalList = item.listPrice * qty;
    const subtotalDiscounted = discountedUnit * qty;

    totalList += subtotalList;
    totalDiscounted += subtotalDiscounted;

    els.resultList.appendChild(createProductCard(item, qty, discount, discountedUnit, subtotalDiscounted));
  }

  updateSummary(totalList, totalDiscounted, budget);
}

function createProductCard(product, qty, discount, discountedUnit, subtotalDiscounted) {
  const officialUrl = product.officialUrl || buildCaesarProductUrl(product.model);
  const imageContent = product.imageUrl
    ? `<img src="${escapeAttr(product.imageUrl)}" alt="${escapeAttr(product.model)}" loading="lazy">`
    : `<span>無圖片<br>可補圖片URL</span>`;

  const card = document.createElement("article");
  card.className = "product-card";
  card.innerHTML = `
    <a class="product-img" href="${escapeAttr(officialUrl)}" target="_blank" rel="noopener noreferrer">${imageContent}</a>
    <div class="product-main">
      <div class="product-title-row">
        <div>
          <p class="model">${escapeHtml(product.model)}</p>
          <p class="name">${escapeHtml(product.name)}</p>
        </div>
        <a class="open-link" href="${escapeAttr(officialUrl)}" target="_blank" rel="noopener noreferrer">進入官網</a>
      </div>
      <p class="tags">${escapeHtml(product.features || "未填特殊功能")}</p>
      <div class="price-grid">
        <div><span>定價</span><strong>${money(product.listPrice)}</strong></div>
        <div><span>折後單價</span><strong>${money(discountedUnit)}</strong></div>
        <div><span>數量</span><strong>${qty}</strong></div>
        <div><span>小計</span><strong>${money(subtotalDiscounted)}</strong></div>
      </div>
      ${buildAltSection(product, qty, discount)}
    </div>
  `;

  const toggle = card.querySelector(".alt-toggle");
  if (toggle) toggle.addEventListener("click", () => card.querySelector(".alt-list").classList.toggle("is-open"));

  card.querySelectorAll(".choose-alt").forEach((btn) => {
    btn.addEventListener("click", () => {
      selectedModelByDemandId.set(btn.dataset.demandId, btn.dataset.model);
      renderEstimate();
    });
  });

  return card;
}

function buildAltSection(product, qty, discount) {
  const candidates = product.candidates || [];
  const alternatives = candidates.filter((p) => p.model !== product.model).slice(0, 8);
  if (!alternatives.length) return "";

  const currentDiscounted = Math.round(product.listPrice * discount / 100);
  const items = alternatives.map((alt) => {
    const altDiscounted = Math.round(alt.listPrice * discount / 100);
    const diff = (altDiscounted - currentDiscounted) * qty;
    const diffText = diff >= 0 ? `+${money(diff)}` : `-${money(Math.abs(diff))}`;
    const url = alt.officialUrl || buildCaesarProductUrl(alt.model);

    const thumb = alt.imageUrl
      ? `<img src="${escapeAttr(alt.imageUrl)}" alt="${escapeAttr(alt.model)}" loading="lazy">`
      : `<span>無圖</span>`;

    return `
      <div class="alt-item">
        <a class="alt-thumb" href="${escapeAttr(url)}" target="_blank" rel="noopener noreferrer">${thumb}</a>
        <div class="alt-info">
          <strong>${escapeHtml(alt.model)}</strong>
          <div>${escapeHtml(alt.name)}</div>
          <small>${escapeHtml(alt.features || "")}</small>
        </div>
        <div class="alt-action">
          <div>${money(altDiscounted)} / 件</div>
          <div>差額 ${diffText}</div>
          <a href="${escapeAttr(url)}" target="_blank" rel="noopener noreferrer">官網</a>
          <button class="choose-alt" type="button" data-demand-id="${escapeAttr(product.demand.id)}" data-model="${escapeAttr(alt.model)}">改選此品項</button>
        </div>
      </div>
    `;
  }).join("");

  return `<button class="alt-toggle" type="button">展開其他可選型號</button><div class="alt-list">${items}</div>`;
}

function updateSummary(totalList, totalDiscounted, budget) {
  els.totalListPrice.textContent = money(totalList);
  els.totalDiscountedPrice.textContent = money(totalDiscounted);

  if (!budget) {
    els.budgetDiff.textContent = "未填預算";
    return;
  }

  const diff = budget - totalDiscounted;
  els.budgetDiff.textContent = diff >= 0 ? `剩餘 ${money(diff)}` : `超出 ${money(Math.abs(diff))}`;
}

function buildCaesarProductUrl(model) {
  const value = String(model || "").trim().toUpperCase();
  if (!value) return "";

  const useGoogleSearch = value.includes("/") || value.includes(" ") || value === "DF140EV";
  if (useGoogleSearch) {
    return "https://www.google.com/search?q=" + encodeURIComponent("凱撒衛浴 " + value);
  }

  return "https://www.caesar.com.tw/product/detail/" + encodeURIComponent(value);
}

function parseCSV(text) {
  const rows = [];
  let current = [];
  let value = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      value += '"';
      i++;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      current.push(value);
      value = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i++;
      current.push(value);
      if (current.some((cell) => cell !== "")) rows.push(current);
      current = [];
      value = "";
    } else {
      value += char;
    }
  }

  current.push(value);
  if (current.some((cell) => cell !== "")) rows.push(current);

  const headers = rows.shift() || [];
  return rows.map((row) => {
    const obj = {};
    headers.forEach((header, index) => { obj[header] = row[index] ?? ""; });
    return obj;
  });
}

function parseMoney(value) {
  return parseNumber(String(value || "").replace(/,/g, ""));
}

function parseNumber(value) {
  const num = Number(String(value || "").replace(/,/g, "").trim());
  return Number.isFinite(num) ? num : 0;
}

function parseBool(value) {
  const text = String(value || "").trim().toUpperCase();
  return ["TRUE", "YES", "Y", "1", "是"].includes(text);
}

function clean(value) {
  return String(value ?? "").trim();
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function money(value) {
  return new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency: "TWD",
    maximumFractionDigits: 0
  }).format(value || 0);
}

function setStatus(message) {
  els.status.textContent = message;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value);
}
