
const APP_VERSION = "202607301438";

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
  toilet: ["馬桶", "智慧馬桶"],
  vanity: ["浴櫃/臉盆組", "臉盆浴櫃組", "浴櫃", "臉盆"],
  mirror: ["鏡櫃", "鏡子", "鏡子/鏡櫃", "開放櫃"],
  basinFaucet: ["面盆龍頭", "臉盆龍頭"],
  showerFaucet: ["沐浴龍頭", "浴用龍頭", "控溫沐浴龍頭組"],
  kitchenFaucet: ["廚房龍頭", "電漿滅菌廚房龍頭"],
  bathAccessory: ["浴室配件", "滑桿/蓮蓬頭"],
  towelWarmer: ["電熱毛巾架"],
  bathHeater: ["浴室暖風乾燥機"],
  bathtub: ["浴缸"],
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
    pipeDistance: clean(row["糞管距離cm"])
  };
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

  const selected = budget > 0
    ? selectBudgetAwareItems(demandCandidates, discount, budget)
    : selectDefaultItems(demandCandidates);

  drawResults(selected, discount, budget);
}


function selectDefaultItems(demandCandidates) {
  return demandCandidates.map(({ demand, candidates }) => {
    const savedKey = selectedModelByDemandId.get(demand.id);
    const chosen = candidates.find((p) => getProductKey(p) === savedKey) || candidates[0];
    return chosen ? { ...chosen, demand, candidates } : { missing: true, demand, candidates: [] };
  });
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

    // v36 重點：
    // 手動改選只固定「主選品」，但 candidates 必須保留完整候選清單。
    // 否則改選後 buildAltSection 會因 candidates 只剩一筆而整段替代按鈕消失。
    const candidatesForBudget = forced
      ? [{ ...forced, isForcedSelection: true }]
      : sortedCandidates;

    return {
      demand,
      candidates: candidatesForBudget,
      allCandidates: sortedCandidates
    };
  });

  if (prepared.some((group) => !group.candidates.length)) {
    return prepared.map(({ demand, candidates, allCandidates }) => ({
      missing: true,
      demand,
      candidates: allCandidates && allCandidates.length ? allCandidates : candidates
    }));
  }

  const minPossible = prepared.reduce((sum, group) => {
    const minItem = group.candidates.reduce((best, item) => item.subtotal < best.subtotal ? item : best, group.candidates[0]);
    return sum + minItem.subtotal;
  }, 0);

  if (minPossible > budget) {
    return prepared.map(({ demand, candidates, allCandidates }) => {
      const cheapest = [...candidates].sort((a, b) => a.subtotal - b.subtotal || b.budgetScore - a.budgetScore)[0];
      return {
        ...cheapest,
        demand,
        candidates: allCandidates && allCandidates.length ? allCandidates : candidates,
        budgetReason: cheapest.isForcedSelection ? "手動改選" : "最低可用"
      };
    });
  }

  let states = new Map();
  states.set(0, { total: 0, score: 0, picks: [] });

  for (const group of prepared) {
    const next = new Map();

    for (const state of states.values()) {
      for (const item of group.candidates) {
        const total = state.total + item.subtotal;
        if (total > budget) continue;

        const score = state.score + item.budgetScore + (item.isForcedSelection ? 100000 : 0);
        const existing = next.get(total);

        if (!existing || score > existing.score) {
          next.set(total, {
            total,
            score,
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
    return prepared.map(({ demand, candidates, allCandidates }) => {
      const cheapest = [...candidates].sort((a, b) => a.subtotal - b.subtotal || b.budgetScore - a.budgetScore)[0];
      return {
        ...cheapest,
        demand,
        candidates: allCandidates && allCandidates.length ? allCandidates : candidates,
        budgetReason: cheapest.isForcedSelection ? "手動改選" : "最低可用"
      };
    });
  }

  const best = [...states.values()].sort((a, b) => {
    const aGap = budget - a.total;
    const bGap = budget - b.total;
    if (aGap !== bGap) return aGap - bGap;
    return b.score - a.score;
  })[0];

  return best.picks.map((item) => ({
    ...item,
    budgetReason: item.isForcedSelection ? "手動改選" : "預算匹配"
  }));
}

function pruneBudgetStates(states, budget, limit) {
  const list = [...states.values()].sort((a, b) => {
    const aGap = budget - a.total;
    const bGap = budget - b.total;
    if (aGap !== bGap) return aGap - bGap;
    return b.score - a.score;
  });

  const keep = new Map();

  for (const state of list) {
    if (!keep.has(state.total)) keep.set(state.total, state);
    if (keep.size >= limit) break;
  }

  return keep;
}

function scoreCandidateForBudget(item, demand) {
  let score = 0;

  // 推薦排序仍保留，但不再凌駕於預算匹配。
  score += Math.max(0, 10000 - (item.sort || 9999));

  // 寬度越接近越好。
  score += Math.max(0, 1000 - (item.widthDelta ?? 9999)) * 2;

  // 無障礙需求加權。
  if (demand.requireAccessible && item.accessible) score += 5000;

  // 組合品項給小幅加分，讓鏡櫃組合有機會被選到。
  if (item.isCombo || String(item.category || "").includes("組合")) score += 300;

  // 勾選電腦馬桶蓋時，優先一般馬桶 + 溫水洗淨便座。
  // 智慧馬桶仍可被選到，但不應該壓過合理的馬桶座組合。
  if (item.sourceType === "馬桶+便座") score += 2500;
  if (item.sourceType === "智慧馬桶") score -= 800;
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
    demands.push({
      id: includeBidetSeat ? "toiletCombo-toilet" : "toilet-toilet",
      type: includeBidetSeat ? "toiletCombo" : "toilet",
      label: includeBidetSeat ? "電腦馬桶座方案" : "馬桶",
      qty: toiletQty
    });
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

  addQtyDemand("basinFaucetQty", "basinFaucet", "面盆龍頭");

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

  addQtyDemand("exhaustFanQty", "bathHeater", "抽風扇");
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

  if (demand.type === "toiletCombo") {
    candidates = buildToiletSeatBundles();
  } else if (demand.type === "showerSlider") {
    candidates = buildShowerSliderBundles();
  } else if (demand.type === "mirror") {
    candidates = findMirrorCandidates(demand);
  } else {
    candidates = findSimpleCandidates(demand);
  }

  if (demand.type === "toilet") {
    const selectedPipe = getSelectedPipeDistance();
    candidates = candidates
      .filter((p) => String(p.category || "") === "馬桶")
      .filter((p) => supportsPipe(p, selectedPipe));
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

function findSimpleCandidates(demand) {
  const categoryNames = CATEGORY_MAP[demand.type] || [];
  let candidates = products.filter((p) => categoryNames.some((name) => p.category.includes(name) || name.includes(p.category)));

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

  if (!selected.length) {
    els.resultList.innerHTML = `<div class="empty">沒有設定任何需求數量。</div>`;
    updateSummary(0, 0, budget);
    return;
  }

  for (const item of selected) {
    if (item.missing) {
      const block = document.createElement("div");
      block.className = "product-card";
      block.innerHTML = `<div class="product-img">無資料</div><div><p class="model">${escapeHtml(item.demand.label)}</p><p class="name">找不到符合條件的產品。</p></div>`;
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
      <p class="tags">${buildReasonText(product)}${escapeHtml(product.features || "未填特殊功能")}</p>
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

