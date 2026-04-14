const DPP = (() => {
  const STATUS_MAP = {
    verified: { label: 'Verificado', cls: 'st-verified', icon: '\u2705' },
    partial: { label: 'Parcial', cls: 'st-partial', icon: '\u26A0\uFE0F' },
    pending: { label: 'Pendiente', cls: 'st-pending', icon: '\u274C' },
    assumed: { label: 'Asumido', cls: 'st-assumed', icon: '\u2796' }
  };
  const LEGAL_CLS = { 'LEY': 'legal-ley', 'PROYECCION': 'legal-proyeccion', 'PENDIENTE AD': 'legal-pendiente' };

  function legalClass(basis) {
    if (!basis) return '';
    for (var k in LEGAL_CLS) { if (basis.indexOf(k) >= 0) return LEGAL_CLS[k]; }
    return '';
  }
  function statusBadge(s) {
    var m = STATUS_MAP[s] || STATUS_MAP.pending;
    return '<span class="status-badge ' + m.cls + '">' + m.icon + ' ' + m.label + '</span>';
  }
  function humanKey(key) {
    return key.replace(/([A-Z])/g, ' $1').replace(/^./, function(c){ return c.toUpperCase(); }).replace(/_/g, ' ');
  }
  function formatValue(val) {
    if (val === null || val === undefined) return '<span class="no-data">\u2014 sin datos \u2014</span>';
    if (Array.isArray(val)) return val.length ? val.join(', ') : '<span class="no-data">\u2014 vac\u00edo \u2014</span>';
    if (typeof val === 'boolean') return val ? 'S\u00ed' : 'No';
    return String(val);
  }

  function renderAttribute(key, attr) {
    if (key.startsWith('_')) return '';
    var metaKeys = ['_status','_legalBasis','_sourceDocument','_evidence','_note'];
    var dataFields = '';
    Object.keys(attr).forEach(function(k) {
      if (metaKeys.indexOf(k) >= 0) return;
      dataFields += '<span class="field-name">' + humanKey(k) + ':</span> ' + formatValue(attr[k]) + '<br>';
    });
    var status = statusBadge(attr._status);
    var lCls = legalClass(attr._legalBasis);
    var docHTML = '';
    if (attr._sourceDocument) {
      var d = attr._sourceDocument;
      docHTML = '<div class="source-doc"><span class="doc-icon">\uD83D\uDCC4</span><div class="doc-info">' +
        '<strong>' + (d.name||'--') + '</strong>' +
        '<span class="doc-type">' + (d.type||'') + '</span>' +
        '<span class="doc-gen">Genera: ' + (d.generatedBy||'--') + '</span>' +
        '<span class="doc-deadline">Plazo: ' + (d.deadline||'--') + '</span>' +
        '</div></div>';
    }
    var evidenceHTML = '';
    if (attr._evidence) {
      var e = attr._evidence;
      if (e.blockchainTxHash) {
        var sh = e.blockchainTxHash.length > 16 ? e.blockchainTxHash.slice(0,8) + '\u2026' + e.blockchainTxHash.slice(-6) : e.blockchainTxHash;
        evidenceHTML = '<div class="trackline-badge verified"><span class="tl-icon">\u26D3\uFE0F</span><div class="tl-info">' +
          '<strong>Trackline verificado</strong>' +
          '<span class="tl-hash" title="' + e.blockchainTxHash + '">Tx: ' + sh + '</span>' +
          '<span class="tl-pid">Proceso: ' + (e.tracklineProcessId||'--') + '</span>' +
          '<span class="tl-date">Fecha: ' + (e.registeredDate||'--') + '</span>' +
          '<span class="tl-by">Por: ' + (e.registeredBy||'--') + '</span>' +
          '</div></div>';
      } else {
        evidenceHTML = '<div class="trackline-badge pending"><span class="tl-icon">\u26D3\uFE0F</span><span class="tl-pending">Sin evidencia blockchain</span></div>';
      }
    }
    var legalPill = attr._legalBasis ? '<span class="legal-pill ' + lCls + '" title="' + attr._legalBasis + '">' + attr._legalBasis + '</span>' : '';
    var noteHTML = attr._note ? '<div class="attr-note">' + attr._note + '</div>' : '';
    return '<div class="attribute" data-status="' + (attr._status||'pending') + '">' +
      '<div class="attr-header"><h3>' + humanKey(key) + '</h3>' + status + '</div>' +
      '<div class="attr-body">' +
      '<div class="attr-data">' + dataFields + '</div>' +
      legalPill + noteHTML + docHTML + evidenceHTML +
      '</div></div>';
  }

  function renderSection(sectionKey, section, extraCls) {
    var icon = section._icon || '\uD83D\uDCC1';
    var title = section._title || humanKey(sectionKey);
    var attrsHTML = '';
    var counts = { verified:0, partial:0, pending:0 };
    Object.keys(section).forEach(function(k) {
      if (k.startsWith('_')) return;
      attrsHTML += renderAttribute(k, section[k]);
      var st = section[k]._status || 'pending';
      counts[st] = (counts[st]||0) + 1;
    });
    var cls = extraCls ? ' ' + extraCls : '';
    return '<section class="dpp-section' + cls + '" id="sec-' + sectionKey + '">' +
      '<div class="section-header" onclick="DPP.toggleSection(\'' + sectionKey + '\')">' +
      '<span class="section-icon">' + icon + '</span>' +
      '<h2>' + title + '</h2>' +
      '<div class="section-counts">' +
      (counts.verified ? '<span class="cnt cnt-v">' + counts.verified + '</span>' : '') +
      (counts.partial ? '<span class="cnt cnt-pa">' + counts.partial + '</span>' : '') +
      (counts.pending ? '<span class="cnt cnt-pe">' + counts.pending + '</span>' : '') +
      '</div>' +
      '<span class="chevron" id="chev-' + sectionKey + '">\u25BC</span>' +
      '</div>' +
      '<div class="section-body" id="body-' + sectionKey + '">' + attrsHTML + '</div>' +
      '</section>';
  }

  function renderMeta(meta) {
    var productName = '';
    if (meta.notes) productName = '<div class="meta-row"><strong>\uD83D\uDCCB</strong> ' + meta.notes + '</div>';
    return '<div class="dpp-meta">' +
      productName +
      '<div class="meta-row"><strong>Esquema:</strong> ' + meta.schema + '</div>' +
      '<div class="meta-row"><strong>Regulaci\u00f3n:</strong> ' + meta.regulation + '</div>' +
      '<div class="meta-row"><strong>Versi\u00f3n:</strong> ' + meta.version + ' \u2014 ' + meta.generatedDate + '</div>' +
      '<div class="meta-row"><strong>Estado DPP:</strong> ' + (meta.dppStatus?meta.dppStatus.value:'--') + ' \u00b7 Granularidad: ' + (meta.dppGranularity?meta.dppGranularity.value:'--') + '</div>' +
      '<div class="meta-row"><strong>Evidencia:</strong> ' + meta.evidenceProvider + '</div>' +
      '</div>';
  }

  function renderSummary(data) {
    var total=0, verified=0, partial=0, pending=0;
    var urgentItems = [];
    var tracklineCount = 0;
    Object.keys(data).forEach(function(sk) {
      if (sk === '_meta') return;
      Object.keys(data[sk]).forEach(function(ak) {
        if (ak.startsWith('_')) return;
        total++;
        var attr = data[sk][ak];
        var st = attr._status;
        if (st === 'verified') verified++;
        else if (st === 'partial') partial++;
        else pending++;
        // Count trackline evidence
        if (attr._evidence && attr._evidence.blockchainTxHash) tracklineCount++;
        // Find urgent items (deadline before end of 2026)
        if (attr._sourceDocument && attr._sourceDocument.deadline) {
          var dl = attr._sourceDocument.deadline;
          if (dl.indexOf('2026') >= 0 && st !== 'verified') {
            urgentItems.push({name: humanKey(ak), deadline: dl, section: data[sk]._title || sk});
          }
        }
      });
    });
    var pct = total ? Math.round((verified/total)*100) : 0;
    var pctPartial = total ? Math.round(((verified+partial)/total)*100) : 0;
    var dashLen = Math.PI * 100;
    var dashOff = dashLen * (1 - pct/100);

    // Executive dashboard
    var urgentHTML = '';
    if (urgentItems.length > 0) {
      urgentHTML = '<div class="dashboard-urgent"><strong>\u26A0\uFE0F Plazos urgentes 2026:</strong><ul>';
      urgentItems.slice(0, 5).forEach(function(item) {
        urgentHTML += '<li><strong>' + item.name + '</strong> \u2014 ' + item.deadline + ' <span class="urgent-section">(' + item.section + ')</span></li>';
      });
      if (urgentItems.length > 5) urgentHTML += '<li>... y ' + (urgentItems.length - 5) + ' m\u00e1s</li>';
      urgentHTML += '</ul></div>';
    }

    return '<div class="dpp-dashboard">' +
      '<div class="dashboard-header"><h2>\uD83D\uDCCA Panel ejecutivo DPP</h2></div>' +
      '<div class="dashboard-grid">' +
      '<div class="dashboard-ring">' +
      '<svg viewBox="0 0 120 120">' +
      '<circle cx="60" cy="60" r="50" class="ring-bg"/>' +
      '<circle cx="60" cy="60" r="50" class="ring-fill" stroke-dasharray="' + dashLen + '" stroke-dashoffset="' + dashOff + '"/>' +
      '</svg>' +
      '<span class="ring-label">' + pct + '%</span>' +
      '</div>' +
      '<div class="dashboard-stats">' +
      '<div class="stat"><span class="dot dot-v"></span> Verificados: <strong>' + verified + '</strong></div>' +
      '<div class="stat"><span class="dot dot-pa"></span> Parciales: <strong>' + partial + '</strong></div>' +
      '<div class="stat"><span class="dot dot-pe"></span> Pendientes: <strong>' + pending + '</strong></div>' +
      '<div class="stat-total">Total: ' + total + ' atributos \u00b7 Cobertura: ' + pctPartial + '%</div>' +
      '</div>' +
      '<div class="dashboard-kpis">' +
      '<div class="kpi"><span class="kpi-number">' + tracklineCount + '</span><span class="kpi-label">\u26D3\uFE0F Trackline</span></div>' +
      '<div class="kpi"><span class="kpi-number">' + urgentItems.length + '</span><span class="kpi-label">\u26A0\uFE0F Urgentes 2026</span></div>' +
      '<div class="kpi"><span class="kpi-number">' + (total - verified - partial) + '</span><span class="kpi-label">\u274C Sin datos</span></div>' +
      '</div>' +
      '</div>' +
      urgentHTML +
      '</div>';
  }

  async function init(jsonPath, containerId) {
    var container = document.getElementById(containerId);
    container.innerHTML = '<div class="loading">Cargando DPP\u2026</div>';
    try {
      var res = await fetch(jsonPath);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      var data = await res.json();
      window._dppData = data;
      var html = renderMeta(data._meta) + renderSummary(data);

      // Registry section first (highlighted)
      if (data._registry) {
        html += renderSection('_registry', data._registry, 'registry-highlight');
      }

      html += '<div class="filter-bar">' +
        '<button class="filter-btn active" data-filter="all">Todos</button>' +
        '<button class="filter-btn" data-filter="verified">\u2705 Verificados</button>' +
        '<button class="filter-btn" data-filter="partial">\u26A0\uFE0F Parciales</button>' +
        '<button class="filter-btn" data-filter="pending">\u274C Pendientes</button>' +
        '</div>';

      Object.keys(data).forEach(function(k) {
        if (k === '_meta' || k === '_registry') return;
        html += renderSection(k, data[k], '');
      });
      container.innerHTML = html;
      bindFilters();
    } catch(err) {
      container.innerHTML = '<div class="error">Error cargando DPP: ' + err.message + '</div>';
    }
  }

  function bindFilters() {
    document.querySelectorAll('.filter-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        document.querySelectorAll('.filter-btn').forEach(function(b){ b.classList.remove('active'); });
        btn.classList.add('active');
        var f = btn.dataset.filter;
        document.querySelectorAll('.attribute').forEach(function(el) {
          if (f === 'all') { el.style.display = ''; return; }
          el.style.display = (el.dataset.status === f) ? '' : 'none';
        });
      });
    });
  }

  function toggleSection(key) {
    var body = document.getElementById('body-' + key);
    var chev = document.getElementById('chev-' + key);
    if (body.classList.contains('collapsed')) {
      body.classList.remove('collapsed');
      chev.textContent = '\u25BC';
    } else {
      body.classList.add('collapsed');
      chev.textContent = '\u25B6';
    }
  }

  return { init: init, toggleSection: toggleSection };
})();
