
"use strict";
/* ---------- 유틸 ---------- */
const $ = s => document.querySelector(s);
const won = n => n.toLocaleString('ko-KR') + '원';
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function quantile(arr,q){const s=[...arr].sort((a,b)=>a-b);const p=(s.length-1)*q;const lo=Math.floor(p),hi=Math.ceil(p);return s[lo]+(s[hi]-s[lo])*(p-lo);}

/* ---------- 가격 이력 생성 (결정적) ---------- */
function genSeries(seed, base, noise, promoDepth, promoEvery, last, startWeek=0){
  const rnd = mulberry32(seed);
  const pts = [];
  for(let w=startWeek; w<52; w++){
    let p = base + (rnd()-0.5)*2*noise;
    const cycle = w % promoEvery;
    if(cycle===0 || cycle===1) p = base - promoDepth - rnd()*noise; // 세일 주간
    pts.push({w, price: Math.round(p/100)*100});
  }
  if(last!=null) pts[pts.length-1].price = last;
  return pts;
}

/* 판정서 데이터는 verdicts/*.json 에서 fetch (임베디드 데이터 없음) */
const CASES = {};

/* ---------- 뷰 전환 ---------- */
const views = ['home','loading','report'];
function show(v){ views.forEach(x => $('#view-'+x).classList.toggle('hidden', x!==v)); window.scrollTo({top:0}); }

function toast(msg){
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(t._h); t._h = setTimeout(()=>t.classList.remove('show'), 2200);
}

/* ---------- 로딩 연출 ---------- */
function runLoading(caseKey){
  show('loading');
  const steps = document.querySelectorAll('#view-loading .step');
  steps.forEach(s => s.classList.remove('on','now'));
  let i = 0;
  const tick = () => {
    if(i>0) steps[i-1].classList.replace('now','on') || steps[i-1].classList.add('on');
    if(i < steps.length){ steps[i].classList.add('now'); i++; setTimeout(tick, 340); }
    else setTimeout(()=>renderReport(caseKey), 250);
  };
  tick();
}

