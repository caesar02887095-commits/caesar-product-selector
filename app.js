
const APP_VERSION = "202608030941";

function forceInitialDefaults() {
  const discount = document.getElementById("discountInput");
  if (discount) discount.value = "45";

  const qtyIds = [
    "toiletQty",
    "basinFaucetQty",
    "showerFaucetQty",
    "kitchenFaucetQty",
    "towelRackQty",
    "shelfQty",
    "hookQty",
    "exhaustFanQty",
    "bathHeaterQty",
    "towelWarmerQty",
    "electricClothesRackQty",
    "handDryerQty",
    "electricWaterHeaterQty",
    "urinalQty",
    "bathtubQty",
    "showerDoorQty",
    "grabBarQty"
  ];

  qtyIds.forEach((id) => {
    const input = document.getElementById(id);
    if (input) input.value = "0";
  });

  document.querySelectorAll(".demand-row .qty").forEach((input) => {
    input.value = "0";
  });

  document.querySelectorAll(".sub-option input[type='checkbox']").forEach((checkbox) => {
    checkbox.checked = false;
  });
}

function getQuantityFromItemRow(row) {
  const input = row ? row.querySelector(".qty-input, input[type='number'], input") : null;
  const value = Number(input && input.value ? input.value : 0);
  return Number.isFinite(value) ? value : 0;
}

function refreshConditionalOptionVisibility() {
  // v28 左側改為明確群組，附屬選項固定顯示，不再做自動收合。
}

function initializePageState() {
  try {
    Object.keys(localStorage || {}).forEach((key) => {
      if (/caesar|selector|product/i.test(key)) localStorage.removeItem(key);
    });
    sessionStorage.setItem("caesarSelectorVersion", APP_VERSION);
  } catch (error) {
    // ignore storage errors
  }

  forceInitialDefaults();
  refreshConditionalOptionVisibility();
}



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
  includeBidetSeat: document.getElementById("includeBidetSeat"),
  toiletPipe: document.getElementById("toiletPipe"),
  includeShowerSlider: document.getElementById("includeShowerSlider"),
  basinFaucetQty: document.getElementById("basinFaucetQty"),
  basinDrainMode: document.getElementById("basinDrainMode"),
  showerFaucetQty: document.getElementById("showerFaucetQty"),
  kitchenFaucetQty: document.getElementById("kitchenFaucetQty"),
  bathAccessoryQty: document.getElementById("bathAccessoryQty"),
  towelWarmerQty: document.getElementById("towelWarmerQty"),
  bathHeaterQty: document.getElementById("bathHeaterQty"),
  bathtubQty: document.getElementById("bathtubQty"),
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
  toiletCombo: ["馬桶組合", "智慧馬桶"],
  toilet: ["馬桶"],
  smartToilet: ["智慧馬桶"],
  bidetSeat: ["溫水洗淨便座"],
  vanity: ["浴櫃/臉盆組", "臉盆浴櫃組", "浴櫃", "臉盆"],
  mirror: ["鏡櫃", "鏡子", "鏡子/鏡櫃", "開放櫃"],
  basinFaucet: ["面盆龍頭", "臉盆龍頭"],
  showerFaucet: ["沐浴龍頭", "浴用龍頭", "控溫沐浴龍頭組"],
  kitchenFaucet: ["廚房龍頭", "電漿滅菌廚房龍頭"],
  bathAccessory: ["浴室配件", "滑桿/蓮蓬頭"],
  exhaustFan: ["抽風扇", "換氣扇", "排風扇"],
  towelWarmer: ["電熱毛巾架"],
  bathHeater: ["浴室暖風乾燥機", "暖風機"],
  clothesRack: ["電動曬衣架", "曬衣架"],
  handDryer: ["烘手機"],
  waterHeater: ["電能熱水器", "電熱水器", "熱水器"],
  urinal: ["小便斗", "小便器", "小便斗沖水器", "感應器", "指壓"],
  bathtub: ["浴缸"],
  showerDoor: ["淋浴拉門", "無框淋浴拉門", "乾濕分離", "淋浴門"],
  grabBar: ["扶手", "無障礙", "無障礙/扶手"]
};



async function loadProducts() {
  try {
    setStatus("正在讀取產品資料。");
    const response = await fetch(PRODUCT_CSV_URL, { cache: "no-store" });
    if (!response.ok) throw new Error(`CSV讀取失敗：${response.status}`);
    const csvText = await response.text();
    const rows = parseCSV(csvText);
    products = rows.map(normalizeProduct).filter((p) => p.visible);
    assignAutoPriceBands(products);
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
    source: clean(row["來源頁"]),
    pipeDistance: clean(row["糞管距離cm"]),
    internalPriceBand: clamp(parseNumber(row["內部價格帶"]), 1, 5),
    priceBandOverride: clean(row["價格帶修正"])
  };
}

function assignAutoPriceBands(productList) {
  const groups = new Map();
  productList.forEach((product) => {
    if (!product || !product.category || !Number(product.listPrice)) return;
    if (!groups.has(product.category)) groups.set(product.category, []);
    groups.get(product.category).push(product);
  });

  groups.forEach((items) => {
    const sorted = [...items].sort((a, b) => Number(a.listPrice || 0) - Number(b.listPrice || 0));
    const count = sorted.length;
    sorted.forEach((item, index) => {
      if (item.internalPriceBand) return;
      const band = count <= 1 ? 3 : Math.floor(index * 5 / count) + 1;
      item.internalPriceBand = clamp(band, 1, 5);
    });
  });
}

function getEffectivePriceBand(product) {
  if (!product) return 0;
  let band = clamp(parseNumber(product.internalPriceBand), 1, 5);
  const override = String(product.priceBandOverride || "");
  if (!band) return 0;
  if (override.includes("上修")) band += 1;
  if (override.includes("下修")) band -= 1;
  return clamp(band, 1, 5);
}

function getDemandBalanceRole(demand, item) {
  const type = demand?.type || "";
  if (["toilet", "smartToilet", "vanity", "bathtub", "urinal"].includes(type)) return "primary";
  if (["bidetSeat", "basinFaucet", "showerFaucet", "showerSlider", "kitchenFaucet", "mirror", "bathAccessory", "grabBar", "towelWarmer", "bathHeater", "exhaustFan", "clothesRack", "handDryer", "waterHeater"].includes(type)) return "secondary";
  if (item && isSmartToiletProduct(item)) return "primary";
  return "neutral";
}

function averagePriceBand(bands) {
  const list = (bands || []).filter((n) => Number.isFinite(n) && n > 0);
  if (!list.length) return 0;
  return list.reduce((sum, n) => sum + n, 0) / list.length;
}

