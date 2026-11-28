/* 더마릭 — 판정서 링크(/?g=상품번호)를 상품 페이지(/p/상품번호/)로. oracle/link_product_pages.py 생성물 */
(function(){
  var set = null;
  function fix(a){
    var h = a.getAttribute('href');
    if(!h || h.indexOf('g=') < 0) return;
    var u; try { u = new URL(h, location.href); } catch(e){ return; }
    if(u.hostname !== location.hostname && u.hostname !== 'themaric.kr') return;
    if(u.pathname !== '/' && !/\/index\.html$/.test(u.pathname)) return;
    var g = u.searchParams.get('g');
    if(!g || !set[g]) return;
    u.searchParams.delete('g');
    var rest = u.searchParams.toString();
    a.setAttribute('href', '/p/' + g + '/' + (rest ? '?' + rest : ''));
  }
  function scan(root){
    if(root.nodeType !== 1) return;
    if(root.matches && root.matches('a[href*="g="]')) fix(root);
    root.querySelectorAll && root.querySelectorAll('a[href*="g="]').forEach(fix);
  }
  fetch('/p/_app/pages.json').then(function(r){ return r.json(); }).then(function(list){
    set = {}; list.forEach(function(g){ set[g] = 1; });
    scan(document.body);
    new MutationObserver(function(ms){
      ms.forEach(function(m){
        if(m.type === 'attributes') fix(m.target);
        else m.addedNodes.forEach(scan);
      });
    }).observe(document.body, {childList:true, subtree:true, attributes:true, attributeFilter:['href']});
  }).catch(function(){});
})();