/* ---------- 판정서 렌더 ---------- */
let seq = 4217;
function renderReport(key){
  const c = CASES[key];
  const now = new Date();
  const pad = n => String(n).padStart(2,'0');
  $('#r-id').textContent = c.vid ||
    `KHUB-V-${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}-${String(seq++).padStart(5,'0')}(미리보기)`;
  const isPreview = c.vid && c.vid.includes('-P');
  $('#r-time').textContent = !c.vid
    ? `${now.getFullYear()}.${pad(now.getMonth()+1)}.${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())} KST`
    : isPreview
      ? `${now.getFullYear()}.${pad(now.getMonth()+1)}.${pad(now.getDate())}`
      : `${now.getFullYear()}.${pad(now.getMonth()+1)}.${pad(now.getDate())} 발급`;

  if(c.img){ $('#r-thumb').innerHTML = `<img src="${c.img}" alt="" loading="lazy" style="width:100%;height:100%;object-fit:cover;border-radius:11px;" onerror="this.remove()">`; }
  else { $('#r-thumb').textContent = (c.brand||'·').slice(0,1); $('#r-thumb').style.fontSize='24px'; $('#r-thumb').style.color='var(--series)'; $('#r-thumb').style.fontWeight='800'; }
  $('#r-brand').textContent = c.brand;
  $('#r-name').textContent = c.name;
  $('#r-name').title = c.name;
  /* 상품명·CTA·썸네일 → 올리브영(어필리에이트 링크가 있으면 그 링크). 판정과 수수료는 분리 원칙. */
  const oyHref = c.aff || (c.gno ? 'https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=' + c.gno : '');
  const nameEl = $('#r-name'), ctaEl = $('#r-oy');
  if(oyHref){
    nameEl.href = oyHref; nameEl.removeAttribute('aria-disabled');
    ctaEl.href = oyHref; ctaEl.classList.remove('hidden');
    const th = $('#r-thumb');
    th.style.cursor = 'pointer';
    th.onclick = ()=> window.open(oyHref, '_blank', 'noopener');
  } else {
    nameEl.removeAttribute('href'); ctaEl.classList.add('hidden');
  }
  $('#r-opt').textContent = c.opt || '';
  $('#r-opt').classList.toggle('hidden', !c.opt);
  $('#r-cur').textContent = won(c.cur);
  const hasDc = c.dcShown && c.normal !== c.cur;
  $('#r-normal').textContent = hasDc ? won(c.normal) : '';
  /* 할인율 문구 제거 (2026-09-15) — 취소선 정가와 구간 띠가 이미 말한다 */
  $('#r-dc').textContent = '';

  /* 추적 정지 — 21일 이상 미관측. 가격이 '현재가'가 아님을 먼저 밝힌다. (2026-08-12)
     단종 확인(discontinued_since)과 '그냥 안 보임'은 다른 사실이므로 문구를 나눈다. */
  const pz = c.paused;
  const pzBar = $('#r-paused'), pzNote = $('#r-stale-note'), prodEl = $('#r-prod');
  if(pz){
    const seen = (pz.lastSeen||'').replace(/-/g,'.');
    $('#r-paused-t').textContent = pz.reason === 'discontinued'
      ? '추적 정지 — 판매 종료 확인됨'
      : `추적 정지 — ${pz.days}일째 미관측`;
    $('#r-paused-s').textContent = pz.reason === 'discontinued'
      ? `${(pz.discontinuedSince||'').replace(/-/g,'.')} 이후 올리브영에서 판매가 확인되지 않습니다. `
        + `아래 가격은 마지막 관측일(${seen}) 기준이며 더 이상 갱신하지 않습니다. 판정 내용은 기록으로 보존합니다.`
      : `${seen} 이후 이 상품이 수집 범위에서 관측되지 않아 가격 갱신을 멈췄습니다. `
        + `품절·판매 종료일 수도, 단순히 수집 대상에서 빠진 것일 수도 있어 단정하지 않습니다. `
        + `아래 가격은 마지막 관측일 기준입니다.`;
    pzBar.classList.remove('hidden');
    prodEl.classList.add('is-paused');
    pzNote.textContent = `※ ${seen} 마지막 관측가 · 현재가 아님`;
    pzNote.classList.remove('hidden');
  } else {
    pzBar.classList.add('hidden');
    prodEl.classList.remove('is-paused');
    pzNote.classList.add('hidden');
  }

  const v = $('#r-verdict');
  v.className = 'verdict v-' + c.verdict;
  $('#r-vic').textContent = c.vic;
  $('#r-vtitle').textContent = c.vtitle;
  $('#r-vdesc').textContent = c.vdesc;

  /* 2축 판정 칩 — 정가 진위(전체 관측) · 구매 타이밍(고시 20일) */
  const axEl = $('#r-axes');
  axEl.textContent = '';
  const axes = Array.isArray(c.axes) ? c.axes : [];
  axEl.classList.toggle('hidden', axes.length === 0);
  axes.forEach(ax => {
    const el = document.createElement('div');
    el.className = 'v-axis t-' + (ax.tone || 'warn');
    const k = document.createElement('span'); k.className = 'k'; k.textContent = ax.k;
    const m = document.createElement('span'); m.className = 'mk'; m.textContent = ax.mk;
    const v = document.createElement('span'); v.className = 'v'; v.textContent = ax.v;
    el.append(k, m, v);
    if (ax.tip) { el.title = ax.tip; el.setAttribute('aria-label', ax.k + ' ' + ax.v + ' — ' + ax.tip); }
    axEl.append(el);
  });

  /* 구간 띠 — 실제 가격 축(관측 최저 ~ 최고/정가) 위의 네 값 */
  const bd = c.band;
  $('#r-band').classList.toggle('hidden', !bd);
  if (bd) {
    const zs = $('#vb-track').querySelectorAll('.vb-z');
    const ws = [bd.z1, Math.max(0, bd.z2 - bd.z1), Math.max(0, 100 - bd.z2)];
    const nms = ['싼 편', '보통', '비싼 편'];
    zs.forEach((z, i) => { z.style.width = ws[i] + '%'; z.textContent = ws[i] >= 14 ? nms[i] : ''; });

    const pinAt = Math.min(99, Math.max(1, bd.curAt));
    const pin = $('#vb-pin');
    pin.style.left = pinAt + '%';
    pin.className = 'vb-pin';
    const caret = $('#vb-caret');
    caret.style.left = pinAt + '%';
    caret.className = 'vb-caret t-' + bd.zone;

    const pill = $('#vb-pill');
    pill.textContent = '';
    const pk = document.createElement('i'); pk.textContent = '현재';
    const pv = document.createElement('b'); pv.textContent = won(bd.cur);
    pill.append(pk, pv);
    pill.style.left = bd.curAt + '%';
    pill.className = 'vb-pill t-' + bd.zone
      + (bd.curAt < 16 ? ' at-start' : bd.curAt > 84 ? ' at-end' : '');

    /* 눈금 — 최저가 · 평소 판매가 · 정가 */
    const marks = [['최저가', bd.lo, bd.loAt, 0]];
    if (bd.org != null) marks.push(['정가', bd.org, bd.orgAt, 0]);
    marks.push(['평소 판매가', bd.med, bd.medAt, 1]);

    const ticks = $('#vb-ticks'); ticks.textContent = '';
    const foot = $('#vb-foot'); foot.textContent = '';
    marks.forEach(([nm, val, x, row]) => {
      const t = document.createElement('i');
      t.style.left = Math.min(99.5, Math.max(0.5, x)) + '%';
      ticks.append(t);
      const el = document.createElement('span');
      el.textContent = nm + ' ' + won(val);
      el.style.left = Math.min(99.5, Math.max(0.5, x)) + '%';
      el.className = 'vb-lab' + (x < 16 ? ' at-start' : x > 84 ? ' at-end' : '') + (row ? ' row2' : '');
      foot.append(el);
    });
  }
  /* 실데이터/가상 분기 및 시계열 정규화 */
  const isReal = !!c.real;
  $('#real-badge').classList.toggle('hidden', !isReal);

  /* 관측 이력은 '가격 기록' 옆 칩이 말한다 — 아래 줄은 경고가 있을 때만 (2026-09-15) */
  $('#price-tag').textContent = c.chartSub || '실측 데이터';
  const chartNote = $('#r-chart-sub');
  chartNote.textContent = c.chartNote || '';
  chartNote.classList.toggle('hidden', !c.chartNote);
  const weekLabelW = w => { const m = new Date(2025,7,4); m.setDate(m.getDate()+w*7);
    return `${String(m.getFullYear()).slice(2)}.${m.getMonth()+1}.${m.getDate()}`; };
  const pts = isReal
    ? c.chart.series.map((p,i)=>({i, label:p.label, price:p.price}))
    : c.series.map((p,i)=>({i, label:weekLabelW(p.w), price:p.price}));

  /* 통계 */
  const prices = pts.map(p=>p.price);
  const med = Math.round(quantile(prices,.5)/100)*100;
  const p10 = Math.round(quantile(prices,.1)/100)*100;
  const p90 = Math.round(quantile(prices,.9)/100)*100;
  const below = prices.filter(p=>p<=c.cur).length / prices.length;
  const pct = Math.max(1, Math.round(below*100));
  const realDc = Math.round((1 - c.cur/med)*100);
  const hasBand = !isReal && pts.length >= 13;

  /* 하드코딩 텍스트 ↔ 계산치 동기화 */
  const fill = s => s.replaceAll('{med}', won(med)).replaceAll('{p10}', p10.toLocaleString('ko-KR'))
    .replaceAll('{p90}', won(p90)).replaceAll('{pct}', pct).replaceAll('{realDc}', Math.max(0,realDc));
  $('#r-vdesc').textContent = fill(c.vdesc);

  const originalTiles = c.tiles || [
    ['현재가', won(c.cur), ''],
    [hasBand?'12개월 중앙값':'관측 중앙값', won(med), ''],
    [hasBand?'12개월 최저 구간 (p10)':'관측 최저', won(hasBand?p10:Math.min(...prices)), ''],
    ['실질 할인율', (realDc>=0?realDc:0) + '%',
      c.verdict==='good' ? 'up-good' : (c.verdict==='bad' ? 'up-bad' : '')],
  ];
  /* 할인 종료(sale_end)·정가 인상(raised) 판정은 타일이 '오르기 전 가격' 구성이라 '평소 판매가'가 없다.
     그래서 관측 61일짜리 상품도 '자료 없음 / 판정 보류'로 떴다(2026-09-22, 2,309건).
     바로 위 구간 띠가 쓰는 평소 판매가(c.band.med)로 채워 띠와 타일이 같은 값을 말하게 한다. */
  const usualTile = originalTiles.find(t=>t[0]==='평소 판매가')
    || (c.band && c.band.med ? ['평소 판매가', won(c.band.med), ''] : null)
    || (!isReal ? ['평소 판매가',won(med),''] : ['평소 판매가','자료 없음','']);
  const usualPrice = Number(String(usualTile[1]).replace(/[^0-9]/g,'')) || null;
  const tiles = [originalTiles.find(t=>t[0]==='현재가') || ['현재가',won(c.cur),''], usualTile,
    originalTiles.find(t=>t[0]==='실질 할인율') || realDcTile()];
  /* 부풀림 판정은 '표시정가 격차' 타일을 쓰느라 실질 할인율 타일이 없다. 그래서
     '판정 보류'로 떨어졌는데, 평소 판매가와 현재가가 둘 다 있으면 계산되는 값이다.
     바로 아래 공식(1 − 현재가 ÷ 평소 판매가)이 재현되도록 med 가 아니라 표시된
     평소 판매가로 계산한다. */
  function realDcTile(){
    if (!usualPrice) return ['실질 할인율','판정 보류',''];
    const r = Math.round((1 - c.cur/usualPrice)*100);
    // 지금이 평소보다 비싸면 '0%'로 뭉개지 말고 얼마나 비싼지 보여준다 (2026-09-22)
    if (r < 0) return ['평소 대비', '+' + (-r) + '%', 'up-bad'];
    return ['실질 할인율', r + '%', r > 5 ? 'up-good' : ''];
  }
  $('#r-tiles').innerHTML = tiles.map(([l,val,cls]) =>
    `<div class="tile"><div class="l">${l}</div><div class="v ${cls||''}">${val}</div></div>`).join('');

  // findings 비노출 중 — 요소가 없으면 건너뜀 (마크업 주석만 풀면 그대로 복원)
  const fndEl = $('#r-findings');
  if (fndEl) fndEl.innerHTML = c.findings.map(([ic,raw])=>{
    const txt = fill(raw);
    const col = ic==='✓' ? 'var(--good-text)' : ic==='✕' ? 'var(--critical)' : 'var(--ink)';
    return `<div class="finding"><span class="fi" style="color:${col};font-weight:800">${ic}</span><span>${txt}</span></div>`;
  }).join('');

  // 고시 기준 3층 문구 — 1층만 펼쳐두고 2·3층은 details로 접는다 (2026-08-12)
  const lg = c.legal, lgEl = $('#r-legal');
  if (lg) {
    lgEl.classList.remove('hidden');
    lgEl.innerHTML =
      `<div class="lh">${lg.head}</div>` +
      (lg.short ? `<div class="lshort">※ 관측이 20일에 못 미쳐 확보된 기간만으로 계산했습니다. 관측이 쌓이면 자동 갱신됩니다.</div>` : '') +
      `<details><summary>왜 20일인가요?</summary><div class="ld">` +
        `<p>${lg.why}</p><p>${lg.limit}</p>` +
        `<p class="len">${lg.en}</p>` +
      `</div></details>`;
  } else {
    lgEl.classList.add('hidden');
    lgEl.innerHTML = '';
  }

  $('#claims-title').textContent = c.claimsTitle || '② 성분·효능 주장 검증';
  $('#claims-tag').textContent = c.claimsTag || '자동 분석';
  $('#claims-sub').textContent = c.claimsSub || '마케팅 주장 vs 성분표·기능성 고시';
  $('#r-claims').innerHTML = c.claims.map(cl=>`
    <div class="claim">
      <div class="c-body">
        <div class="c-title">${cl.t}${cl.ing?` <a class="ing-link" href="glossary.html?q=${encodeURIComponent(cl.ing)}" target="_blank" rel="noopener" title="성분 사전에서 보기">🔎 사전</a>`:''}</div>
        <div class="c-src">출처: ${cl.s}</div>
        <div class="c-note">${cl.n}</div>
      </div>
      <span class="badge b-${cl.v}">${cl.b}</span>
    </div>`).join('');

  /* 비화장품(디바이스 등) 고시 블록 — 값이 있을 때만 표시 (화장품은 그대로) */
  const nt = $('#notice-tiles'), nsp = $('#notice-spec'), nn = $('#notice-note');
  if(c.noticeTiles && c.noticeTiles.length){
    nt.classList.remove('hidden');
    nt.innerHTML = c.noticeTiles.map(([l,val,cls]) =>
      `<div class="tile"><div class="l">${l}</div><div class="v ${cls||''}">${val}</div></div>`).join('');
  } else nt.classList.add('hidden');
  if(c.noticeSpec && c.noticeSpec.length){
    nsp.classList.remove('hidden');
    nsp.innerHTML = c.noticeSpec.map(([k,v]) =>
      `<div class="row"><div class="k2">${k}</div><div class="v2">${v}</div></div>`).join('');
  } else nsp.classList.add('hidden');
  if(c.noticeNote){ nn.classList.remove('hidden'); nn.innerHTML = c.noticeNote; }
  else nn.classList.add('hidden');

  /* ② 섹션이 통째로 비는 경우 — 빈 화면 대신 '무엇이 아직 없는지'를 적는다 (2026-07-31).
     기획세트·신규 등록 상품은 고시 수집이 다음 회차로 밀릴 수 있다. 정보가 없다는 뜻이 아니다. */
  if(!(c.claims && c.claims.length) && !(c.noticeTiles && c.noticeTiles.length)
     && !(c.noticeSpec && c.noticeSpec.length)){
    const oy = c.aff || (c.gno ? 'https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=' + c.gno : '');
    $('#r-claims').innerHTML =
      `<div class="empty-sec">
         <div class="es-b">지금 확인하려면 ${oy ? `<a href="${oy}" target="_blank" rel="noopener sponsored">올리브영 상품 페이지</a>` : '올리브영 상품 페이지'}의 「상품정보 제공고시」를 펼쳐 보세요.</div>
       </div>`;
  }

  /* 안전 주의 (성분 기반) — 프로필 있는 실데이터에만 */
  const safetyCard = $('#safety-card');
  if(c.hasProfile){
    safetyCard.classList.remove('hidden');
    const s = c.safety || {};
    const rows = [];
    if(s.pregnancy && s.pregnancy.length){
      rows.push(`<div class="safety-row warn"><div class="s-ic">🤰</div><div><b>임산부·수유부 주의</b><div class="s-list">${s.pregnancy.join(', ')} 포함</div><div class="s-note">임신·수유 중이라면 사용 전 전문가 상담을 권장합니다.</div></div></div>`);
    }
    if(s.allergen && s.allergen.length){
      rows.push(`<div class="safety-row warn"><div class="s-ic">🌸</div><div><b>알레르기 유발 가능 성분</b><div class="s-list">${s.allergen.join(', ')}</div><div class="s-note">향료·특정 착향 성분에 민감하다면 성분표를 확인하고 사용하세요.</div></div></div>`);
    }
    if(!rows.length){
      rows.push(`<div class="safety-row ok"><div class="s-ic">✓</div><div><b>특별히 주의할 성분은 검출되지 않았습니다</b><div class="s-note">임신 회피 권고·주요 착향 알레르겐 기준 스캔 결과입니다.</div></div></div>`);
    }
    if(s.official){
      rows.push(`<div class="safety-row warn"><div class="s-ic">📋</div><div><b>제조사 공식 주의사항</b><div class="s-note">${s.official}</div></div></div>`);
    }
    $('#r-safety').innerHTML = rows.join('');
  } else {
    safetyCard.classList.add('hidden');
  }

  /* 대안 옵션 (bad/warn 판정에만) + 같은 제품 더 싼 구성 */
  const altsCard = $('#alts-card');
  const hasAlts = c.alts && c.alts.length;
  const cc = c.cheaperConfig;
  /* 같은 제품 더 싼 구성 블록 (product_rollup vol_trust 검증, 대안 유무와 무관하게 노출) */
  const ccEl = $('#cheaper-config');
  if(cc){
    const upTxt = cc.unit!=null ? ` <span class="cc-unit">${won(cc.unit)}/${cc.unitType||''}</span>` : '';
    const moreTxt = cc.more>0 ? ` 외 ${cc.more}개 구성` : '';
    ccEl.classList.remove('hidden');
    ccEl.innerHTML = `
      <div class="cc-h">💡 같은 제품, 더 싼 구성이 있어요</div>
      <div class="cc-body">
        <span class="cc-type">${cc.offerType||''}</span>
        ${cc.goodsNo?`<a class="cc-name cc-open" href="/?g=${cc.goodsNo}" data-g="${cc.goodsNo}" data-aff="${cc.aff||''}">${cc.title||''} <span aria-hidden="true">›</span></a>`:`<span class="cc-name">${cc.title||''}</span>`}
        <div class="cc-price"><b>${won(cc.cur)}</b>${upTxt} · <span class="cc-save">이 구성보다 ${cc.savePct}% 저렴</span>${moreTxt}</div>
        ${cc.goodsNo?`<a class="a-link" href="${cc.aff || 'https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo='+cc.goodsNo}" target="_blank" rel="noopener sponsored">올리브영에서 보기 →</a>`:''}
      </div>`;
  } else {
    ccEl.classList.add('hidden');
  }
  if(hasAlts || cc){
    altsCard.classList.remove('hidden');
    if(hasAlts){
      $('#alts-title').textContent = c.altsTitle || '③ 검증된 대안';
      $('#alts-tag').textContent = c.altsTag || '자동 분석';
      $('#alts-sub').textContent = c.altsSub;
      const bn = $('#alts-banner');
      bn.classList.toggle('hidden', !c.altsBanner);
      if(c.altsBanner) $('#alts-banner-txt').innerHTML = c.altsBanner;
      $('#r-alts').innerHTML = c.alts.map(a=>`
        <div class="alt${a.img?' has-thumb':''}">
          ${a.img?`<div class="a-thumb"><img src="${a.img}" alt="" loading="lazy" onerror="this.parentNode.remove()"></div>`:''}
          <div class="a-why">${a.why}</div>
          <div class="a-brand">${a.brand}</div>
          <div class="a-name">${a.name}</div>
          <div class="a-price"><b>${won(a.price)}</b>${a.was?`<s>${won(a.was)}</s>`:''}</div>
          <div class="a-verdict"><span class="badge b-${a.v}">${a.v==='good'?'✓ ':''}${a.chip}</span></div>
          <div class="a-basis">${a.basis}</div>
          ${a.gno?`<a class="a-link" href="${a.aff || 'https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo='+a.gno}" target="_blank" rel="noopener sponsored">올리브영에서 보기 →</a>`:''}
        </div>`).join('');
    } else {
      $('#alts-title').textContent = '③ 같은 제품 더 싼 구성';
      $('#alts-tag').textContent = '실측 데이터 자동 산출';
      $('#alts-sub').textContent = '';
      $('#alts-banner').classList.add('hidden');
      $('#r-alts').innerHTML = '';
    }
    $('#basis-title').textContent = '④ 판정 근거';
  } else {
    altsCard.classList.add('hidden');
    $('#basis-title').textContent = '③ 판정 근거';
  }

  const obsDays = pts.length>=52 ? 365 : 41;
  $('#r-basis').innerHTML = (c.basis || [
    ['가격 관측', `일 2회 (오전·저녁) 자동 수집 · 최근 ${obsDays}일 / 약 ${obsDays*2}회 관측`],
    ['판정 기준', hasBand ? '12개월 p10–p90 통상 구간 + 중앙값 대비 실질 할인율 (베이스라인 게이트 적용)' : '관측 90일 미만 시 표시정가 진위 판정 보류 (보수적 원칙)'],
    ['주장 대조 출처', '식약처 기능성화장품 고시 · 전성분표(함량순 고시 기준)'],
    ['판정서 고정', '발급 시점 데이터로 고정 · 재조회 시 새 번호로 신규 발급'],
  ]).map(([k,val])=>`<div class="row"><span class="k2">${k}</span><span>${val}</span></div>`).join('');

  $('#lg-band').style.display = hasBand ? '' : 'none';
  const cfg = isReal
    ? {pts, cur:c.cur, verdict:c.verdict, normal:c.chart.normal, normalNote:c.chart.normalNote,
       band:null, median:usualPrice, note:null}
    : {pts, cur:c.cur, verdict:c.verdict, normal:c.normal,
       normalNote:`표시정가 ${c.normal.toLocaleString('ko-KR')}원${c.verdict==='bad' ? ' · 판매 실적 0일' : ''}`,
       band: hasBand?{p10,p90}:null, median:usualPrice,
       note: hasBand?null:'관측 41일 — 통상 구간(밴드) 산출 기준(90일) 미달'};
  $('#lg-usual').style.display = usualPrice == null ? 'none' : '';
  drawChart(cfg);
  show('report');
}

