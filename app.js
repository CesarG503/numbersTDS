/**
 * app.js — Método No Congruente
 * Técnica de Simulación
 *
 * Métodos soportados:
 *   - Cuadrados Medios (Von Neumann, 1 semilla)
 *   - Productos Medios (2 semillas)
 */

// ============================================================
// ESTADO GLOBAL
// ============================================================
let currentMethod = 'square';
let results = [];

// ============================================================
// INICIALIZACIÓN
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  updateFormulaPanel();
});

// ============================================================
// SELECCIÓN DE MÉTODO
// ============================================================
function selectMethod(method) {
  currentMethod = method;
  document.getElementById('card-square').classList.toggle('selected', method === 'square');
  document.getElementById('card-product').classList.toggle('selected', method === 'product');
  document.getElementById('card-constant').classList.toggle('selected', method === 'constant');
  document.getElementById('seed1-container').style.display = method === 'product' ? 'block' : 'none';
  document.getElementById('const-k-container').style.display = method === 'constant' ? 'block' : 'none';
  updateFormulaPanel();
  clearResults();
}

// ============================================================
// PANEL DE FÓRMULAS
// ============================================================
function updateFormulaPanel() {
  const panel = document.getElementById('formula-panel');

  const configs = {
    square: {
      color: '',
      formula1: 'Xᵢ₊₁ = Dígitos_Medios( Xᵢ² )',
      formula2: 'rᵢ = Xᵢ₊₁ / 10^d',
      steps: [
        'Elevar Xᵢ al cuadrado → Xᵢ²',
        'Expresar con 2d dígitos (ceros a la izquierda)',
        'Extraer los d dígitos centrales → Xᵢ₊₁',
        'Calcular rᵢ = Xᵢ₊₁ / 10^d',
        'Repetir hasta ciclo o degeneración'
      ]
    },
    product: {
      color: 'violet',
      formula1: 'Xᵢ₊₁ = Dígitos_Medios( Xᵢ × Xᵢ₋₁ )',
      formula2: 'rᵢ = Xᵢ₊₁ / 10^d',
      steps: [
        'Multiplicar Xᵢ × Xᵢ₋₁',
        'Expresar el producto con 2d dígitos',
        'Extraer los d dígitos centrales → Xᵢ₊₁',
        'Calcular rᵢ = Xᵢ₊₁ / 10^d',
        'Repetir hasta detectar ciclo'
      ]
    },
    constant: {
      color: 'teal',
      formula1: 'Xᵢ₊₁ = Dígitos_Medios( k × Xᵢ )',
      formula2: 'rᵢ = Xᵢ₊₁ / 10^d',
      steps: [
        'Multiplicar la constante k por Xᵢ',
        'Expresar el producto con 2d dígitos',
        'Extraer los d dígitos centrales → Xᵢ₊₁',
        'Calcular rᵢ = Xᵢ₊₁ / 10^d',
        'Repetir hasta detectar ciclo'
      ]
    }
  };

  const cfg = configs[currentMethod];
  panel.innerHTML = `
    <div class="formula-box ${cfg.color}">${cfg.formula1}</div>
    <div class="formula-box ${cfg.color}">${cfg.formula2}</div>
    <ul class="formula-steps">
      ${cfg.steps.map((s, i) => `
        <li>
          <span class="step-num ${cfg.color}">${i + 1}</span>
          <span>${s}</span>
        </li>`).join('')}
    </ul>`;
}

// ============================================================
// ALGORITMO: EXTRACCIÓN DE DÍGITOS MEDIOS
// ============================================================
/**
 * Dado el string del número (cuadrado o producto),
 * rellena a 2d dígitos y extrae los d dígitos centrales.
 * Retorna: { padded, middle, start, end }
 * (start y end son índices 0-based en la cadena padded de 2d dígitos)
 */
function extractMiddle(numStr, d) {
  // Aseguramos 2d dígitos (recortamos por la izquierda si excede, pero no debería)
  const padded = numStr.padStart(2 * d, '0').slice(-(2 * d));
  const start = Math.floor(d / 2);
  const middle = padded.substring(start, start + d);
  return { padded, middle, start, end: start + d - 1 };
}

