/* 더마릭 수집 — oracle/analytics.py 생성물. 직접 편집하지 말 것. */
(function(){
  var GID = "G-QRFPEG5845";
  var s = document.createElement('script');
  s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GID;
  document.head.appendChild(s);

  window.dataLayer = window.dataLayer || [];
  function gtag(){ dataLayer.push(arguments); }
  window.gtag = gtag;
  gtag('js', new Date());
  // 광고 개인화는 쓰지 않는다 — 트래픽 분석 목적만
  gtag('consent', 'default', {
    ad_storage: 'denied', ad_user_data: 'denied',
    ad_personalization: 'denied', analytics_storage: 'granted'
  });
  gtag('config', GID);

  // ---- 아웃바운드 클릭 (기본 수집으로는 안 잡히는 것) ----
  document.addEventListener('click', function(e){
    var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!a) return;
    var h = a.href || '', d = a.dataset || {}, page = location.pathname;
    if (/oy\.run|oliveyoung\.co\.kr/.test(h)) {
      gtag('event', 'affiliate_click', {
        goods_no: d.gno || '', brand: d.brand || '',
        slot: d.slot || '', page_path: page });
    } else if (/open\.kakao\.com/.test(h)) {
      gtag('event', 'kakao_join', { cta: d.cta || 'inline', page_path: page });
    } else if (d.cta) {
      gtag('event', 'site_nav', { cta: d.cta, page_path: page });
    }
  }, true);

  // ---- 스크롤 깊이 (체류·이탈 보조) ----
  (function(){
    var hit = {}, marks = [25, 50, 75, 100];
    function chk(){
      var d = document.documentElement, b = document.body;
      var sh = Math.max(d.scrollHeight, b.scrollHeight) - window.innerHeight;
      if (sh <= 0) return;
      var p = (window.scrollY / sh) * 100;
      marks.forEach(function(m){
        if (p >= m && !hit[m]) {
          hit[m] = 1;
          gtag('event', 'scroll_depth', { percent: m, page_path: location.pathname });
        }
      });
    }
    window.addEventListener('scroll', chk, { passive: true });
    chk();
  })();
})();