/* ---------- 차트 (SVG, 임의 시계열) ---------- */
function drawChart(cfg){
  const W=720, H=250, L=58, R=14, T=18, B=30;
  const iw = W-L-R, ih = H-T-B;
  const pts = cfg.pts, n = pts.length;
  const allVals = pts.map(p=>p.price).concat([cfg.normal,cfg.median].filter(v=>v!=null));
  let yMin = Math.min(...allVals), yMax = Math.max(...allVals);
  const padY = Math.max((yMax-yMin)*0.12, yMax*0.03); yMin=Math.max(0,yMin-padY); yMax+=padY;
  const x = i => n>1 ? L + (i/(n-1))*iw : L + iw/2;
  const y = p => T + ih - ((p-yMin)/(yMax-yMin))*ih;

  /* y 눈금: 깔끔한 단위 */
  const span = yMax-yMin;
  const step = span > 15000 ? 5000 : span > 6000 ? 2000 : 1000;
  let ticks=[]; for(let t=Math.ceil(yMin/step)*step; t<=yMax; t+=step) ticks.push(t);

  /* x 눈금: 최대 7개, 라벨 중복 제거 */
  const nTicks = Math.min(7, n);
  const idxs = [...new Set(Array.from({length:nTicks}, (_,k)=>Math.round(k*(n-1)/Math.max(1,nTicks-1))))];
  let lastLab = null;
  const xticks = idxs.map(i=>{
    const lab = pts[i].label.split('·')[0];
    if(lab===lastLab) return null; lastLab=lab; return [i,lab];
  }).filter(Boolean);

  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="가격 이력 차트">`;
  ticks.forEach(t=>{
    s += `<line x1="${L}" x2="${W-R}" y1="${y(t)}" y2="${y(t)}" stroke="var(--grid)" stroke-width="1"/>`;
    s += `<text x="${L-8}" y="${y(t)+4}" text-anchor="end" font-size="10.5" fill="var(--muted)" style="font-variant-numeric:tabular-nums">${t.toLocaleString('ko-KR')}</text>`;
  });
  xticks.forEach(([i,lab])=>{
    s += `<text x="${x(i)}" y="${H-8}" text-anchor="middle" font-size="10.5" fill="var(--muted)">${lab}</text>`;
  });
  /* 통상 구간 밴드 / 미달 노트 */
  if(cfg.band){
    s += `<rect x="${L}" y="${y(cfg.band.p90)}" width="${iw}" height="${y(cfg.band.p10)-y(cfg.band.p90)}" rx="4" fill="var(--series-wash)"/>`;
  }
  if(cfg.median != null){
    s += `<line x1="${L}" x2="${W-R}" y1="${y(cfg.median)}" y2="${y(cfg.median)}" stroke="var(--usual-price)" stroke-width="2" stroke-dasharray="1 7" stroke-linecap="round"/>`;
    s += `<text x="${W-R}" text-anchor="end" y="${y(cfg.median)+15}" font-size="11" fill="var(--usual-price)">평소 판매가 ${cfg.median.toLocaleString('ko-KR')}원</text>`;
  }
  if(cfg.note){
    s += `<text x="${L+iw*0.38}" y="${T+ih*0.45}" text-anchor="middle" font-size="12" fill="var(--muted)">${cfg.note}</text>`;
  }
  /* 표시정가 기준선 */
  s += `<line x1="${L}" x2="${W-R}" y1="${y(cfg.normal)}" y2="${y(cfg.normal)}" stroke="var(--list-price)" stroke-width="1.5" stroke-dasharray="9 7" stroke-dashoffset="-3"/>`;
  s += `<text x="${L+4}" y="${y(cfg.normal)-6}" font-size="11" fill="var(--list-price)" font-weight="600">${cfg.normalNote}</text>`;
  /* 가격 라인 */
  const d = pts.map((p,i)=>(i?'L':'M')+x(i).toFixed(1)+' '+y(p.price).toFixed(1)).join(' ');
  s += `<path d="${d}" fill="none" stroke="var(--series)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
  /* 관측점 마커 (짧은 시계열일 때만) */
  if(n <= 25){
    pts.forEach((p,i)=>{
      s += `<circle cx="${x(i)}" cy="${y(p.price)}" r="3.5" fill="var(--series)" stroke="var(--surface)" stroke-width="2"/>`;
    });
  }
  /* 현재가 마커 (서피스 링) */
  const lastP = pts[n-1];
  s += `<circle cx="${x(n-1)}" cy="${y(lastP.price)}" r="5" fill="var(--series)" stroke="var(--surface)" stroke-width="2"/>`;
  s += `<text x="${x(n-1)-12}" y="${y(lastP.price)+(cfg.verdict==='good'?20:-14)}" text-anchor="end" font-size="11.5" font-weight="700" fill="var(--ink)">현재 ${lastP.price.toLocaleString('ko-KR')}원</text>`;
  /* 호버 레이어 */
  s += `<line id="xhair" x1="0" x2="0" y1="${T}" y2="${T+ih}" stroke="var(--baseline)" stroke-width="1" style="display:none"/>`;
  s += `<circle id="hoverdot" r="4.5" fill="var(--series)" stroke="var(--surface)" stroke-width="2" style="display:none"/>`;
  s += `<rect x="${L}" y="${T}" width="${iw}" height="${ih}" fill="transparent" id="hover-rect"/>`;
  s += `</svg>`;
  $('#chart').innerHTML = s;

  /* 크로스헤어 + 툴팁 */
  const svg = $('#chart svg'), tt = $('#tooltip');
  const hr = svg.querySelector('#hover-rect'), xh = svg.querySelector('#xhair'), hd = svg.querySelector('#hoverdot');
  hr.addEventListener('mousemove', ev=>{
    const box = svg.getBoundingClientRect();
    const sx = (ev.clientX-box.left) * (W/box.width);
    let bi=0, bd=1e9;
    pts.forEach((p,i)=>{const dd=Math.abs(x(i)-sx); if(dd<bd){bd=dd;bi=i;}});
    const px=x(bi), py=y(pts[bi].price);
    xh.setAttribute('x1',px); xh.setAttribute('x2',px); xh.style.display='block';
    hd.setAttribute('cx',px); hd.setAttribute('cy',py); hd.style.display='block';
    tt.style.display='block';
    tt.style.left=(px/W*100)+'%';
    tt.style.top=(py/H*100)+'%';
    tt.innerHTML = `${pts[bi].label} · <b>${won(pts[bi].price)}</b>`;
  });
  hr.addEventListener('mouseleave', ()=>{ tt.style.display='none'; xh.style.display='none'; hd.style.display='none'; });
}