// ============================================================
// ALGORITMO: CUADRADOS MEDIOS
// ============================================================
function generateMiddleSquare(seed0, d, maxIter) {
  const steps = [];
  const seen = new Map(); // xValue -> i (primer paso en que apareció)
  const mod = Math.pow(10, d);
  let x = seed0;

  for (let i = 0; i < maxIter; i++) {
    // Detección de ciclo
    if (seen.has(x)) {
      steps.push({ i, x, isCycle: true, cycleBackTo: seen.get(x), r: x / mod });
      break;
    }
    seen.set(x, i);

    const squared = BigInt(x) * BigInt(x);
    const squaredS = squared.toString();
    const midInfo = extractMiddle(squaredS, d);
    const xNext = parseInt(midInfo.middle, 10);
    const r = xNext / mod;

    const xPad = x.toString().padStart(d, '0');
    const xNextPad = xNext.toString().padStart(d, '0');
    const rStr = r.toFixed(d + 2);
    steps.push({
      i,
      x,
      xPad,
      squared: squaredS,
      midInfo,
      xNext,
      xNextPad,
      r,
      rStr,
      rExpr: `${xNextPad} / ${mod} = ${rStr}`,
      isCycle: false
    });

    x = xNext;

    // Caso degenerado: X = 0
    if (x === 0 && i > 0) {
      const zeroIdx = steps.findIndex(s => s.x === 0);
      steps.push({ i: i + 1, x: 0, isCycle: true, cycleBackTo: zeroIdx >= 0 ? zeroIdx : 0, r: 0 });
      break;
    }
  }
  return steps;
}

// ============================================================
// ALGORITMO: PRODUCTOS MEDIOS
// ============================================================
function generateMiddleProduct(seed0, seed1, d, maxIter) {
  const steps = [];
  const seen = new Map();
  const mod = Math.pow(10, d);
  let xPrev = seed0;
  let xCurr = seed1;

  for (let i = 0; i < maxIter; i++) {
    if (seen.has(xCurr)) {
      steps.push({
        i, xPrev, xCurr, isCycle: true,
        cycleBackTo: seen.get(xCurr),
        r: xCurr / mod
      });
      break;
    }
    seen.set(xCurr, i);

    const product = BigInt(xPrev) * BigInt(xCurr);
    const productS = product.toString();
    const midInfo = extractMiddle(productS, d);
    const xNext = parseInt(midInfo.middle, 10);
    const r = xNext / mod;

    const xCurrPad = xCurr.toString().padStart(d, '0');
    const xNextPad = xNext.toString().padStart(d, '0');
    const rStr = r.toFixed(d + 2);

    steps.push({
      i,
      xPrev,
      xPrevPad: xPrev.toString().padStart(d, '0'),
      xCurr,
      xCurrPad,
      product: productS,
      midInfo,
      xNext,
      xNextPad,
      r,
      rStr,
      rExpr: `${xNextPad} / ${mod} = ${rStr}`,
      isCycle: false
    });

    xPrev = xCurr;
    xCurr = xNext;

    if (xNext === 0) {
      steps.push({ i: i + 1, xPrev, xCurr: xNext, isCycle: true, cycleBackTo: 0, r: 0 });
      break;
    }
  }
  return steps;
}

// ============================================================
// ALGORITMO: MULTIPLICADOR CONSTANTE
// ============================================================
/**
 * Xᵢ₊₁ = Dígitos_Medios( k × Xᵢ )
 * rᵢ    = Xᵢ / 10^d
 * @param {number} seed0   - Semilla inicial X₀ (d dígitos)
 * @param {number} k       - Constante multiplicadora (d dígitos)
 * @param {number} d       - Número de dígitos
 * @param {number} maxIter - Máximo de iteraciones
 */
function generateConstantMultiplier(seed0, k, d, maxIter) {
  const steps = [];
  const seen = new Map();  // xValue -> índice del paso
  const mod = Math.pow(10, d);
  let x = seed0;

  for (let i = 0; i < maxIter; i++) {
    // Detección de ciclo
    if (seen.has(x)) {
      steps.push({ i, x, isCycle: true, cycleBackTo: seen.get(x), r: x / mod });
      break;
    }
    seen.set(x, i);

    const product = BigInt(k) * BigInt(x);
    const productS = product.toString();
    const midInfo = extractMiddle(productS, d);
    const xNext = parseInt(midInfo.middle, 10);
    const r = xNext / mod;

    const xPad = x.toString().padStart(d, '0');
    const xNextPad = xNext.toString().padStart(d, '0');
    const rStr = r.toFixed(d + 2);
    steps.push({
      i,
      x,
      xPad,
      k,
      kPad: k.toString().padStart(d, '0'),
      product: productS,
      midInfo,
      xNext,
      xNextPad,
      r,
      rStr,
      rExpr: `${xNextPad} / ${mod} = ${rStr}`,
      isCycle: false
    });

    x = xNext;

    // Caso degenerado: X = 0
    if (x === 0 && i > 0) {
      const zeroIdx = steps.findIndex(s => s.x === 0);
      steps.push({ i: i + 1, x: 0, isCycle: true, cycleBackTo: zeroIdx >= 0 ? zeroIdx : 0, r: 0 });
      break;
    }
  }
  return steps;
}