function scorePriceBandHarmony(item, demand, state) {
  if (item.isForcedSelection) return 0;
  const band = getEffectivePriceBand(item);
  if (!band) return 0;

  const role = getDemandBalanceRole(demand, item);
  const target = averagePriceBand(state.primaryBands);
  if (!target) return 0;

  const diff = Math.abs(band - target);
  if (role === "secondary") {
    if (diff <= 1) return 900;
    return -4500 * Math.pow(diff - 1, 2);
  }

  if (role === "primary") {
    if (diff <= 1.5) return 300;
    return -1200 * Math.pow(diff - 1.5, 2);
  }

  return 0;
}

function nextPrimaryBands(state, demand, item) {
  const band = getEffectivePriceBand(item);
  if (!band) return state.primaryBands || [];
  return getDemandBalanceRole(demand, item) === "primary"
    ? [...(state.primaryBands || []), band]
    : (state.primaryBands || []);
}

function budgetStateValue(state, budget) {
  const gap = Math.max(0, Number(budget || 0) - Number(state.total || 0));
  return Number(state.score || 0) - gap * 0.02;
}

function addDemandRow(type, defaults = {}) {
  const fragment = els.rowTemplate.content.cloneNode(true);
  const row = fragment.querySelector(".demand-row");
  row.querySelector(".qty").value = defaults.qty ?? 0;
  row.querySelector(".width").value = defaults.width ?? "";
  row.querySelector(".remove-row").addEventListener("click", () => {
    row.remove();
    refreshConditionalOptionVisibility();
      markDirty();
  });
  if (type === "vanity") els.vanityRows.appendChild(fragment);
  if (type === "mirror") els.mirrorRows.appendChild(fragment);
}


let hasGeneratedOnce = false;

function markDirty() {
  const resultList = document.getElementById("resultList");
  if (hasGeneratedOnce) {
    setStatus("資料已變更，請按「產生選品」更新右側結果。");
  } else {
    setStatus("設定完成後，請按「產生選品」。");
  }
}


function normalizeWidthInputToMm(value) {
  const raw = String(value || "").trim();
  if (!raw) return 0;
  const n = Number(raw.replace(/[^\d.]/g, ""));
  if (!Number.isFinite(n) || n <= 0) return 0;
  // 畫面輸入採 cm；若舊資料或使用者輸入 600 以上，視為已經是 mm。
  return n >= 300 ? Math.round(n) : Math.round(n * 10);
}


function renderEstimate() {
  refreshConditionalOptionVisibility();
  hasGeneratedOnce = true;
  window.__lastAutoAdjustNotice = "";
  if (!products.length) {
    setStatus("尚未載入產品資料。");
    return;
  }

  const discount = clamp(parseNumber(els.discount.value) || 45, 1, 100);
  const budget = parseNumber(els.budget.value);
  const preferAccessible = els.accessible.checked;
  const demands = buildDemands();

  const demandCandidates = demands.map((demand) => {
    const candidates = findCandidates(demand, preferAccessible);
    return { demand, candidates };
  });

  ensureLinkedBidetSeatSelection(demandCandidates);

  const selected = budget > 0
    ? selectBudgetAwareItems(demandCandidates, discount, budget)
    : selectDefaultItems(demandCandidates);

  drawResults(selected, discount, budget);

  if (window.__lastAutoAdjustNotice) {
    setStatus(window.__lastAutoAdjustNotice);
  }
}


function isSuppressedDemand(demand, selectedItems) {
  if (!demand || !selectedItems) return false;
  return selectedItems.some((item) => Array.isArray(item.suppressesDemandIds) && item.suppressesDemandIds.includes(demand.id));
}

function buildSuppressedSetFromItems(items) {
  const set = new Set();
  (items || []).forEach((item) => {
    (item.suppressesDemandIds || []).forEach((id) => set.add(id));
  });
  return set;
}

function selectDefaultItems(demandCandidates) {
  const selected = [];

  for (const { demand, candidates } of demandCandidates) {
    if (isSuppressedDemand(demand, selected)) continue;
    const savedKey = selectedModelByDemandId.get(demand.id);
    const chosen = candidates.find((p) => getProductKey(p) === savedKey) || candidates[0];
    selected.push(chosen ? { ...chosen, demand, candidates } : { missing: true, demand, candidates: [] });
  }

  return selected;
}

function selectBudgetAwareItems(demandCandidates, discount, budget) {
  const prepared = demandCandidates.map(({ demand, candidates }) => {
    const savedKey = selectedModelByDemandId.get(demand.id);

    const mapped = candidates
      .filter((p) => p.listPrice > 0)
      .map((p) => ({
        ...p,
        discountedUnit: Math.round(p.listPrice * discount / 100),
        subtotal: Math.round(p.listPrice * discount / 100) * (demand.qty || 1),
        budgetScore: scoreCandidateForBudget(p, demand)
      }));

    const sortedCandidates = mapped
      .sort((a, b) => {
        if ((a.widthDelta ?? 9999) !== (b.widthDelta ?? 9999)) return (a.widthDelta ?? 9999) - (b.widthDelta ?? 9999);
        if (b.budgetScore !== a.budgetScore) return b.budgetScore - a.budgetScore;
        return a.listPrice - b.listPrice;
      })
      .slice(0, 260);

    const forced = savedKey ? sortedCandidates.find((p) => getProductKey(p) === savedKey) : null;

    const candidatesForBudget = forced
      ? [{ ...forced, isForcedSelection: true }]
      : sortedCandidates;

    return {
      demand,
      candidates: candidatesForBudget,
      allCandidates: sortedCandidates
    };
  });

  const missingGroups = prepared.filter((group) => !group.candidates.length);
  const activeGroups = prepared.filter((group) => group.candidates.length);

  const buildMissingItems = (suppressedSet = new Set()) => missingGroups
    .filter(({ demand }) => !suppressedSet.has(demand.id))
    .map(({ demand, allCandidates, candidates }) => ({
      missing: true,
      demand,
      candidates: allCandidates && allCandidates.length ? allCandidates : candidates
    }));

  const mergeByDemandOrder = (picked) => {
    const suppressedSet = buildSuppressedSetFromItems(picked);
    const pickedByDemandId = new Map(picked.map((item) => [item.demand.id, item]));
    const missingByDemandId = new Map(buildMissingItems(suppressedSet).map((item) => [item.demand.id, item]));
    return prepared
      .filter((group) => !suppressedSet.has(group.demand.id))
      .map((group) => pickedByDemandId.get(group.demand.id) || missingByDemandId.get(group.demand.id))
      .filter(Boolean);
  };

  if (!activeGroups.length) {
    return buildMissingItems();
  }

  let states = new Map();
  states.set("0|", { total: 0, score: 0, picks: [], suppressedDemandIds: new Set(), primaryBands: [] });

  for (const group of activeGroups) {
    const next = new Map();

    for (const state of states.values()) {
      if (state.suppressedDemandIds.has(group.demand.id)) {
        const key = `${state.total}|${[...state.suppressedDemandIds].sort().join(",")}`;
        const existing = next.get(key);
        if (!existing || state.score > existing.score) next.set(key, state);
        continue;
      }

      for (const item of group.candidates) {
        const total = state.total + item.subtotal;
        if (total > budget) continue;

        const suppressedDemandIds = new Set(state.suppressedDemandIds);
        (item.suppressesDemandIds || []).forEach((id) => suppressedDemandIds.add(id));

        const harmonyScore = scorePriceBandHarmony(item, group.demand, state);
        const score = state.score + item.budgetScore + harmonyScore + (item.isForcedSelection ? 100000 : 0);
        const primaryBands = nextPrimaryBands(state, group.demand, item);
        const key = `${total}|${[...suppressedDemandIds].sort().join(",")}`;
        const existing = next.get(key);

        if (!existing || budgetStateValue({ total, score }, budget) > budgetStateValue(existing, budget)) {
          next.set(key, {
            total,
            score,
            suppressedDemandIds,
            primaryBands,
            picks: [
              ...state.picks,
              {
                ...item,
                demand: group.demand,
                candidates: group.allCandidates && group.allCandidates.length ? group.allCandidates : group.candidates
              }
            ]
          });
        }
      }
    }

    states = pruneBudgetStates(next, budget, 1400);
  }

  if (!states.size) {
    const picked = [];
    const suppressedSet = new Set();

    for (const { demand, candidates, allCandidates } of activeGroups) {
      if (suppressedSet.has(demand.id)) continue;
      const cheapest = [...candidates].sort((a, b) => a.subtotal - b.subtotal || b.budgetScore - a.budgetScore)[0];
      (cheapest.suppressesDemandIds || []).forEach((id) => suppressedSet.add(id));
      picked.push({
        ...cheapest,
        demand,
        candidates: allCandidates && allCandidates.length ? allCandidates : candidates,
        budgetReason: cheapest.isForcedSelection ? "手動改選" : "最低可用"
      });
    }
    return mergeByDemandOrder(picked);
  }

  const best = [...states.values()].sort((a, b) => {
    const valueDiff = budgetStateValue(b, budget) - budgetStateValue(a, budget);
    if (Math.abs(valueDiff) > 0.001) return valueDiff;
    const aGap = budget - a.total;
    const bGap = budget - b.total;
    return aGap - bGap;
  })[0];

  const picked = best.picks.map((item) => ({
    ...item,
    budgetReason: item.isForcedSelection ? "手動改選" : "預算匹配"
  }));

  return mergeByDemandOrder(picked);
}