/* ---------- 이벤트 ---------- */
function caseFromUrl(u){
  let h=0; for(const ch of u) h=(h*31+ch.charCodeAt(0))|0;
  return ['a','b','c'][Math.abs(h)%3];
}
/* 파일을 직접 열었을 때(file://) fetch가 막히는 경우의 오프라인 샘플 폴백 */

/* 로딩 애니메이션만 (renderReport는 외부에서 호출) */
function runLoadingThen(cb){
  if(window.__KHUB_FAST){ window.__KHUB_FAST = false; cb(); return; }
  show('loading');
  const steps = document.querySelectorAll('#view-loading .step');
  steps.forEach(s => s.classList.remove('on','now'));
  let i = 0;
  const tick = () => {
    if(i>0){ steps[i-1].classList.add('on'); steps[i-1].classList.remove('now'); }
    if(i < steps.length){ steps[i].classList.add('now'); i++; setTimeout(tick, 300); }
    else setTimeout(cb, 250);
  };
  tick();
}

/* ---------- 상품명 검색 (URL 아닌 입력) ---------- */
let SEARCH_INDEX = null;
async function loadIndex(){
  if(SEARCH_INDEX) return SEARCH_INDEX;
  try{ const r = await fetch('verdicts/index.json', {cache:'no-store'});
       if(r.ok){ SEARCH_INDEX = (await r.json()).items || {}; } }
  catch(e){ SEARCH_INDEX = {}; }
  return SEARCH_INDEX || {};
}
async function searchProducts(q){
  return window.HomeDiscovery.search(q);
}