// ============================================================
// RENDERIZADO: cadena con dígitos medios resaltados
// ============================================================
function highlightPadded(padded, start, end) {
  const before = `<span class="hl-dim">${padded.substring(0, start)}</span>`;
  const mid = `<span class="hl-middle">${padded.substring(start, end + 1)}</span>`;
  const after = `<span class="hl-dim">${padded.substring(end + 1)}</span>`;
  return before + mid + after;
}


// ============================================================
// GENERAR (función principal)
// ============================================================
function generate() {
  hideError();
  const d = parseInt(document.getElementById('input-digits').value, 10);
  const maxIter = parseInt(document.getElementById('input-maxiter').value, 10) || 20;
  const s0raw = document.getElementById('input-seed0').value.trim();

  if (!s0raw) return showError('Ingresa la semilla X₀');
  const seed0 = parseInt(s0raw, 10);
  if (isNaN(seed0) || seed0 < 0) return showError('X₀ debe ser un entero positivo');
  if (s0raw.replace('-', '').length > d) return showError(`X₀ debe tener máximo ${d} dígitos para d=${d}`);

  try {
    if (currentMethod === 'square') {
      results = generateMiddleSquare(seed0, d, maxIter);
    } else if (currentMethod === 'product') {
      const s1raw = document.getElementById('input-seed1').value.trim();
      if (!s1raw) return showError('Ingresa la semilla X₁');
      const seed1 = parseInt(s1raw, 10);
      if (isNaN(seed1) || seed1 < 0) return showError('X₁ debe ser un entero positivo');
      if (s1raw.replace('-', '').length > d) return showError(`X₁ debe tener máximo ${d} dígitos para d=${d}`);
      results = generateMiddleProduct(seed0, seed1, d, maxIter);
    } else {
      // Multiplicador Constante
      const kraw = document.getElementById('input-k').value.trim();
      if (!kraw) return showError('Ingresa la constante k');
      const k = parseInt(kraw, 10);
      if (isNaN(k) || k <= 0) return showError('k debe ser un entero positivo');
      if (kraw.length > d) return showError(`k debe tener máximo ${d} dígitos para d=${d}`);
      results = generateConstantMultiplier(seed0, k, d, maxIter);
    }
    renderAll(d);
  } catch (e) {
    showError(e.message);
  }
}

// ============================================================
// RENDERIZAR TODO
// ============================================================
function renderAll(d) {
  // Ocultar step detail hasta nuevo clic
  document.getElementById('step-detail-card').style.display = 'none';

  renderStats(d);
  if (currentMethod === 'square') renderSquareTable(d);
  else if (currentMethod === 'product') renderProductTable(d);
  else renderConstantTable(d);
  renderNumberGrid(d);
}

// ---- ESTADÍSTICAS ----
function renderStats(d) {
  const row = document.getElementById('stats-row');
  const valid = results.filter(s => !s.isCycle);
  const cycleStep = results.find(s => s.isCycle);
  const nums = valid.map(s => s.r);
  const avg = nums.length ? (nums.reduce((a, b) => a + b, 0) / nums.length) : 0;
  const period = cycleStep ? (cycleStep.i - cycleStep.cycleBackTo) : valid.length;

  row.style.display = 'grid';
  row.innerHTML = [
    { label: 'Números generados', value: valid.length, cls: 'indigo' },
    { label: 'Longitud del período', value: cycleStep ? period : '∞', cls: 'violet' },
    { label: 'Ciclo detectado', value: cycleStep ? `Paso ${cycleStep.i}` : 'No', cls: cycleStep ? 'red' : 'green' },
    { label: 'Promedio r̄', value: avg.toFixed(4), cls: '' },
  ].map(s => `
    <div class="stat-card">
      <div class="stat-label">${s.label}</div>
      <div class="stat-value ${s.cls}">${s.value}</div>
    </div>`).join('');
}