function pruneBudgetStates(states, budget, limit) {
  const list = [...states.entries()].sort((a, b) => {
    const stateA = a[1];
    const stateB = b[1];
    const valueDiff = budgetStateValue(stateB, budget) - budgetStateValue(stateA, budget);
    if (Math.abs(valueDiff) > 0.001) return valueDiff;
    const aGap = budget - stateA.total;
    const bGap = budget - stateB.total;
    return aGap - bGap;
  });

  const keep = new Map();

  for (const [key, state] of list) {
    if (!keep.has(key)) keep.set(key, state);
    if (keep.size >= limit) break;
  }

  return keep;
}

function scoreCandidateForBudget(item, demand) {
  let score = 0;

  // 推薦排序仍保留，但不再凌駕於預算匹配。
  score += Math.max(0, 10000 - (item.sort || 9999));

  // 內部價格帶只用於推薦平衡，不會顯示在畫面上。
  const priceBand = getEffectivePriceBand(item);
  if (priceBand) score += priceBand * 80;

  // 寬度越接近越好。
  score += Math.max(0, 1000 - (item.widthDelta ?? 9999)) * 2;

  // 無障礙需求加權。
  if (demand.requireAccessible && item.accessible) score += 5000;

  // 組合品項給小幅加分，讓鏡櫃組合有機會被選到。
  if (item.isCombo || String(item.category || "").includes("組合")) score += 300;

  // 勾選電腦馬桶蓋時，智慧馬桶與一般馬桶+便座必須都能進入預算比較。
  // 智慧馬桶若被選中，會抑制同組電腦馬桶蓋需求，不再額外加一張便座卡。
  if (demand.allowSmartToilet && isSmartToiletProduct(item)) score += 3500;
  if (item.sourceType === "馬桶+便座") score += 2500;
  if (item.sourceType === "智慧馬桶") score += 1500;
  if (item.sourceType === "沐浴龍頭+滑桿" || item.sourceType === "沐浴龍頭含滑桿") score += 1200;

  return score;
}

function sumSelectedSubtotal(selected, discount) {
  return selected.reduce((sum, item) => {
    if (item.missing) return sum;
    const qty = item.demand.qty || 1;
    return sum + Math.round(item.listPrice * discount / 100) * qty;
  }, 0);
}



function getBasinDrainMode() {
  return document.getElementById("basinDrainMode")?.value || "standard";
}

function getBasinDrainLabel(mode) {
  if (mode === "ceramicFixed") return "瓷蓋固定落水頭（搭 BT 系列）";
  if (mode === "ceramicPopUp") return "彈跳瓷蓋落水頭 +900（搭 BT 系列）";
  return "一般面盆排桿（搭 B 系列）";
}

function isCeramicBasinDrainMode(mode) {
  return mode === "ceramicFixed" || mode === "ceramicPopUp";
}

function splitModelAliases(model) {
  return String(model || "")
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean);
}

function isBTBasinFaucetModel(model) {
  return /^BT\d+/i.test(String(model || "").trim());
}

function isBBasinFaucetModel(model) {
  return /^B\d+/i.test(String(model || "").trim()) && !isBTBasinFaucetModel(model);
}

function buildBasinFaucetVariants(candidates, demand) {
  const mode = demand.basinDrainMode || "standard";
  const needsBT = isCeramicBasinDrainMode(mode);
  const variants = [];

  candidates.forEach((product) => {
    const aliases = splitModelAliases(product.model);
    const targetAlias = aliases.find((model) => needsBT ? isBTBasinFaucetModel(model) : isBBasinFaucetModel(model));

    if (targetAlias) {
      variants.push({
        ...product,
        model: targetAlias,
        originalModel: product.model,
        sourceType: needsBT ? "BT面盆龍頭" : "B面盆龍頭",
        features: `${needsBT ? "BT系列，不附落水頭，適用瓷蓋落水頭面盆" : "B系列，含一般落水頭/排桿，適用一般面盆"}｜${product.features || ""}`,
        notes: `${product.notes || product.note || ""}｜由 ${product.model} 依面盆落水頭規則拆分顯示`.replace(/^｜/, "")
      });
      return;
    }

    const productIsBT = isBTBasinFaucetModel(product.model);
    const productIsB = isBBasinFaucetModel(product.model);
    if ((needsBT && productIsBT) || (!needsBT && productIsB)) {
      variants.push({
        ...product,
        sourceType: needsBT ? "BT面盆龍頭" : "B面盆龍頭",
        features: `${needsBT ? "BT系列，不附落水頭，適用瓷蓋落水頭面盆" : "B系列，含一般落水頭/排桿，適用一般面盆"}｜${product.features || ""}`
      });
    }
  });

  const deduped = new Map();
  variants.forEach((item) => {
    const key = String(item.model || "").toUpperCase();
    const existing = deduped.get(key);
    if (!existing || Number(item.listPrice || 0) < Number(existing.listPrice || 0)) deduped.set(key, item);
  });

  return [...deduped.values()].sort((a, b) => {
    if (a.sort !== b.sort) return a.sort - b.sort;
    return Number(a.listPrice || 0) - Number(b.listPrice || 0);
  });
}