function loadGoods(gno){
  $('#search-results').classList.remove('on');   // 결과 목록은 지우지 않고 숨긴다 — 뒤로 오면 다시 보인다
  judgeUrl('https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=' + gno, {push:true});
}

async function judgeUrl(u, opt={}){
  /* 상품번호는 A(화장품)·B(비화장품·디바이스 등) 두 접두사가 모두 쓰인다.
     A만 받으면 B상품 판정서 512건이 통째로 열리지 않는다 — 티저·가격표·검색 전부
     ?g=B... 로 들어오는데 여기서 걸러져 '추적 목록에 없는 상품'으로 오인됐다. (2026-08-11) */
  const m = u.match(/[AB]\d{12}/);
  if(!m){ searchProducts(u); return; }   // URL이 아니면 상품명 검색으로
  const gno = m[0];
  runLoadingThen(async ()=>{
    try{
      const res = await fetch('verdicts/' + gno + '.json', {cache:'no-store'});
      if(res.ok){
        const j = await res.json();
        if(!j.gno) j.gno = gno;   // 구버전 판정서 JSON 호환 — 상품 링크가 끊기지 않게
        CASES['_fetched'] = j; renderReport('_fetched');
        /* 메인 검색에서 연 판정서 — 방문 기록을 남겨 폰 뒤로가기가 검색 화면으로 오게 한다 (2026-09-22) */
        if(opt.push){
          cameFrom = opt.from || 'search';
          history.pushState({v:'report', g:gno, from:cameFrom}, '', '?g=' + gno);
        }
        setBackLabel();
        return;
      }
      // 200이 아니면(404 등) 추적 목록에 없는 상품
      show('home');
      toast(`${gno} — 아직 추적 목록에 없는 상품이에요. 추적 목록은 매일 넓어집니다.`);
      return;
    }catch(e){ /* file:// 로 직접 열어 fetch 자체가 막힌 경우 */ }
    show('home');
    toast('파일을 직접 열면 조회가 제한돼요 — 배포된 사이트(http)에서 상품 URL을 넣어보세요.');
  });
}

