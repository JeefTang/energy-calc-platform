/* 流体机械节能测算官网 · 匿名埋点（2026-11-15）
 * 设计原则：
 *  1) 失败静默——统计挂了绝不影响测算功能
 *  2) 不收集个人信息，只记 事件/模块/页面/来源ref/屏宽/设备类型
 *  3) 端点 = 内置默认 + analytics-config.json 异步覆盖（换隧道只推小文件）
 *  4) 归因核心：URL 上的 ?ref=xxx 全程带到每个事件
 */
(function () {
  'use strict';
  var DEFAULT_EP = 'https://rank-author-bolt-consultant.trycloudflare.com';
  var CFG = (document.currentScript && document.currentScript.getAttribute('data-cfg')) || 'analytics-config.json';

  var cached = '';
  try { cached = sessionStorage.getItem('ec_ep') || ''; } catch (e) {}
  var EP = window.ECALC_ENDPOINT || cached || DEFAULT_EP;

  function setEp(u) {
    if (!u) return;
    EP = u; window.ECALC_ENDPOINT = u; window.EVENT_ENDPOINT = u;
    try { sessionStorage.setItem('ec_ep', u); } catch (e) {}
  }
  setEp(EP);

  /* 异步刷新端点（不阻塞渲染） */
  try {
    fetch(CFG, { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (c) {
      if (c && c.endpoint) setEp(c.endpoint);
    }).catch(function () {});
  } catch (e) {}

  function getRef() {
    try { return new URLSearchParams(location.search).get('ref') || ''; } catch (e) { return ''; }
  }

  function send(ev, data) {
    var p = { event: ev, page: location.pathname + location.search, ref: getRef(), w: window.innerWidth || 0 };
    if (data) for (var k in data) if (Object.prototype.hasOwnProperty.call(data, k)) p[k] = data[k];
    var body = JSON.stringify(p);
    var url = (window.ECALC_ENDPOINT || EP) + '/api/event';
    /* 主通道 fetch(keepalive)：可靠性高、可观测；sendBeacon 仅作兜底
       （实测：部分环境 sendBeacon 返回 true 但请求并不发出，不能当主通道）*/
    try {
      fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body, keepalive: true, mode: 'cors' }).catch(function () { beacon(url, body); });
      return;
    } catch (e) {}
    beacon(url, body);
  }

  function beacon(url, body) {
    try {
      if (navigator.sendBeacon) navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }));
    } catch (e) {}
  }
  window.ecTrack = send;

  /* 首屏 pageview：等 config 解析完再发，避免打到已失效的旧隧道
     （2026-11-15 实测坑：立即发会走写死的 DEFAULT_EP，旧隧道一停就全丢）*/
  var _sent = false;
  function firstView() {
    if (_sent) return;
    _sent = true;
    send('pageview');
  }
  var _t = setTimeout(firstView, 1500);
  try {
    fetch(CFG, { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (c) {
      if (c && c.endpoint) setEp(c.endpoint);
      clearTimeout(_t); firstView();
    }).catch(function () { clearTimeout(_t); firstView(); });
  } catch (e) { firstView(); }

  /* ---- 2. 模块使用：包装全局 showTab ---- */
  function hookTabs() {
    var orig = window.showTab;
    if (typeof orig !== 'function' || orig.__ecTracked) return false;
    window.showTab = function (tab, grp, variant, label) {
      try {
        var key = label || (tab && (tab.id || '').replace(/-tab$/, '')) || '';
        if (key) send('module_use', { module: String(key).slice(0, 40) });
      } catch (e) {}
      return orig.apply(this, arguments);
    };
    window.showTab.__ecTracked = true;
    return true;
  }

  /* ---- 3. 在线咨询 ---- */
  function hookChat() {
    var orig = window.ecChatOpen;
    if (typeof orig !== 'function' || orig.__ecTracked) return false;
    window.ecChatOpen = function () {
      try { send('chat_open'); } catch (e) {}
      return orig.apply(this, arguments);
    };
    window.ecChatOpen.__ecTracked = true;
    return true;
  }

  /* ---- 4. 联系方式 / 二维码 / 案例点击（事件委托） ---- */
  document.addEventListener('click', function (e) {
    var t = e.target;
    while (t && t !== document.body) {
      var href = t.getAttribute && t.getAttribute('href') || '';
      var cls = (t.className && String(t.className)) || '';
      if (/\btel:/.test(href) || /qr|kefu|wechat|contact-btn/i.test(cls + t.id)) {
        send('qr_click'); return;
      }
      if (/case\.html|案例|case-/i.test(href + cls + t.id)) {
        send('case_view', { module: (t.textContent || '').trim().slice(0, 40) }); return;
      }
      if (t.classList && t.classList.contains('chat-launcher')) { send('chat_open'); return; }
      t = t.parentNode;
    }
  }, true);

  /* ---- 5. 报告生成：兼容旧的 inline beacon（其端点已改指向本服务） ---- */

  /* ---- 启动挂载（chat.js 是 defer，需等它先就位） ---- */
  function boot() {
    hookTabs();
    hookChat();
    var n = 0;
    var timer = setInterval(function () {
      hookTabs(); hookChat();
      if ((window.ecChatOpen && window.ecChatOpen.__ecTracked) && (window.showTab && window.showTab.__ecTracked)) clearInterval(timer);
      if (++n > 40) clearInterval(timer);   // 最多轮询 20s
    }, 500);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