function buildFixedChargeCandidate(demand) {
  return {
    visible: true,
    category: demand.type,
    model: demand.fixedModel || demand.id,
    name: demand.fixedName || demand.label,
    listPrice: Number(demand.fixedPrice || 0),
    width: 0,
    size: "",
    features: demand.fixedFeatures || "固定加價品項",
    accessible: false,
    sort: 1,
    imageUrl: "",
    officialUrl: "",
    note: "前端依需求動態加入，非 PRODUCT_MASTER 實體列。",
    source: "frontend-dynamic",
    pipeDistance: ""
  };
}

function buildDemands() {
  const demands = [];
  const getQty = (id) => Math.max(0, parseNumber(document.getElementById(id)?.value));
  const addQtyDemand = (id, type, label) => {
    const qty = getQty(id);
    if (qty > 0) {
      demands.push({
        id: `${type}-${id}`,
        type,
        label,
        qty
      });
    }
  };

  const toiletQty = getQty("toiletQty");
  if (toiletQty > 0) {
    const includeBidetSeat = Boolean(document.getElementById("includeBidetSeat")?.checked);
    if (includeBidetSeat) {
      const groupId = "toilet-set-1";
      demands.push({
        id: "toilet-toilet",
        type: "toilet",
        label: "馬桶 / 智慧馬桶",
        qty: toiletQty,
        groupId,
        groupRole: "toilet",
        allowSmartToilet: true
      });
      demands.push({
        id: "bidetSeat-toilet",
        type: "bidetSeat",
        label: "電腦馬桶蓋 / 溫水洗淨便座",
        qty: toiletQty,
        groupId,
        groupRole: "bidetSeat",
        dependsOnDemandId: "toilet-toilet"
      });
    } else {
      demands.push({
        id: "toilet-toilet",
        type: "toilet",
        label: "馬桶",
        qty: toiletQty
      });
    }
  }

  document.querySelectorAll("#vanityRows .demand-row").forEach((row, index) => {
    const qty = Math.max(0, parseNumber(row.querySelector(".qty")?.value));
    const width = normalizeWidthInputToMm(row.querySelector(".width")?.value);
    if (qty > 0) {
      demands.push({
        id: `vanity-${index}`,
        type: "vanity",
        label: width ? `浴櫃 / 臉盆組 ${Math.round(width / 10)}cm` : "浴櫃 / 臉盆組",
        qty,
        width
      });
    }
  });

  const basinFaucetQty = getQty("basinFaucetQty");
  if (basinFaucetQty > 0) {
    const basinDrainMode = getBasinDrainMode();
    demands.push({
      id: "basinFaucet-basinFaucetQty",
      type: "basinFaucet",
      label: `面盆龍頭｜${getBasinDrainLabel(basinDrainMode)}`,
      qty: basinFaucetQty,
      basinDrainMode
    });
    if (basinDrainMode === "ceramicPopUp") {
      demands.push({
        id: "basinCeramicDrainUpgrade-basinFaucetQty",
        type: "fixedCharge",
        label: "彈跳瓷蓋落水頭選配",
        qty: basinFaucetQty,
        fixedModel: "瓷蓋彈跳落水頭 +900",
        fixedName: "彈跳瓷蓋落水頭選配",
        fixedPrice: 900,
        fixedFeatures: "瓷蓋排桿面盆選配；仍搭配 BT 系列面盆龍頭"
      });
    }
  }

  const showerQty = getQty("showerFaucetQty");
  if (showerQty > 0) {
    const withSlider = Boolean(document.getElementById("includeShowerSlider")?.checked);
    demands.push({
      id: withSlider ? "showerSlider-shower" : "showerFaucet-shower",
      type: withSlider ? "showerSlider" : "showerFaucet",
      label: withSlider ? "沐浴龍頭 + 滑桿 / 蓮蓬頭" : "沐浴龍頭",
      qty: showerQty
    });
  }

  addQtyDemand("kitchenFaucetQty", "kitchenFaucet", "廚房龍頭");

  addQtyDemand("towelRackQty", "bathAccessory", "毛巾架");
  addQtyDemand("shelfQty", "bathAccessory", "置物架");
  addQtyDemand("hookQty", "bathAccessory", "掛衣勾");

  addQtyDemand("exhaustFanQty", "exhaustFan", "抽風扇");
  addQtyDemand("bathHeaterQty", "bathHeater", "浴室暖風機");
  addQtyDemand("towelWarmerQty", "towelWarmer", "電熱毛巾架");
  addQtyDemand("electricClothesRackQty", "clothesRack", "電動曬衣架");
  addQtyDemand("handDryerQty", "handDryer", "烘手機");
  addQtyDemand("electricWaterHeaterQty", "waterHeater", "電能熱水器");

  addQtyDemand("urinalQty", "urinal", "小便斗（含感應器或指壓）");
  addQtyDemand("bathtubQty", "bathtub", "浴缸");
  addQtyDemand("showerDoorQty", "showerDoor", "無框淋浴拉門");

  const grabBarQty = getQty("grabBarQty");
  if (grabBarQty > 0) {
    const width = normalizeWidthInputToMm(document.getElementById("grabBarWidthCm")?.value);
    demands.push({
      id: "grabBar-grabBarQty",
      type: "grabBar",
      label: width ? `扶手 ${Math.round(width / 10)}cm` : "扶手",
      qty: grabBarQty,
      width
    });
  }

  return demands;
}

function getDemandRows(container) {
  return Array.from(container.querySelectorAll(".demand-row")).map((row) => ({
    qty: parseNumber(row.querySelector(".qty").value),
    width: parseNumber(row.querySelector(".width").value)
  }));
}



function firstModelCode(item) {
  return String(item.model || "").split(/[\/+]/)[0].trim();
}

function getSelectedPipeDistance() {
  const checked = [...document.querySelectorAll("input[name='toiletPipeCheck']:checked")]
    .map((input) => String(input.value || "").trim())
    .filter(Boolean);

  if (checked.length === 1) return checked[0];
  return "unknown";
}