// ---- TABLA CUADRADOS MEDIOS ----
function renderSquareTable(d) {
  document.getElementById('empty-state').style.display = 'none';
  document.getElementById('table-wrapper').style.display = 'block';

  const badge = document.getElementById('result-badge');
  badge.style.display = 'inline-block';
  badge.textContent = `${results.filter(s => !s.isCycle).length} núm · ${d} dígitos`;

  document.getElementById('table-head').innerHTML = `
    <tr>
      <th>i</th>
      <th>Xᵢ</th>
      <th>Xᵢ²</th>
      <th>Xᵢ² con 2d=${2 * d} dígitos <span class="hl-col">← díg. medios →</span></th>
      <th>Xᵢ₊₁</th>
      <th>Cálculo de rᵢ</th>
      <th>rᵢ</th>
      <th>Detalle</th>
    </tr>`;

  const tbody = document.getElementById('table-body');
  tbody.innerHTML = '';

  results.forEach((step, idx) => {
    const tr = document.createElement('tr');
    tr.style.animationDelay = `${idx * 25}ms`;

    if (step.isCycle) {
      tr.classList.add('cycle-row');
      tr.innerHTML = `
        <td class="td-step">${step.i}</td>
        <td class="td-cycle">${step.x !== undefined ? step.x.toString().padStart(d, '0') : '—'}</td>
        <td colspan="4" class="td-cycle">
          ⚠ Ciclo detectado — X<sub>${step.i}</sub> ya apareció en el paso ${step.cycleBackTo}
        </td>
        <td></td>`;
    } else {
      tr.innerHTML = `
        <td class="td-step">${step.i}</td>
        <td class="td-x">${step.xPad}</td>
        <td class="td-op">${step.squared}</td>
        <td class="td-padded">${highlightPadded(step.midInfo.padded, step.midInfo.start, step.midInfo.end)}</td>
        <td class="td-next">${step.xNextPad}</td>
        <td class="td-calc">${step.xNextPad} / ${Math.pow(10, d)}</td>
        <td class="td-r">${step.rStr}</td>
        <td><button class="btn-detail" onclick="showDetail(${step.i})">Ver →</button></td>`;
    }
    tbody.appendChild(tr);
  });
}

// ---- TABLA PRODUCTOS MEDIOS ----
function renderProductTable(d) {
  document.getElementById('empty-state').style.display = 'none';
  document.getElementById('table-wrapper').style.display = 'block';

  const badge = document.getElementById('result-badge');
  badge.style.display = 'inline-block';
  badge.textContent = `${results.filter(s => !s.isCycle).length} núm · ${d} dígitos`;

  document.getElementById('table-head').innerHTML = `
    <tr>
      <th>i</th>
      <th>Xᵢ₋₁</th>
      <th>Xᵢ</th>
      <th>Xᵢ₋₁ × Xᵢ</th>
      <th>Producto con 2d=${2 * d} dígitos <span class="hl-col">← díg. medios →</span></th>
      <th>Xᵢ₊₁</th>
      <th>Cálculo de rᵢ</th>
      <th>rᵢ</th>
      <th>Detalle</th>
    </tr>`;

  const tbody = document.getElementById('table-body');
  tbody.innerHTML = '';

  results.forEach((step, idx) => {
    const tr = document.createElement('tr');
    tr.style.animationDelay = `${idx * 25}ms`;

    if (step.isCycle) {
      tr.classList.add('cycle-row');
      tr.innerHTML = `
        <td class="td-step">${step.i}</td>
        <td class="td-op">${step.xPrev?.toString().padStart(d, '0') ?? '—'}</td>
        <td class="td-cycle">${step.xCurr?.toString().padStart(d, '0') ?? '—'}</td>
        <td colspan="4" class="td-cycle">
          ⚠ Ciclo detectado — X<sub>${step.i}</sub> ya apareció en el paso ${step.cycleBackTo}
        </td>
        <td></td>`;
    } else {
      tr.innerHTML = `
        <td class="td-step">${step.i}</td>
        <td class="td-op">${step.xPrevPad}</td>
        <td class="td-x">${step.xCurrPad}</td>
        <td class="td-op">${step.product}</td>
        <td class="td-padded">${highlightPadded(step.midInfo.padded, step.midInfo.start, step.midInfo.end)}</td>
        <td class="td-next violet">${step.xNextPad}</td>
        <td class="td-calc">${step.xNextPad} / ${Math.pow(10, d)}</td>
        <td class="td-r">${step.rStr}</td>
        <td><button class="btn-detail violet" onclick="showDetail(${step.i})">Ver →</button></td>`;
    }
    tbody.appendChild(tr);
  });
}

