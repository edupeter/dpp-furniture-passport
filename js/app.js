// ─── Furniture DPP Viewer App ───
const SECTIONS_ORDER = [
  'productIdentification',
  'materialComposition',
  'chemicalSafety',
  'carbonFootprint',
  'durability',
  'repairability',
  'circularityAndDisassembly',
  'packaging',
  'supplyChain',
  'complianceAndDigital'
];

let dppData = null;

window.addEventListener('DOMContentLoaded', () => {
  fetch('data/dpp.json')
    .then(r => r.json())
    .then(data => {
      dppData = data;
      renderAll();
    })
    .catch(e => {
      document.getElementById('app').innerHTML = `<div style="padding:2rem;color:#dc2626;">Error cargando datos: ${e.message}</div>`;
    });
});

function renderAll() {
  // Meta
  const meta = dppData._meta;
  document.getElementById('dpp-id').textContent =
    `DPP ID: ${meta.dppStatus?.value || 'draft'} · v${meta.version} · ${meta.generatedDate}`;
  document.getElementById('footer-version').textContent = meta.version;
  document.getElementById('footer-date').textContent = meta.generatedDate;

  // Count statuses
  const counts = { confirmed: 0, partial: 0, assumed: 0, pending: 0 };
  countStatuses(dppData, counts);
  document.getElementById('count-confirmed').textContent = counts.confirmed;
  document.getElementById('count-partial').textContent = counts.partial;
  document.getElementById('count-assumed').textContent = counts.assumed;
  document.getElementById('count-pending').textContent = counts.pending;

  // Render sections
  const app = document.getElementById('app');
  app.innerHTML = '';
  SECTIONS_ORDER.forEach(key => {
    if (!dppData[key]) return;
    const section = dppData[key];
    const icon = section._icon || '📄';
    const title = section._title || formatLabel(key);
    app.appendChild(buildSection(icon, title, section));
  });
}

function countStatuses(obj, counts) {
  if (!obj || typeof obj !== 'object') return;
  if (Array.isArray(obj)) {
    obj.forEach(item => countStatuses(item, counts));
    return;
  }
  if (obj._status && counts[obj._status] !== undefined) {
    counts[obj._status]++;
  }
  for (const key of Object.keys(obj)) {
    if (key.startsWith('_')) continue;
    countStatuses(obj[key], counts);
  }
}

function buildSection(icon, title, data) {
  const section = document.createElement('div');
  section.className = 'section';

  const header = document.createElement('div');
  header.className = 'section-header';
  header.innerHTML = `<span class="icon">${icon}</span><h2>${title}</h2><span class="chevron">▾</span>`;

  const body = document.createElement('div');
  body.className = 'section-body';

  header.onclick = () => {
    header.classList.toggle('collapsed');
    body.classList.toggle('hidden');
  };

  renderFieldsView(body, data);
  section.appendChild(header);
  section.appendChild(body);
  return section;
}

function renderFieldsView(container, obj) {
  for (const key of Object.keys(obj)) {
    if (key.startsWith('_')) continue;
    const val = obj[key];

    if (Array.isArray(val)) {
      renderArrayView(container, key, val);
    } else if (val && typeof val === 'object' && ('value' in val || '_status' in val || 'url' in val)) {
      renderLeafField(container, key, val);
    } else if (val && typeof val === 'object') {
      // Sub-group
      const sub = document.createElement('div');
      sub.className = 'sub-title';
      sub.textContent = formatLabel(key);
      container.appendChild(sub);
      renderFieldsView(container, val);
    }
  }
}