function supportsPipe(item, pipe) {
  if (!pipe || pipe === "unknown") return true;

  const declaredPipe = String(item.pipeDistance || "").trim();

  // 優先使用試算表的「糞管距離cm」欄位。
  // 可填：300、400、300/400、300,400、30、40。
  if (declaredPipe) {
    const normalized = declaredPipe
      .replace(/公分|cm|CM/g, "")
      .replace(/30(?!0)/g, "300")
      .replace(/40(?!0)/g, "400");

    const pipeOptions = normalized
      .split(/[\/,，、\s]+/)
      .map((v) => v.trim())
      .filter(Boolean);

    if (pipe === "300") return pipeOptions.includes("300");
    if (pipe === "400") return pipeOptions.includes("400");
  }

  // 資料未填時才使用型號備援判斷，避免完全沒資料時前端不能用。
  const model = String(item.model || "");
  const size = String(item.size || "");
  const notes = String(item.notes || item.note || "");
  const text = `${model} ${size} ${notes}`;

  if (pipe === "400") {
    if (/CA1484S/.test(model)) return true;
    if (/CF14|C14|CT14|CB14|CTH14|CTA14/.test(model)) return true;
    if (/400管距|管距400|排水距離.*400/.test(text)) return true;
    return false;
  }

  if (pipe === "300") {
    if (/CA1484S/.test(model)) return false;
    if (/CF14|C14|CT14|CB14|CTH14|CTA14/.test(model) && !/CF13|C13|CT13|CB13|CTH13|CTA13/.test(model)) return false;
    if (/400管距/.test(text) && !/300/.test(text)) return false;
    return true;
  }

  return true;
}

function pipeWarningText(pipe) {
  if (pipe === "unknown") return "管距未確認，出貨前需現場確認30/40cm。";
  return `已依${pipe === "400" ? "40cm" : "30cm"}管距篩選。`;
}


function buildToiletSeatBundles() {
  const selectedPipe = getSelectedPipeDistance();

  const toilets = products
    .filter((p) => p.visible !== false)
    .filter((p) => String(p.category || "") === "馬桶")
    .filter((p) => supportsPipe(p, selectedPipe))
    .filter((p) => !String(p.model || "").includes("CF1354") && !String(p.model || "").includes("CF1454"))
    .filter((p) => Number(p.listPrice || 0) > 0);

  const seats = products
    .filter((p) => p.visible !== false)
    .filter((p) => String(p.category || "") === "溫水洗淨便座")
    .filter((p) => Number(p.listPrice || 0) > 0)
    .filter((p) => !String(p.model || "").includes("TAF060"));

  const smartToilets = products
    .filter((p) => p.visible !== false)
    .filter((p) => String(p.category || "") === "智慧馬桶")
    .filter((p) => supportsPipe(p, selectedPipe))
    .filter((p) => Number(p.listPrice || 0) > 0)
    .map((p) => ({
      ...p,
      category: "電腦馬桶座方案",
      isDynamicCombo: true,
      sourceType: "智慧馬桶",
      features: `智慧馬桶｜${p.features || ""}`,
      sort: Number(p.sort || 9999) + 500
    }));

  const bundles = [];

  toilets.forEach((toilet) => {
    seats.forEach((seat) => {
      const listPrice = Number(toilet.listPrice || 0) + Number(seat.listPrice || 0);
      const width = Number(toilet.width || 0) || Number(seat.width || 0) || "";
      const sort = Number(toilet.sort || 9999) + Number(seat.sort || 9999);

      bundles.push({
        ...toilet,
        model: `${seat.model} + ${toilet.model}`,
        name: `${toilet.name} + ${seat.name}`,
        category: "電腦馬桶座方案",
        listPrice,
        width,
        size: `${toilet.size || ""} / ${seat.size || ""}`.replace(/^ \/ | \/ $/g, ""),
        features: `一般馬桶搭配溫水洗淨便座｜${toilet.features || ""}｜${seat.features || ""}`,
        accessible: Boolean(toilet.accessible),
        sort,
        imageUrl: toilet.imageUrl || seat.imageUrl || "",
        officialUrl: toilet.officialUrl || seat.officialUrl || "",
        notes: `動態組合：${toilet.model} + ${seat.model}；${pipeWarningText(selectedPipe)}`,
        source: `${toilet.source || ""}; ${seat.source || ""}`,
        isDynamicCombo: true,
        sourceType: "馬桶+便座"
      });
    });
  });

  const presetCombos = products
    .filter((p) => p.visible !== false)
    .filter((p) => String(p.category || "") === "馬桶組合")
    .map((p) => ({
      ...p,
      category: "電腦馬桶座方案",
      isDynamicCombo: true,
      sourceType: "預建組合",
      features: `預建組合｜${p.features || ""}`,
      sort: Number(p.sort || 9999) + 1000
    }));

  return [...bundles, ...smartToilets, ...presetCombos];
}

function buildShowerSliderBundles() {
  const showers = products
    .filter((p) => p.visible !== false)
    .filter((p) => String(p.category || "") === "沐浴龍頭")
    .filter((p) => Number(p.listPrice || 0) > 0);

  const sliders = products
    .filter((p) => p.visible !== false)
    .filter((p) => String(p.category || "") === "滑桿/蓮蓬頭")
    .filter((p) => Number(p.listPrice || 0) > 0)
    .filter((p) => /^WG/.test(String(p.model || "")));

  const bundles = [];

  showers.forEach((shower) => {
    const hasBundledSlider = /WG\d+/i.test(String(shower.model || "")) || /含滑桿/.test(`${shower.name || ""}${shower.features || ""}${shower.notes || ""}`);
    if (hasBundledSlider) {
      bundles.push({
        ...shower,
        category: "沐浴龍頭滑桿方案",
        isDynamicCombo: true,
        sourceType: "沐浴龍頭含滑桿",
        features: `沐浴龍頭含滑桿｜${shower.features || ""}`,
        sort: Number(shower.sort || 9999)
      });
      return;
    }

    sliders.forEach((slider) => {
      bundles.push({
        ...shower,
        model: `${shower.model} + ${slider.model}`,
        name: `${shower.name} + ${slider.name}`,
        category: "沐浴龍頭滑桿方案",
        listPrice: Number(shower.listPrice || 0) + Number(slider.listPrice || 0),
        size: `${shower.size || ""} / ${slider.size || ""}`.replace(/^ \/ | \/ $/g, ""),
        features: `沐浴龍頭搭配滑桿｜${shower.features || ""}｜${slider.features || ""}`,
        sort: Number(shower.sort || 9999) + Number(slider.sort || 9999),
        imageUrl: shower.imageUrl || slider.imageUrl || "",
        officialUrl: shower.officialUrl || slider.officialUrl || "",
        notes: `動態組合：${shower.model} + ${slider.model}`,
        source: `${shower.source || ""}; ${slider.source || ""}`,
        isDynamicCombo: true,
        sourceType: "沐浴龍頭+滑桿"
      });
    });
  });

  return bundles;
}