$('#go-btn').addEventListener('click', ()=>{
  const inp = $('#url-input'), u = inp.value.trim();
  if(!u){ inp.classList.add('err'); setTimeout(()=>inp.classList.remove('err'),400); inp.focus(); return; }
  judgeUrl(u, {push:true});
});
$('#url-input').addEventListener('keydown', e=>{ if(e.key==='Enter') $('#go-btn').click(); });
$('#search-results').addEventListener('click', e=>{ const b=e.target.closest('.sr-item'); if(b) loadGoods(b.dataset.g); });

const fullReportRenderer=renderReport;
renderReport=function(key){
 const oldBasis=document.getElementById('r-basis');const oldFold=oldBasis?.closest('.basis-fold');if(oldFold){oldFold.before(oldBasis);oldFold.remove();}
 document.querySelectorAll('.basis-observed,#r-verdict .compact-note').forEach(el=>el.remove());
 fullReportRenderer(key);
 document.querySelectorAll('#r-safety .safety-row').forEach(row=>{const title=row.querySelector('b');if(title?.textContent!=='제조사 공식 주의사항')return;const detail=document.createElement('details');detail.className='fine official-caution';const summary=document.createElement('summary');summary.textContent='제조사 공식 주의사항';const body=row.querySelector('.s-note');detail.append(summary,body);row.replaceWith(detail);});

 const title=document.getElementById('r-vtitle');if(title.textContent.includes(' — ')){title.textContent=title.textContent.split(' — ')[0];}
 const claims=document.getElementById('r-claims');
 if(claims.querySelector('.claim')){
 document.getElementById('claims-title').textContent='성분으로 보는 특징';
 document.getElementById('claims-sub').textContent='함량순 성분표를 참고한 설명이에요. 실제 함량과 제품의 효능·안전을 단정하지 않아요.';
 claims.querySelectorAll('.claim').forEach(row=>{if(!row.querySelector('.b-good'))return;const d=document.createElement('details');d.className='claim-fold';const summary=document.createElement('summary');const link=row.querySelector('.ing-link');if(link)link.remove();summary.append(row.querySelector('.c-title'),row.querySelector('.badge'));d.append(summary,row.querySelector('.c-note'),row.querySelector('.c-src'));if(link)d.append(link);row.replaceWith(d);});
 }
 const basis=document.getElementById('r-basis');const fold=document.createElement('details');fold.className='basis-fold';const summary=document.createElement('summary');summary.textContent='판정 기준과 출처 자세히 보기';basis.before(fold);fold.append(summary,basis);const observation=basis.querySelector('.row');if(observation){const line=document.createElement('p');line.className='basis-observed';line.textContent=Array.from(observation.children).map(x=>x.textContent).join(' · ');fold.before(line);}
 document.getElementById('basis-title').textContent='이 판정의 근거';
};