// ---- TABLA MULTIPLICADOR CONSTANTE ----
function renderConstantTable(d) {
  document.getElementById('empty-state').style.display = 'none';
  document.getElementById('table-wrapper').style.display = 'block';

  const valid = results.filter(s => !s.isCycle);
  const badge = document.getElementById('result-badge');
  badge.style.display = 'inline-block';
  badge.textContent = `${valid.length} núm · ${d} dígitos`;

  // Obtén k del primer paso válido para mostrarlo en el encabezado
  const kLabel = valid.length > 0 ? valid[0].kPad : '?';

  document.getElementById('table-head').innerHTML = `
    <tr>
      <th>i</th>
      <th>Xᵢ</th>
      <th>k ( = ${kLabel} )</th>
      <th>k × Xᵢ</th>
      <th>Producto con 2d=${2 * d} dígitos <span class="hl-col">← díg. medios →</span></th>
      <th>Xᵢ₊₁</th>
      <th>Cálculo de rᵢ</th>
      <th>rᵢ</th>
      <th>Detalle</th>
    </tr>`;

  const tbody = document.getElementById('table-body');
  tbody.innerHTML = '';

  results.forEach((step, idx) => {
    const tr = document.createElement('tr');
    tr.style.animationDelay = `${idx * 25}ms`;

    if (step.isCycle) {
      tr.classList.add('cycle-row');
      tr.innerHTML = `
        <td class="td-step">${step.i}</td>
        <td class="td-cycle">${step.x?.toString().padStart(d, '0') ?? '—'}</td>
        <td colspan="5" class="td-cycle">
          ⚠ Ciclo detectado — X<sub>${step.i}</sub> ya apareció en el paso ${step.cycleBackTo}
        </td>
        <td></td>`;
    } else {
      tr.innerHTML = `
        <td class="td-step">${step.i}</td>
        <td class="td-x">${step.xPad}</td>
        <td class="td-op">${step.kPad}</td>
        <td class="td-op">${step.product}</td>
        <td class="td-padded">${highlightPadded(step.midInfo.padded, step.midInfo.start, step.midInfo.end)}</td>
        <td class="td-next teal">${step.xNextPad}</td>
        <td class="td-calc">${step.xNextPad} / ${Math.pow(10, d)}</td>
        <td class="td-r">${step.rStr}</td>
        <td><button class="btn-detail teal" onclick="showDetail(${step.i})">Ver →</button></td>`;
    }
    tbody.appendChild(tr);
  });
}

// ---- GRID DE NÚMEROS ----
function renderNumberGrid(d) {

  const card = document.getElementById('numbers-card');
  card.style.display = 'block';
  const valid = results.filter(s => !s.isCycle);
  document.getElementById('numbers-grid').innerHTML = valid.map(s => `
    <span class="num-badge" onclick="showDetail(${s.i})" title="i=${s.i}">
      r${s.i} = ${s.rStr}
    </span>`).join('');
}