function findCandidates(demand, preferAccessible) {
  let candidates;

  if (demand.type === "fixedCharge") {
    candidates = [buildFixedChargeCandidate(demand)];
  } else if (demand.type === "toiletCombo") {
    candidates = buildToiletSeatBundles();
  } else if (demand.type === "showerSlider") {
    candidates = buildShowerSliderBundles();
  } else if (demand.type === "mirror") {
    candidates = findMirrorCandidates(demand);
  } else {
    candidates = findSimpleCandidates(demand);
  }

  if (demand.type === "toilet" || demand.type === "smartToilet") {
    const selectedPipe = getSelectedPipeDistance();
    candidates = candidates.filter((p) => supportsPipe(p, selectedPipe));
  }

  if (demand.requireAccessible) {
    candidates = candidates.filter((p) => p.accessible || p.category.includes("無障礙") || p.features.includes("無障礙"));
  }

  return candidates.sort((a, b) => {
    if (preferAccessible && a.accessible !== b.accessible) return a.accessible ? -1 : 1;
    if ((a.widthDelta ?? 9999) !== (b.widthDelta ?? 9999)) return (a.widthDelta ?? 9999) - (b.widthDelta ?? 9999);
    if (a.sort !== b.sort) return a.sort - b.sort;
    return a.listPrice - b.listPrice;
  });
}


function isSmartToiletProduct(product) {
  return String(product.category || "").includes("智慧馬桶");
}

function isBidetSeatProduct(product) {
  return String(product.category || "").includes("溫水洗淨便座");
}

function isToiletProduct(product) {
  const category = String(product.category || "");
  return category.includes("馬桶") && !category.includes("智慧馬桶") && !category.includes("馬桶組合") && !category.includes("溫水洗淨便座");
}

function getSeatFitGroup(product) {
  const model = String(product.model || "");
  const text = `${product.name || ""} ${product.features || ""} ${product.notes || ""} ${product.note || ""}`;

  if (/TAF060/i.test(model)) return "exclude";
  if (/TAF16[08]/i.test(model) || text.includes("小馬桶")) return "small";
  if (/TAF17[08]/i.test(model) || text.includes("大座圈")) return "large";
  if (/TAF220|TAF210|TAF200|TAF191|TAF180/i.test(model)) return "general";
  return "unknown";
}

function getToiletFitGroup(product) {
  const model = String(product.model || "");
  const text = `${product.name || ""} ${product.features || ""} ${product.notes || ""} ${product.note || ""}`;

  if (/CF1354|CF1454/i.test(model)) return "no-bidet";
  if (text.includes("短版") || text.includes("短座")) return "no-bidet";
  if (text.includes("小馬桶")) return "small";
  if (/CF1325|CB1325|CT1325|CTH1325|CTA1325|CF1425|CB1425|CT1425|CTH1425|CTA1425/i.test(model)) return "small";
  return "large";
}

function isBidetSeatCompatibleWithToilet(seat, toilet) {
  if (!seat || !toilet) return true;

  const seatGroup = getSeatFitGroup(seat);
  const toiletGroup = getToiletFitGroup(toilet);

  if (seatGroup === "exclude") return false;
  if (toiletGroup === "no-bidet") return false;
  if (seatGroup === "small") return toiletGroup === "small";
  if (seatGroup === "large") return toiletGroup !== "small" && toiletGroup !== "no-bidet";
  if (seatGroup === "general" || seatGroup === "unknown") return toiletGroup !== "no-bidet";
  return true;
}

function sortBidetSeatsForToilet(candidates, toilet) {
  return candidates
    .filter((seat) => isBidetSeatCompatibleWithToilet(seat, toilet))
    .sort((a, b) => {
      const toiletGroup = getToiletFitGroup(toilet);
      const score = (seat) => {
        const group = getSeatFitGroup(seat);
        let value = Number(seat.sort || seat.sortOrder || 999);
        if (group === "small" && toiletGroup === "small") value -= 200;
        if (group === "large" && toiletGroup === "large") value -= 200;
        if (group === "general") value -= 50;
        return value;
      };
      return score(a) - score(b) || Number(a.listPrice || 0) - Number(b.listPrice || 0);
    });
}

function getSelectedProductByDemandId(selectedMap, demandId, demandCandidates) {
  const key = selectedMap.get(demandId);
  if (!key) return null;
  const pair = demandCandidates.find((entry) => entry.demand.id === demandId);
  if (!pair) return null;
  return pair.candidates.find((p) => getProductKey(p) === key) || null;
}

function ensureLinkedBidetSeatSelection(demandCandidates) {
  const toiletEntry = demandCandidates.find((entry) => entry.demand.id === "toilet-toilet");
  const bidetEntry = demandCandidates.find((entry) => entry.demand.id === "bidetSeat-toilet");
  if (!toiletEntry || !bidetEntry) return;

  const selectedToilet = getSelectedProductByDemandId(selectedModelByDemandId, "toilet-toilet", demandCandidates) || toiletEntry.candidates[0] || null;
  if (!selectedToilet) {
    selectedModelByDemandId.delete("bidetSeat-toilet");
    bidetEntry.candidates = [];
    bidetEntry.demand.missingReason = "目前沒有可用馬桶，無法判斷電腦馬桶蓋適裝。";
    return;
  }

  if (isSmartToiletProduct(selectedToilet)) {
    selectedToilet.suppressesDemandIds = ["bidetSeat-toilet"];
    selectedToilet.features = `智慧馬桶｜不需另配電腦馬桶蓋｜${selectedToilet.features || ""}`;
    selectedModelByDemandId.delete("bidetSeat-toilet");
    bidetEntry.demand.isSuppressed = true;
    bidetEntry.candidates = [];
    delete bidetEntry.demand.missingReason;
    return;
  }

  delete bidetEntry.demand.isSuppressed;
  bidetEntry.candidates = sortBidetSeatsForToilet(bidetEntry.candidates, selectedToilet);

  const currentSeat = getSelectedProductByDemandId(selectedModelByDemandId, "bidetSeat-toilet", demandCandidates);
  if (currentSeat && isBidetSeatCompatibleWithToilet(currentSeat, selectedToilet)) {
    delete bidetEntry.demand.missingReason;
    return;
  }

  if (bidetEntry.candidates.length) {
    selectedModelByDemandId.set("bidetSeat-toilet", getProductKey(bidetEntry.candidates[0]));
    delete bidetEntry.demand.missingReason;
    window.__lastAutoAdjustNotice = "已因馬桶型號變更，自動調整電腦馬桶蓋適裝款。";
  } else {
    selectedModelByDemandId.delete("bidetSeat-toilet");
    bidetEntry.demand.missingReason = "此馬桶目前不建議搭配電腦馬桶蓋，請改選其他馬桶或取消電腦馬桶蓋需求。";
    window.__lastAutoAdjustNotice = bidetEntry.demand.missingReason;
  }
}

