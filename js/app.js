const DPP = (() => {
  const STATUS_MAP = {
    verified: { label: 'Verificado', cls: 'st-verified', icon: 'V' },
    partial: { label: 'Parcial', cls: 'st-partial', icon: 'P' },
    pending: { label: 'Pendiente', cls: 'st-pending', icon: 'X' },
    assumed: { label: 'Asumido', cls: 'st-assumed', icon: '-' }
  };
  const LEGAL_CLS = { 'LEY': 'legal-ley', 'PROYECCION': 'legal-proyeccion', 'PENDIENTE AD': 'legal-pendiente' };

  function legalClass(basis) {
    if (!basis) return '';
    for (const [k,v] of Object.entries(LEGAL_CLS)) { if (basis.includes(k)) return v; }
    return '';
  }
  function statusBadge(s) {
    const m = STATUS_MAP[s] || STATUS_MAP.pending;
    return '<span class="status-badge ' + m.cls + '">' + m.icon + ' ' + m.label + '</span>';
  }
  function humanKey(key) {
    return key.replace(/([A-Z])/g, ' $1').replace(/^./, function(c){ return c.toUpperCase(); }).replace(/_/g, ' ');
  }
  function formatValue(val) {
    if (val === null || val === undefined) return '<span class="no-data">-- sin datos --</span>';
    if (Array.isArray(val)) return val.length ? val.join(', ') : '<span class="no-data">-- vacio --</span>';
    if (typeof val === 'boolean') return val ? 'Si' : 'No';
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
      docHTML = '<div class="source-doc"><span class="doc-icon">DOC</span><div class="doc-info">' +
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
        var sh = e.blockchainTxHash.length > 16 ? e.blockchainTxHash.slice(0,8) + '...' + e.blockchainTxHash.slice(-6) : e.blockchainTxHash;
        evidenceHTML = '<div class="trackline-badge verified"><span class="tl-icon">CHAIN</span><div class="tl-info">' +
          '<strong>Trackline verificado</strong>' +
          '<span class="tl-hash" title="' + e.blockchainTxHash + '">Tx: ' + sh + '</span>' +
          '<span class="tl-pid">Proceso: ' + (e.tracklineProcessId||'--') + '</span>' +
          '<span class="tl-date">Fecha: ' + (e.registeredDate||'--') + '</span>' +
          '<span class="tl-by">Por: ' + (e.registeredBy||'--') + '</span>' +
          '</div></div>';
      } else {
        evidenceHTML = '<div class="trackline-badge pending"><span class="tl-icon">CHAIN</span><span class="tl-pending">Sin evidencia blockchain</span></div>';
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

  function renderSection(sectionKey, section) {
    var icon = section._icon || 'SEC';
    var title = section._title || humanKey(sectionKey);
    var attrsHTML = '';
    var counts = { verified:0, partial:0, pending:0 };
    Object.keys(section).forEach(function(k) {
      if (k.startsWith('_')) return;
      attrsHTML += renderAttribute(k, section[k]);
      var st = section[k]._status || 'pending';
      counts[st] = (counts[st]||0) + 1;
    });
    return '<section class="dpp-section" id="sec-' + sectionKey + '">' +
      '<div class="section-header" onclick="DPP.toggleSection(\'' + sectionKey + '\')">' +
      '<span class="section-icon">' + icon + '</span>' +
      '<h2>' + title + '</h2>' +
      '<div class="section-counts">' +
      '<span class="cnt cnt-v">' + counts.verified + '</span>' +
      '<span class="cnt cnt-pa">' + counts.partial + '</span>' +
      '<span class="cnt cnt-pe">' + counts.pending + '</span>' +
      '</div>' +
      '<span class="chevron" id="chev-' + sectionKey + '">V</span>' +
      '</div>' +
      '<div class="section-body" id="body-' + sectionKey + '">' + attrsHTML + '</div>' +
      '</section>';
  }

  function renderMeta(meta) {
    return '<div class="dpp-meta">' +
      '<div class="meta-row"><strong>Esquema:</strong> ' + meta.schema + '</div>' +
      '<div class="meta-row"><strong>Regulacion:</strong> ' + meta.regulation + '</div>' +
      '<div class="meta-row"><strong>Version:</strong> ' + meta.version + ' - ' + meta.generatedDate + '</div>' +
      '<div class="meta-row"><strong>Estado DPP:</strong> ' + (meta.dppStatus?meta.dppStatus.value:'--') + ' - Granularidad: ' + (meta.dppGranularity?meta.dppGranularity.value:'--') + '</div>' +
      '<div class="meta-row"><strong>Evidencia:</strong> ' + meta.evidenceProvider + '</div>' +
      '</div>';
  }

  function renderSummary(data) {
    var total=0, verified=0, partial=0, pending=0;
    Object.keys(data).forEach(function(sk) {
      if (sk === '_meta') return;
      Object.keys(data[sk]).forEach(function(ak) {
        if (ak.startsWith('_')) return;
        total++;
        var st = data[sk][ak]._status;
        if (st === 'verified') verified++;
        else if (st === 'partial') partial++;
        else pending++;
      });
    });
    var pct = total ? Math.round((verified/total)*100) : 0;
    var dashLen = Math.PI * 100;
    var dashOff = dashLen * (1 - pct/100);
    return '<div class="dpp-summary">' +
      '<div class="summary-ring">' +
      '<svg viewBox="0 0 120 120">' +
      '<circle cx="60" cy="60" r="50" class="ring-bg"/>' +
      '<circle cx="60" cy="60" r="50" class="ring-fill" stroke-dasharray="' + dashLen + '" stroke-dashoffset="' + dashOff + '"/>' +
      '</svg>' +
      '<span class="ring-label">' + pct + '%</span>' +
      '</div>' +
      '<div class="summary-stats">' +
      '<div class="summary-title">Progreso DPP</div>' +
      '<div class="stat"><span class="dot dot-v"></span> Verificados: <strong>' + verified + '</strong></div>' +
      '<div class="stat"><span class="dot dot-pa"></span> Parciales: <strong>' + partial + '</strong></div>' +
      '<div class="stat"><span class="dot dot-pe"></span> Pendientes: <strong>' + pending + '</strong></div>' +
      '<div class="stat-total">Total atributos: ' + total + '</div>' +
      '</div></div>';
  }

  async function init(jsonPath, containerId) {
    var container = document.getElementById(containerId);
    container.innerHTML = '<div class="loading">Cargando DPP...</div>';
    try {
      var res = await fetch(jsonPath);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      var data = await res.json();
      window._dppData = data;
      var html = renderMeta(data._meta) + renderSummary(data);
      html += '<div class="filter-bar">' +
        '<button class="filter-btn active" data-filter="all">Todos</button>' +
        '<button class="filter-btn" data-filter="verified">Verificados</button>' +
        '<button class="filter-btn" data-filter="partial">Parciales</button>' +
        '<button class="filter-btn" data-filter="pending">Pendientes</button>' +
        '</div>';
      Object.keys(data).forEach(function(k) {
        if (k === '_meta') return;
        html += renderSection(k, data[k]);
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
      chev.textContent = 'V';
    } else {
      body.classList.add('collapsed');
      chev.textContent = '>';
    }
  }

  return { init: init, toggleSection: toggleSection };
})();