// ============================================================
// PASO DETALLADO
// ============================================================
function showDetail(stepIndex) {
  const step = results.find(s => s.i === stepIndex && !s.isCycle);
  if (!step) return;

  const d = parseInt(document.getElementById('input-digits').value, 10);
  const mod = Math.pow(10, d);

  const card = document.getElementById('step-detail-card');
  const content = document.getElementById('step-detail-content');
  const label = document.getElementById('detail-step-label');

  card.style.display = 'block';
  label.textContent = `Paso i = ${stepIndex}`;
  card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  let html = '';

  if (currentMethod === 'square') {
    const hlPad = highlightPadded(step.midInfo.padded, step.midInfo.start, step.midInfo.end);
    const posStart = step.midInfo.start + 1;
    const posEnd = step.midInfo.end + 1;
    html = `
      ${detailRow(1, false,
      `Elevar X<sub>${step.i}</sub> al cuadrado`,
      `X<sub>${step.i}</sub>² = <span class="hl-indigo">${step.xPad}</span>² = <span class="hl-yellow">${step.squared}</span>`)}
      ${detailRow(2, false,
        `Expresar con 2d = ${2 * d} dígitos (rellenar con ceros a la izquierda si el resultado tiene menos de ${2 * d} dígitos)`,
        `${hlPad}`)}
      ${detailRow(3, false,
          `Extraer d = ${d} dígitos centrales (posiciones ${posStart}–${posEnd})`,
          `X<sub>${step.i + 1}</sub> = <span class="hl-indigo">${step.xNextPad}</span>`)}
      ${detailRow(4, true,
            `Normalizar → número pseudoaleatorio`,
            `r<sub>${step.i}</sub> = ${step.xNextPad} / ${mod.toLocaleString('es-MX')} = <span class="hl-result">${step.rStr}</span>`)}`;

  } else if (currentMethod === 'product') {
    const hlPad = highlightPadded(step.midInfo.padded, step.midInfo.start, step.midInfo.end);
    const posStart = step.midInfo.start + 1;
    const posEnd = step.midInfo.end + 1;
    html = `
      ${detailRow(1, false,
      `Multiplicar X<sub>${step.i}</sub>₋₁ × X<sub>${step.i}</sub>`,
      `${step.xPrevPad} × ${step.xCurrPad} = <span class="hl-yellow">${step.product}</span>`)}
      ${detailRow(2, false,
        `Expresar con 2d = ${2 * d} dígitos`,
        `${hlPad}`)}
      ${detailRow(3, false,
          `Extraer d = ${d} dígitos centrales (posiciones ${posStart}–${posEnd})`,
          `X<sub>${step.i + 1}</sub> = <span class="hl-violet">${step.xNextPad}</span>`)}
      ${detailRow(4, true,
            `Normalizar → número pseudoaleatorio`,
            `r<sub>${step.i}</sub> = ${step.xNextPad} / ${mod.toLocaleString('es-MX')} = <span class="hl-result">${step.rStr}</span>`)}`;

  } else {
    // Multiplicador Constante
    const hlPad = highlightPadded(step.midInfo.padded, step.midInfo.start, step.midInfo.end);
    const posStart = step.midInfo.start + 1;
    const posEnd = step.midInfo.end + 1;
    html = `
      ${detailRow(1, false,
      `Multiplicar constante k × X<sub>${step.i}</sub>`,
      `k × X<sub>${step.i}</sub> = <span class="hl-teal">${step.kPad}</span> × <span class="hl-indigo">${step.xPad}</span> = <span class="hl-yellow">${step.product}</span>`)}
      ${detailRow(2, false,
        `Expresar con 2d = ${2 * d} dígitos (rellenar con ceros si el resultado tiene menos de ${2 * d} dígitos)`,
        `${hlPad}`)}
      ${detailRow(3, false,
          `Extraer d = ${d} dígitos centrales (posiciones ${posStart}–${posEnd})`,
          `X<sub>${step.i + 1}</sub> = <span class="hl-teal">${step.xNextPad}</span>`)}
      ${detailRow(4, true,
            `Normalizar → número pseudoaleatorio`,
            `r<sub>${step.i}</sub> = ${step.xNextPad} / ${mod.toLocaleString('es-MX')} = <span class="hl-result">${step.rStr}</span>`)}`;
  }

  content.innerHTML = html;
}

/** Genera un bloque de paso para el detalle */
function detailRow(num, isResult, desc, formula) {
  return `
    <div class="detail-step ${isResult ? 'green-step' : ''}">
      <div class="step-circle ${isResult ? 'green-circle' : ''}">${num}</div>
      <div>
        <div class="step-desc">${desc}</div>
        <div class="step-formula">${formula}</div>
      </div>
    </div>`;
}

// ============================================================
// UTILIDADES
// ============================================================
function clearResults() {
  results = [];
  document.getElementById('empty-state').style.display = 'block';
  document.getElementById('table-wrapper').style.display = 'none';
  document.getElementById('table-head').innerHTML = '';
  document.getElementById('table-body').innerHTML = '';
  document.getElementById('stats-row').style.display = 'none';
  document.getElementById('numbers-card').style.display = 'none';
  document.getElementById('step-detail-card').style.display = 'none';
  document.getElementById('result-badge').style.display = 'none';
}

function showError(msg) {
  const el = document.getElementById('error-msg');
  el.textContent = msg;
  el.style.display = 'block';
}
function hideError() {
  document.getElementById('error-msg').style.display = 'none';
}