function findSimpleCandidates(demand) {
  const categoryNames = CATEGORY_MAP[demand.type] || [];
  if (!categoryNames.length) {
    console.warn("找不到需求類別對應：", demand.type, demand.label);
    return [];
  }

  let candidates = products.filter((p) => {
    const category = String(p.category || "");
    return categoryNames.some((name) => category.includes(name) || name.includes(category));
  });

  if (demand.type === "toilet") {
    candidates = candidates.filter(isToiletProduct);
    if (demand.allowSmartToilet) {
      const selectedPipe = getSelectedPipeDistance();
      const smartCandidates = products
        .filter((p) => p.visible !== false)
        .filter(isSmartToiletProduct)
        .filter((p) => supportsPipe(p, selectedPipe))
        .map((p) => ({
          ...p,
          sourceType: "智慧馬桶",
          suppressesDemandIds: ["bidetSeat-toilet"]
        }));
      candidates = [...candidates, ...smartCandidates];
    }
  }

  if (demand.type === "smartToilet") {
    candidates = candidates.filter(isSmartToiletProduct);
  }

  if (demand.type === "bidetSeat") {
    candidates = candidates.filter((p) => isBidetSeatProduct(p) && getSeatFitGroup(p) !== "exclude");
  }

  if (demand.type === "basinFaucet") {
    candidates = buildBasinFaucetVariants(candidates, demand);
  }

  if (demand.width) {
    const exactOrNear = candidates
      .map((p) => ({ ...p, widthDelta: Math.abs((p.width || 0) - demand.width) }))
      .filter((p) => p.width && p.widthDelta <= 100);
    if (exactOrNear.length) candidates = exactOrNear;
  }
  return candidates;
}

function findMirrorCandidates(demand) {
  const mirrorProducts = products.filter((p) => isMirrorMain(p));
  const openCabinets = products.filter((p) => isOpenCabinet(p));
  let candidates = [];

  for (const p of mirrorProducts) {
    candidates.push({ ...p, widthDelta: demand.width ? Math.abs((p.width || 0) - demand.width) : 9999 });
  }

  for (const mirror of mirrorProducts) {
    for (const cabinet of openCabinets) {
      if (!mirror.width || !cabinet.width) continue;
      const comboWidth = mirror.width + cabinet.width;
      candidates.push({
        visible: true,
        category: "組合鏡櫃",
        model: `${mirror.model} + ${cabinet.model}`,
        name: `${mirror.name} + ${cabinet.name}`,
        listPrice: mirror.listPrice + cabinet.listPrice,
        width: comboWidth,
        size: `${mirror.size} / ${cabinet.size}`,
        features: `組合寬度 ${comboWidth}mm。${mirror.features}；${cabinet.features}`,
        accessible: mirror.accessible || cabinet.accessible,
        sort: Math.min(mirror.sort, cabinet.sort) + 0.5,
        imageUrl: mirror.imageUrl || cabinet.imageUrl,
        officialUrl: mirror.officialUrl || cabinet.officialUrl,
        note: "鏡櫃組合",
        source: `${mirror.source} / ${cabinet.source}`,
        isCombo: true,
        parts: [mirror, cabinet],
        widthDelta: demand.width ? Math.abs(comboWidth - demand.width) : 9999
      });
    }
  }

  if (demand.width) {
    const near = candidates.filter((p) => p.width && p.widthDelta <= 100);
    if (near.length) candidates = near;
  }

  return candidates;
}

function isMirrorMain(p) {
  const text = `${p.category} ${p.model} ${p.name} ${p.features}`;
  if (isOpenCabinet(p)) return false;
  return text.includes("鏡櫃") || text.includes("鏡子") || /^EM\d/i.test(p.model);
}

function isOpenCabinet(p) {
  const text = `${p.category} ${p.model} ${p.name} ${p.features}`;
  return text.includes("開放櫃") || /^EM00(20|25)/i.test(p.model);
}

function drawResults(selected, discount, budget) {
  els.resultList.innerHTML = "";
  let totalList = 0;
  let totalDiscounted = 0;

  const visibleSelected = selected.filter((item) => !(item.demand && item.demand.isSuppressed));

  if (!visibleSelected.length) {
    els.resultList.innerHTML = `<div class="empty">沒有設定任何需求數量。</div>`;
    updateSummary(0, 0, budget);
    return;
  }

  for (const item of visibleSelected) {
    if (item.missing) {
      const block = document.createElement("div");
      block.className = "product-card missing-card";
      const reason = item.demand.missingReason || "目前產品資料表沒有找到可對應的類別或品項。請先補 PRODUCT_MASTER 類別，或調整 CATEGORY_MAP。";
      block.innerHTML = `
        <div class="product-img missing-img">無資料</div>
        <div class="product-main">
          <div class="product-title-row">
            <p class="model">${escapeHtml(item.demand.label)}</p>
          </div>
          <p class="tags">${escapeHtml(reason)}</p>
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
  if (budget) {
    setStatus(totalDiscounted <= budget
      ? `已依預算匹配選品，目標是讓折後總價盡量接近預算。`
      : `最低可用組合仍超出預算，請提高預算或減少數量。`);
  }
}

function createProductCard(product, qty, discount, discountedUnit, subtotalDiscounted) {
  const officialUrl = product.officialUrl || buildCaesarProductUrl(product.model);
  const previewUrl = product.imageUrl;
  const imageContent = previewUrl
    ? `<img src="${escapeAttr(previewUrl)}" alt="${escapeAttr(product.model)}" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';"><span class="fallback-label" style="display:none;">圖片載入失敗<br>點此看官網</span>`
    : `<span class="fallback-label">尚無圖片<br>點此看官網</span>`;
  const comboBadge = product.isCombo ? `<span class="combo-badge">組合品項</span>` : "";

  const card = document.createElement("article");
  card.className = "product-card";
  card.innerHTML = `
    <a class="product-img" href="${escapeAttr(officialUrl)}" target="_blank" rel="noopener noreferrer">${imageContent}</a>
    <div class="product-main">
      <div class="product-title-row">
        <p class="model">${escapeHtml(product.model)}<span class="product-name-inline">${escapeHtml(product.name)}</span></p>
        ${comboBadge}
      </div>
      <p class="tags">${product.demand && product.demand.groupId ? `<span class="combo-badge">同組適裝</span> ` : ""}${buildReasonText(product)}${escapeHtml(product.features || "未填特殊功能")}</p>
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
      selectedModelByDemandId.set(btn.dataset.demandId, btn.dataset.productKey);
      refreshConditionalOptionVisibility();
      renderEstimate();
    });
  });

  return card;
}

function buildAltSection(product, qty, discount) {
  const fullCandidates = product.candidates || [];
  const alternatives = fullCandidates
    .filter((p) => getProductKey(p) !== getProductKey(product))
    .slice(0, 10);

  const currentLabel = product.isForcedSelection
    ? `<div class="manual-selected-note">目前為手動改選，仍可再改其他型號。</div>`
    : "";

  if (!alternatives.length) {
    return currentLabel ? `<div class="alt-section">${currentLabel}</div>` : "";
  }

  const items = alternatives.map((alt) => {
    const altDiscounted = Math.round(alt.listPrice * discount / 100);
    const currentDiscounted = Math.round(product.listPrice * discount / 100);
    const diff = altDiscounted - currentDiscounted;
    const diffText = diff === 0 ? "相同" : `${diff > 0 ? "+" : "-"}${money(Math.abs(diff))}`;

    const altUrl = alt.officialUrl || buildCaesarProductUrl(alt.model);
    const previewUrl = alt.imageUrl;
    const altImage = previewUrl
      ? `<img src="${escapeAttr(previewUrl)}" alt="${escapeAttr(alt.model)}" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"><span class="alt-fallback-label" style="display:none;">無圖</span>`
      : `<span class="alt-fallback-label">無圖</span>`;

    return `
      <div class="alt-item alt-item-card">
        <a class="alt-thumb" href="${escapeAttr(altUrl)}" target="_blank" rel="noopener noreferrer">${altImage}</a>
        <div class="alt-info">
          <strong>${escapeHtml(alt.model)}</strong>
          <span>${escapeHtml(alt.name || "")}</span>
        </div>
        <div class="alt-action">
          <div>${money(altDiscounted)} / 件</div>
          <div>差額 ${diffText}</div>
          <button class="choose-alt" type="button" data-demand-id="${escapeAttr(product.demand.id)}" data-product-key="${escapeAttr(getProductKey(alt))}">改選此品項</button>
        </div>
      </div>
    `;
  }).join("");

  return `<div class="alt-section">${currentLabel}<button class="alt-toggle" type="button">展開其他可選型號</button><div class="alt-list">${items}</div></div>`;
}