function renderLeafField(container, key, field) {
  const div = document.createElement('div');
  div.className = 'field';

  const row = document.createElement('div');
  row.className = 'field-row';

  const left = document.createElement('div');

  const label = document.createElement('div');
  label.className = 'field-label';
  let labelText = formatLabel(key);
  if (field.unit) labelText += ` (${field.unit})`;
  label.textContent = labelText;
  left.appendChild(label);

  // Value
  const valDiv = document.createElement('div');
  const displayVal = field.value !== null && field.value !== undefined
    ? String(field.value)
    : (field.url || null);

  if (displayVal !== null) {
    valDiv.className = 'field-value';
    if (field.url && displayVal.startsWith('http')) {
      valDiv.innerHTML = `<a href="${displayVal}" target="_blank" style="color:#2e7d4f;">${displayVal}</a>`;
    } else {
      valDiv.textContent = displayVal;
    }
  } else {
    valDiv.className = 'field-value null-val';
    valDiv.textContent = 'Sin dato';
  }
  left.appendChild(valDiv);

  // Note
  if (field._note) {
    const note = document.createElement('div');
    note.className = 'field-note';
    note.textContent = field._note;
    left.appendChild(note);
  }

  // Extra fields
  const extras = ['address', 'country', 'species', 'certification', 'licenseNumber',
    'testMethod', 'limit', 'scope', 'dataQuality', 'category', 'conditions',
    'methodology', 'tools', 'estimatedTime', 'cpcCode', 'programOperator',
    'validUntil', 'accreditationNumber', 'accreditedBy', 'dataCarrier',
    'present', 'concentration', 'trainingCompliance', 'notified', 'scipNumber',
    'compliant', 'declarationDate', 'available', 'eudrCompliant', 'geoLocation',
    'harvestDate', 'dueDiligenceStatement', 'cs3dCompliant', 'reportUrl',
    'tier1Suppliers', 'recyclingRate', 'landfillRate', 'incinerationRate',
    'containsSVHC', 'yearsPostSale', 'width', 'depth', 'height', 'seatHeight',
    'dataType'];
  extras.forEach(k => {
    if (field[k] !== undefined && field[k] !== null) {
      const extra = document.createElement('div');
      extra.className = 'field-note';
      extra.innerHTML = `<strong>${formatLabel(k)}:</strong> ${field[k]}`;
      left.appendChild(extra);
    }
  });

  row.appendChild(left);

  // Status badge
  if (field._status) {
    const badge = document.createElement('span');
    badge.className = 'status ' + field._status;
    const labels = { confirmed: 'Confirmado', partial: 'Parcial', assumed: 'Supuesto', pending: 'Pendiente' };
    badge.textContent = labels[field._status] || field._status;
    row.appendChild(badge);
  }

  div.appendChild(row);
  container.appendChild(div);
}

function renderArrayView(container, key, arr) {
  if (!arr.length) return;
  const sub = document.createElement('div');
  sub.className = 'sub-title';
  sub.textContent = `${formatLabel(key)} (${arr.length})`;
  container.appendChild(sub);

  arr.forEach((item, i) => {
    if (typeof item === 'object' && item !== null) {
      for (const k of Object.keys(item)) {
        if (k.startsWith('_')) continue;
        const v = item[k];
        if (v && typeof v === 'object' && ('value' in v || '_status' in v)) {
          renderLeafField(container, k, v);
        } else if (v !== null && v !== undefined && typeof v !== 'object') {
          const div = document.createElement('div');
          div.className = 'field';
          const row = document.createElement('div');
          row.className = 'field-row';
          const left = document.createElement('div');
          const label = document.createElement('div');
          label.className = 'field-label';
          label.textContent = formatLabel(k);
          left.appendChild(label);
          const valDiv = document.createElement('div');
          valDiv.className = 'field-value';
          valDiv.textContent = String(v);
          left.appendChild(valDiv);
          row.appendChild(left);
          if (item._status) {
            const badge = document.createElement('span');
            badge.className = 'status ' + item._status;
            const labels = { confirmed: 'Confirmado', partial: 'Parcial', assumed: 'Supuesto', pending: 'Pendiente' };
            badge.textContent = labels[item._status] || item._status;
            row.appendChild(badge);
          }
          div.appendChild(row);
          container.appendChild(div);
        }
      }
    }
  });
}

function formatLabel(key) {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, s => s.toUpperCase())
    .replace(/_/g, ' ')
    .replace(/  +/g, ' ')
    .trim();
}