/* ?g=goodsNo 파라미터로 판정서 바로 열기 (가격 데이터 페이지 카드 → 판정서 동선) */
/* from=device|price → '다른 상품 판정하기'를 눌렀을 때 왔던 목록으로 돌려보낸다 (2026-07-31) */
const ORIGIN_PAGES = {device:'device.html', price:'price.html', routine:'routine.html'};
let backTo = null;
/* 판정서에 들어온 경로 (2026-09-22): 'search' 메인 검색 · 'origin' 다른 탭(backTo) · 'direct' 공유 링크 */
let cameFrom = 'direct';
const ORIGIN_LABEL = {'device.html':'← 디바이스 목록으로', 'price.html':'← 가격 확인으로', 'routine.html':'← 루틴 가이드로'};
function setBackLabel(){
  const b = $('#back-btn');
  if(cameFrom === 'search') b.textContent = '← 검색으로';
  else if(cameFrom === 'related') b.textContent = '← 이전 판정서로';
  else if(backTo) b.textContent = ORIGIN_LABEL[backTo.split('?')[0]] || '← 이전 화면으로';
  else b.textContent = '← 메인으로';
}
function focusSearch(){
  const inp = $('#url-input');
  window.scrollTo({top:0});
  setTimeout(()=>inp.focus({preventScroll:true}), 30);
}
function goHome(clear){
  if(window.__KHUB_G){ location.href = '/'; return; }
  if(clear) $('#url-input').value = '';
  show('home');
  const box = $('#search-results');
  if(box.innerHTML.trim()) box.classList.add('on');
  if(location.search) history.replaceState(null, '', location.pathname);
}
{
  const q = new URLSearchParams(location.search);
  const qg = q.get('g') || window.__KHUB_G;
  backTo = ORIGIN_PAGES[q.get('from')] || null;
  cameFrom = backTo ? 'origin' : 'direct';
  if(backTo){
    /* 가격 데이터에서 판정·카테고리 필터를 켠 채로 들어왔으면 그 화면 그대로 돌려보낸다 */
    if(backTo === 'price.html'){
      const p = new URLSearchParams();
      if(q.get('fcat')) p.set('cat', q.get('fcat'));
      if(q.get('fv'))   p.set('v',   q.get('fv'));
      if(q.get('ff'))   p.set('f',   q.get('ff'));
      if([...p].length) backTo += '?' + p.toString();
    }
  }
  if(qg && /^[AB]\d{12}$/.test(qg)){
    history.replaceState({v:'report', g:qg, from:cameFrom}, '', location.href);
    judgeUrl('https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=' + qg);
  }
  /* 다른 탭의 헤더 검색 버튼(/?focus=search)으로 들어온 경우 */
  else if(q.get('focus') === 'search'){ history.replaceState(null, '', location.pathname); focusSearch(); }
  setBackLabel();
}
// Home is search-only; the product index is loaded when a search is requested.
$('#back-btn').addEventListener('click', ()=>{
  // 메인 검색에서 왔으면 브라우저 뒤로가기와 똑같이 — 검색어·결과 목록이 그대로 남은 검색 화면
  if((cameFrom === 'search' || cameFrom === 'related') && history.state && history.state.v === 'report'){ history.back(); return; }
  if(cameFrom === 'origin' && backTo){ location.href = backTo; return; }   // 가격 확인·디바이스·루틴에서 왔으면 그 목록으로
  goHome(true);                                                              // 공유 링크로 바로 들어온 경우 → 메인
  cameFrom = 'direct'; setBackLabel();
});
/* 폰·브라우저 뒤로/앞으로 (2026-09-22) */
let focusAfterPop = false;
window.addEventListener('popstate', e=>{
  const st = e.state;
  if(st && st.v === 'report' && st.g){
    cameFrom = st.from || 'search';
    judgeUrl('https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=' + st.g);
    return;
  }
  goHome(false);
  if(focusAfterPop){ focusAfterPop = false; focusSearch(); }
});
/* '같은 제품, 더 싼 구성' 제품명 → 그 구성의 판정서 (2026-09-22). 판정서가 없는 구성은 올리브영으로 */
document.getElementById('cheaper-config')?.addEventListener('click', async e=>{
  const a = e.target.closest('a.cc-open'); if(!a) return;
  e.preventDefault();
  const g = a.dataset.g;
  let ok = false;
  try{ ok = (await fetch('verdicts/' + g + '.json', {method:'HEAD', cache:'no-store'})).ok; }catch(_){}
  if(ok) judgeUrl('https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=' + g, {push:true, from:'related'});
  else window.open(a.dataset.aff || ('https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=' + g), '_blank', 'noopener');
});
/* 헤더 검색 버튼 — 이 페이지에선 이동 없이 검색 화면으로 */
document.querySelector('.site-search')?.addEventListener('click', e=>{
  e.preventDefault();
  const onReport = !$('#view-report').classList.contains('hidden');
  if(onReport && cameFrom === 'search' && history.state && history.state.v === 'report'){
    focusAfterPop = true; history.back(); return;
  }
  goHome(onReport);
  if(onReport){ cameFrom = 'direct'; setBackLabel(); }
  focusSearch();
});
$('#copy-btn').addEventListener('click', ()=>{
  const url = location.href;
  (navigator.clipboard?.writeText(url) || Promise.reject())
    .then(()=>toast('판정서 링크가 복사되었습니다'))
    .catch(()=>toast(url));
});
/* ---------- 이의제기 (실제 접수: mailto) ---------- */
const DISPUTE_EMAIL = 'themaric.official@gmail.com';   // 이의제기 접수 이메일
$('#dispute-addr').textContent = DISPUTE_EMAIL;
function openDispute(){
  const id = ($('#r-id')?.textContent || '').trim() || '(번호 없음)';
  const brand = ($('#r-brand')?.textContent || '').trim();
  const name = ($('#r-name')?.textContent || '').trim();
  const vtitle = ($('#r-vtitle')?.textContent || '').trim();
  const ctx = `${brand} ${name}\n판정서 ${id} · ${vtitle}\n${location.href}`;
  $('#dispute-ctx').textContent = ctx;
  const subject = `[더마릭 이의제기] ${id} ${brand} ${name}`.slice(0,120);
  const body =
`■ 재검토 대상\n${ctx}\n\n■ 어떤 점이 사실과 다른가요?\n(여기에 작성)\n\n■ 근거 (가격 캡처, 공식 자료 링크 등)\n(여기에 첨부/링크)\n\n■ 회신받을 연락처\n(이메일 또는 담당자)\n`;
  $('#dispute-mail').href = `mailto:${DISPUTE_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  $('#dispute-modal').style.display = 'flex';
}
$('#object-btn').addEventListener('click', openDispute);
$('#foot-dispute')?.addEventListener('click', e=>{ e.preventDefault(); openDispute(); });
$('#dispute-close').addEventListener('click', ()=>{ $('#dispute-modal').style.display='none'; });
$('#dispute-modal').addEventListener('click', e=>{ if(e.target.id==='dispute-modal') $('#dispute-modal').style.display='none'; });
$('#kakao-btn').addEventListener('click', ()=>{ window.open('https://open.kakao.com/o/gFGEOZIi', '_blank', 'noopener,noreferrer'); });
// dev-teaser 비노출 중 — 요소가 없을 수 있어 옵셔널 처리 (복원 시 그대로 동작)
$('#api-link')?.addEventListener('click', e=>{ e.preventDefault(); toast('개발자용 API는 준비 중이에요'); });