function buildReasonText(product) {
  if (!product.budgetReason) return "";
  return `【${escapeHtml(product.budgetReason)}】 `;
}

function updateSummary(totalList, totalDiscounted, budget) {
  els.totalListPrice.textContent = money(totalList);
  els.totalDiscountedPrice.textContent = money(totalDiscounted);
  els.budgetDiff.classList.remove("positive", "negative", "neutral");

  if (!budget) {
    els.budgetDiff.textContent = "未填預算";
    els.budgetDiff.classList.add("neutral");
    return;
  }

  const diff = budget - totalDiscounted;
  if (diff >= 0) {
    els.budgetDiff.textContent = `+${money(diff)}`;
    els.budgetDiff.classList.add("positive");
  } else {
    els.budgetDiff.textContent = `-${money(Math.abs(diff))}`;
    els.budgetDiff.classList.add("negative");
  }
}

function getProductKey(product) {
  return `${product.model}|${product.name}|${product.listPrice}`;
}

function buildCaesarProductUrl(model) {
  const value = String(model || "").trim().toUpperCase();
  if (!value) return "";

  if (value === "DF140EV") {
    return "https://www.google.com/search?q=" + encodeURIComponent("凱撒衛浴 " + value);
  }

  const firstToken = value
    .split("+")[0]
    .split("/")[0]
    .replace(/\(.*?\)/g, "")
    .trim();

  if (firstToken && /^[A-Z0-9-]+$/.test(firstToken)) {
    return "https://www.caesar.com.tw/product/detail/" + encodeURIComponent(firstToken);
  }

  return "https://www.google.com/search?q=" + encodeURIComponent("凱撒衛浴 " + value);
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
    headers.forEach((header, index) => obj[header] = row[index] ?? "");
    return obj;
  });
}

function parseMoney(value) { return parseNumber(String(value || "").replace(/,/g, "")); }
function parseNumber(value) {
  const num = Number(String(value || "").replace(/,/g, "").trim());
  return Number.isFinite(num) ? num : 0;
}
function parseBool(value) {
  const text = String(value || "").trim().toUpperCase();
  return ["TRUE", "YES", "Y", "1", "是"].includes(text);
}
function clean(value) { return String(value ?? "").trim(); }
function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }
function money(value) {
  return new Intl.NumberFormat("zh-TW", { style: "currency", currency: "TWD", maximumFractionDigits: 0 }).format(value || 0);
}
function setStatus(message) { els.status.textContent = message; }
function escapeHtml(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
function escapeAttr(value) { return escapeHtml(value); }


// v32: 乾淨初始化。修正舊 DOMContentLoaded block 造成初始化中斷。
document.addEventListener("DOMContentLoaded", () => {
  try {
    if (els.vanityRows && !els.vanityRows.querySelector(".demand-row")) {
      addDemandRow("vanity", { qty: 0, width: "" });
    }

    initializePageState();

    const addVanityBtn = document.getElementById("addVanityRow");
    if (addVanityBtn) {
      addVanityBtn.addEventListener("click", () => {
        addDemandRow("vanity", { qty: 0, width: "" });
        if (typeof markDirty === "function") markDirty();
      });
    }

    document.addEventListener("click", (event) => {
      const button = event.target && event.target.closest ? event.target.closest("button[data-step][data-target]") : null;
      if (!button) return;

      event.preventDefault();

      const input = document.getElementById(button.dataset.target);
      if (!input) return;

      const step = Number(button.dataset.step || 0);
      const current = Number(input.value || 0);
      input.value = String(Math.max(0, current + step));

      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));

      if (typeof markDirty === "function") markDirty();
    }, true);

    if (els.runButton) {
      els.runButton.addEventListener("click", (event) => {
        event.preventDefault();
        selectedModelByDemandId.clear();
        renderEstimate();
      });
    }

    document.querySelectorAll("input, select").forEach((input) => {
      if (input.id === "discountInput" || input.id === "budgetInput") return;
      input.addEventListener("change", () => {
        if (typeof markDirty === "function") markDirty();
      });
    });

    loadProducts();
  } catch (error) {
    console.error("Initialization failed:", error);
    if (typeof setStatus === "function") setStatus("初始化失敗，請檢查瀏覽器主控台。");
  }
});



// v34: 修正改選品項後按鈕消失/不更新預算。
// 使用事件委派，讓新渲染出來的替代品按鈕也永遠有效。
document.addEventListener("click", (event) => {
  const button = event.target && event.target.closest
    ? event.target.closest("[data-alt-demand-id][data-alt-key]")
    : null;

  if (!button) return;

  event.preventDefault();

  const demandId = button.getAttribute("data-alt-demand-id");
  const productKey = button.getAttribute("data-alt-key");

  if (!demandId || !productKey) return;

  selectedModelByDemandId.set(demandId, productKey);

  if (typeof renderEstimate === "function") {
    renderEstimate();
  }
}, true);



// v34 fallback：支援舊版替代品按鈕資料格式。
document.addEventListener("click", (event) => {
  const button = event.target && event.target.closest
    ? event.target.closest("button[data-demand-id][data-model], button[data-demand-id][data-product-key]")
    : null;

  if (!button) return;

  const text = (button.textContent || "").replace(/\s+/g, "");
  if (!text.includes("改選")) return;

  event.preventDefault();

  const demandId = button.getAttribute("data-demand-id");
  const productKey = button.getAttribute("data-product-key") || button.getAttribute("data-model");

  if (!demandId || !productKey) return;

  selectedModelByDemandId.set(demandId, productKey);
  renderEstimate();
}, true);

