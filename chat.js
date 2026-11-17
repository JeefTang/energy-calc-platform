/* 流体机械节能测算工具 · 在线咨询组件
   第 1 层：本地知识库（内容全部取自本站已公开口径，秒回、不联网）
   第 2 层：LLM 接力（chat-config.json 里的 endpoint）
   第 3 层：转人工（留言落库 + 微信提醒，工程师在后台回复，长轮询取回） */
(function () {
  "use strict";
  var ZH = (document.documentElement.lang || "zh").toLowerCase().indexOf("zh") === 0;
  var T = ZH ? {
    btn: "在线咨询",
    title: "节能测算 · 在线咨询",
    sub: "工程师在线 · 通常 1 个工作日内回复",
    ph: "说说你的设备：流量、扬程或压力、介质、年运行小时…",
    note: "自动应答仅供参考，正式选型与节能量以现场复核为准",
    greet: "你好，我是流体机械节能测算工具的咨询助手。\n可以帮你：选测算模块、看懂节电率、判断柱塞泵还是离心泵、估算年节电量，或者转工程师出改造方案。\n最快的方式是直接说工况：流量、扬程或压力、介质、温度、年运行小时、电价。",
    chips: ["这个工具怎么用？", "节电率为什么偏低？", "柱塞泵替换离心泵", "要一份改造方案"],
    human: "转工程师",
    escTitle: "留个联系方式，工程师 1 个工作日内联系你",
    escName: "称呼 / 公司（选填）",
    escMail: "电话或邮箱（必填）",
    escBtn: "提交",
    escOk: "已收到，工程师会尽快联系你。急事可直接打 18041136555（微信同号）。",
    escFail: "提交失败，请直接联系 零碳小助手 18041136555（微信同号）",
    escAlt: "或直接联系：",
    typing: "正在输入",
    errNet: "网络不可用，先用本地知识库回答。",
    waitHuman: "已转给工程师。你继续在这里留言即可，工程师的回复会显示在这个窗口。",
    handoff: "已通知工程师，请稍等。",
    humanTag: "工程师",
    aiPaused: "工程师已收到你的留言，稍后在这里回复。"
  } : {
    btn: "Live chat",
    title: "Energy audit chat",
    sub: "Engineers online · reply within one working day",
    ph: "Flow, head or pressure, fluid, annual hours…",
    note: "Automated answers are indicative — site verification governs the final figure",
    greet: "Hello — I answer questions about this fluid-machinery energy calculation tool.\nI can point you to the right module, explain the saving rate, compare plunger vs centrifugal pumps, or pass you to an engineer.",
    chips: ["How to use it", "Why is the saving low", "Plunger vs centrifugal", "Request a proposal"],
    human: "Talk to an engineer",
    escTitle: "Leave a contact — an engineer replies within one working day",
    escName: "Name / company (optional)",
    escMail: "Phone or email (required)",
    escBtn: "Send",
    escOk: "Received. An engineer will contact you shortly. Phone/WeChat +86 180 4113 6555.",
    escFail: "Failed — please contact +86 180 4113 6555 (WeChat same number).",
    escAlt: "Or contact: ",
    typing: "typing",
    errNet: "Network unavailable — answering from the local knowledge base.",
    waitHuman: "Passed to an engineer. Keep writing here — the reply appears in this window.",
    handoff: "Engineer notified, one moment.",
    humanTag: "Engineer",
    aiPaused: "The engineer has your message and will reply here shortly."
  };

  var PHONE = "18041136555";
  var EMAIL = "419480861@qq.com";

  /* ---------- 本地知识库：全部为本站已公开口径，勿加未验证数字 ---------- */
  var KB = [
    { id: "what", k: ["这是什么", "怎么用", "使用", "工具", "免费", "注册", "安装", "what is", "how to use", "free"],
      zh: "这是网页版的流体机械节能测算工具：免安装、免注册、免费。\n用法三步：① 选页签（柱塞泵/水泵/渣浆泵/风机/磨机/空压机/余热回收/永磁电机/健康评测）② 填现场参数 ③ 点测算，得到节电率、年节电量、年节电费、CO₂ 减排量和电机选型建议。\n数据只在你的浏览器里算，不上传。",
      en: "A browser-based energy calculation tool for fluid machinery: no install, no registration, free.\nPick a tab, enter site parameters, run it — you get saving rate, annual kWh, annual cost, CO2 and a motor selection.\nNumbers are calculated in your browser; nothing is uploaded." },

    { id: "modules", k: ["模块", "哪些", "功能", "页签", "测算什么", "modules", "tabs"],
      zh: "共 9 个模块：柱塞泵、水泵、渣浆泵、风机、磨机、空压机、余热回收、永磁电机替换、设备运行健康评测。\n前 7 个算节能量和电费；永磁电机替换算替换前后的功率差和投资回收；健康评测按机械/电气/能效打分，指出该先修哪里。",
      en: "Nine modules: plunger pump, water pump, slurry pump, fan, mill, air compressor, waste-heat recovery, PM-motor retrofit, equipment health assessment." },

    { id: "formula", k: ["公式", "轴功率", "怎么算", "计算原理", "formula", "shaft power"],
      zh: "核心是轴功率法：\n水泵：P = ρgQH/(3.6×10⁶×η)，常写成 (Q×H×1000×9.81)/(3600×1000×η)\n柱塞泵/泵类：P = Q×ΔP/(3.6×η)\n风机：P = (Q×p)/(3600×1000×η风×η传)\n再乘年运行小时得年耗电，对比改造后的功率差就是年节电量。",
      en: "Shaft-power method: pump P = rho*g*Q*H/(3.6e6*eta); fan P = Q*p/(3600*1000*eta_fan*eta_drive). Annual hours turn power into kWh." },

    { id: "plunger", k: ["柱塞泵", "离心泵", "替代", "plunger", "centrifugal"],
      zh: "柱塞泵（往复式）在高压小流量工况效率通常 85–92%，且高效区宽；多级离心泵在偏离设计点时效率掉得快。\n典型可替换场景：锅炉给水、矿井排水、油田注水、高压除鳞、压滤机喂料。实测改造案例节电 19–27%。\n你把流量和压力给我，我判断值不值得改；要出方案就让工程师看铭牌和现场管路。",
      en: "Plunger pumps hold 85–92% efficiency over a wide high-pressure range; multistage centrifugals fall off away from design point. Typical cases: boiler feed, mine dewatering, injection, descaling, filter-press feed. Measured retrofits save 19–27%." },

    { id: "saving", k: ["节电率", "偏低", "为什么低", "负值", "不准", "saving rate", "negative"],
      zh: "节电率是各环节逐项算出来的，不是人工填的：泵效提升、电机效率、传动、控制方式、变频器自身损耗都会各加减几个点。\n所以节电率低通常有三个原因：① 原设备本就不差（效率已在 80% 以上）② 实际运行点偏离额定点不多 ③ 新增变频器等环节自身有损耗，把收益吃掉一部分。\n负值表示这一项反而增加能耗——这不算错，是提醒你那一环别改。",
      en: "The rate is built item by item (pump efficiency, motor, drive, control, VFD losses). A low figure usually means the existing unit is already decent, it runs near its design point, or added VFD losses eat part of the gain. A negative item means that step adds energy — a warning, not a bug." },

    { id: "boundary", k: ["准不准", "可信", "误差", "边界", "能不能照着改", "accuracy", "reliable"],
      zh: "这是工程辅助测算，结果仅供参考。\n实际改造必须以现场勘察、实测和复核为准，本工具不构成承诺或交易要约。\n判断能不能改，关键看三件事：铭牌和实测是否对得上、年运行小时是否真实、介质和温度有没有被简化。这三项一错，节电量会放大或缩水很多。",
      en: "It is an engineering aid; results are indicative. Real retrofits must be based on site survey, measurement and review — it is not a commitment or offer.\nCheck three things: nameplate vs measured data, real annual hours, and fluid/temperature simplifications." },

    { id: "tariff", k: ["电价", "0.6", "电费", "tariff", "price per kwh"],
      zh: "默认电价 0.6 元/kWh，年运行小时自己填，两个都能在页面上改。\n年节电费 = 年节电量 × 电价，所以电价每差 0.1 元，节电费差约 17%。\n如果是峰谷电价或综合到户价，建议用全年平均到户电价，不要用峰价。",
      en: "Default tariff is 0.6 CNY/kWh and you can edit it plus annual hours. Annual saving = kWh x tariff, so 0.1 CNY difference moves the money by ~17%. Use your annual average delivered price, not the peak rate." },

    { id: "hours", k: ["运行小时", "年运行", "8000", "hours", "operating hours"],
      zh: "年运行小时直接影响节电量，按实际填。参考：连续生产 8000 h、两班制约 6000 h、单班约 3000 h。\n不少项目算出来漂亮，就是因为把 6000 h 当成了 8000 h——这一项最好从电费单或运行记录里核。",
      en: "Annual hours drive the kWh: continuous 8000 h, two shifts ~6000 h, one shift ~3000 h. Overstating this is the most common reason a saving looks too good; check the electricity bill or operating log." },

    { id: "motor", k: ["电机选型", "安全系数", "永磁", "功率档", "motor selection", "pm motor"],
      zh: "电机推荐功率 = 轴功率 × 安全系数（1.1–1.25），再向上取就近的标准功率档。\n永磁电机替换模块算的是替换前后的输入功率差：要填原电机额定功率、负载率、原效率、永磁机效率。\n注意：永磁电机在低负载率下优势明显，常年 80% 以上负载时省的电会少很多。",
      en: "Recommended motor = shaft power x 1.1–1.25, rounded up to a standard size. The PM retrofit module compares input power before/after; PM gains are largest at low load, small above 80% load." },

    { id: "fan", k: ["风机", "叶轮", "风量", "fan", "impeller"],
      zh: "风机模块按 Q、全压 p、风机效率、传动效率算轴功率，再对比改造后效率。\n常见改造是高效叶轮 + 蜗壳适配，保留原电机和变频器，实测节电 8–12%。\n如果风机长期低负载（低于 60%），先看选型是不是偏大，比换叶轮更划算。",
      en: "The fan module uses flow, total pressure, fan and drive efficiency. Typical retrofit is a high-efficiency impeller with matched casing, keeping motor and VFD, measured 8–12%. If load is below 60%, right-sizing beats a new impeller." },

    { id: "air", k: ["空压机", "气压", "air compressor", "compressed air"],
      zh: "空压机模块按排气量、排气压力、比功率算输入功率，再对比改造后的比功率。\n先看三件事：泄漏率（很多厂 20–30%）、加卸载方式、末端压力是否过高——这三项常常比换主机省钱。",
      en: "The compressor module uses flow, discharge pressure and specific power. Check leakage (often 20–30%), load/unload control and end-of-line pressure first — usually cheaper than replacing the compressor." },

    { id: "heat", k: ["余热", "回收", "热回收", "waste heat", "heat recovery"],
      zh: "余热回收模块按烟气/热水流量、进出口温度、比热和回收效率算可回收热量，再折成标煤和费用。\n注意两点：露点腐蚀（排烟温度不要降到酸露点以下）、回收的热要有去处（采暖/预热/工艺热水），否则算了也用不上。",
      en: "The waste-heat module uses flow, inlet/outlet temperature, specific heat and recovery efficiency. Watch acid dew point and make sure the recovered heat has a real user." },

    { id: "slurry", k: ["渣浆泵", "含固", "矿浆", "slurry"],
      zh: "渣浆泵模块按流量、扬程、矿浆密度和含固量算轴功率。含固高时介质密度和粘度都变，轴功率明显上升。\n柱塞式渣浆泵适合高扬程、含固 30% 以上；低扬程大流量还是离心渣浆泵更合适。",
      en: "The slurry module uses flow, head, slurry density and solids content. Plunger slurry pumps suit high head with 30%+ solids; low-head high-flow duties still favour centrifugal slurry pumps." },

    { id: "health", k: ["健康评测", "打分", "点检", "振动", "health"],
      zh: "设备运行健康评测按三块打分：机械（振动、温度、噪声、密封）、电气（绝缘、电流不平衡、功率因数）、能效（单位电耗、效率偏离）。\n输出是分数 + 优先整改项，不是节能量。适合改造前摸底，也适合日常点检打分。",
      en: "The health assessment scores mechanical (vibration, temperature, noise, sealing), electrical (insulation, current imbalance, power factor) and efficiency items, and lists priorities. It is a diagnostic, not an energy figure." },

    { id: "report", k: ["报告", "导出", "打印", "pdf", "report", "export"],
      zh: "每个模块算完后都有「生成报告」按钮，会打开一个可打印页面（浏览器里选另存为 PDF 即可），报告里带输入参数、测算结果和边界声明。\n报告编号自动生成，方便现场存档和内部审批。",
      en: "Each module has a report button that opens a printable page (save as PDF from the browser) with inputs, results and the boundary statement." },

    { id: "privacy", k: ["上传", "隐私", "数据", "安全", "privacy", "data"],
      zh: "测算数据不上传服务器，全部在浏览器本地计算。\n只有你在咨询窗口里主动发的文字会存到我们后台，用于工程师回复；不留 IP、不写 Cookie，会话 ID 是浏览器里随机生成的。",
      en: "Calculation data never leaves your browser. Only text you type into this chat is stored for engineer replies; no IP, no cookies, random conversation id only." },

    { id: "contact", k: ["联系", "电话", "微信", "方案", "报价", "工程师", "contact", "quote", "proposal"],
      zh: "零碳小助手：电话/微信 18041136555（同号），邮箱 419480861@qq.com。\n可以免费出节能改造技术方案，需要这些现场信息：设备铭牌照片、流量/扬程或压力、介质与温度、年运行小时、电价。\n设备报价按具体工况出方案后给，不在网上挂价。",
      en: "Zero Carbon Assistant: phone/WeChat +86 180 4113 6555, email 419480861@qq.com. A retrofit proposal is free; send nameplate photos, flow, head/pressure, fluid, temperature, annual hours and tariff. Equipment pricing follows the duty-specific proposal." }
  ];

  function norm(s) {
    return (s || "").toLowerCase().replace(/[，。？、；：！（）]/g, " ").replace(/\s+/g, " ").trim();
  }
  function match(text) {
    var q = norm(text), best = null, bestScore = 0;
    for (var i = 0; i < KB.length; i++) {
      var s = 0, k = KB[i].k;
      for (var j = 0; j < k.length; j++) {
        var kw = k[j].toLowerCase();
        if (q.indexOf(kw) !== -1) s += kw.length > 4 ? 2 : 1;
      }
      if (s > bestScore) { bestScore = s; best = KB[i]; }
    }
    return bestScore >= 1 ? best : null;
  }
  var HUMAN_RE = /human|engineer|sales|person|call me|contact me|工程师|人工|销售|联系我|转人工|真人/i;

  var root = document.createElement("div");
  root.id = "ec-chat-root";
  document.body.appendChild(root);

  var btn = document.createElement("button");
  btn.className = "ec-chat-btn";
  btn.type = "button";
  btn.setAttribute("aria-label", T.btn);
  btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9.6 9.6 0 0 1-3.4-.6L3 21l1.7-4.6A8.4 8.4 0 0 1 12 3.1a8.4 8.4 0 0 1 9 8.4Z"/></svg><span class="ec-btn-label">' + T.btn + '</span>';

  var panel = document.createElement("section");
  panel.className = "ec-chat-panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", T.title);
  panel.innerHTML =
    '<div class="ec-chat-head"><div><div class="ec-title">' + T.title + '</div><div class="ec-sub">' + T.sub + '</div></div><button class="ec-close" type="button" aria-label="Close">&times;</button></div>' +
    '<div class="ec-chat-body" id="ec-body"></div>' +
    '<div class="ec-chat-foot"><div class="ec-inputrow"><textarea id="ec-ta" rows="1" placeholder="' + T.ph + '"></textarea>' +
    '<button class="ec-send" id="ec-send" type="button" aria-label="Send"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4Z"/></svg></button></div>' +
    '<div class="ec-note">' + T.note + '</div></div>';

  root.appendChild(btn);
  root.appendChild(panel);

  var body = panel.querySelector("#ec-body");
  var ta = panel.querySelector("#ec-ta");
  var send = panel.querySelector("#ec-send");
  var history = [];
  var opened = false;

  function scroll() { body.scrollTop = body.scrollHeight; }
  function plain(s) {
    return String(s).replace(/\*\*(.+?)\*\*/g, "$1").replace(/^#{1,6}\s*/gm, "").replace(/`/g, "");
  }
  function add(who, text) {
    var row = document.createElement("div");
    row.className = "ec-msg " + who;
    var b = document.createElement("div");
    b.className = "ec-bubble";
    b.textContent = who === "bot" ? plain(text) : text;
    row.appendChild(b);
    body.appendChild(row);
    if (who !== "sys") history.push({ role: who === "me" ? "user" : "assistant", content: text });
    scroll();
  }
  function chips(list) {
    var wrap = document.createElement("div");
    wrap.className = "ec-chips";
    list.forEach(function (label) {
      var c = document.createElement("button");
      c.className = "ec-chip";
      c.type = "button";
      c.textContent = label;
      c.addEventListener("click", function () { wrap.remove(); ask(label); });
      wrap.appendChild(c);
    });
    body.appendChild(wrap);
    scroll();
  }
  function typing(on) {
    var el = document.getElementById("ec-typing");
    if (on) {
      if (el) return;
      var row = document.createElement("div");
      row.className = "ec-msg bot";
      row.id = "ec-typing";
      row.innerHTML = '<div class="ec-bubble"><span class="ec-typing"><i></i><i></i><i></i></span></div>';
      body.appendChild(row);
      scroll();
    } else if (el) { el.remove(); }
  }
  function escalate(prefix) {
    var box = document.createElement("div");
    box.className = "ec-escalate";
    box.innerHTML = '<p>' + T.escTitle + '</p>' +
      '<input id="ec-name" placeholder="' + T.escName + '" autocomplete="name">' +
      '<input id="ec-mail" placeholder="' + T.escMail + '" autocomplete="email">' +
      '<button type="button">' + T.escBtn + '</button>' +
      '<div class="ec-alt">' + T.escAlt + '<a href="tel:' + PHONE + '">' + PHONE + '</a> · <a href="mailto:' + EMAIL + '">' + EMAIL + '</a></div>';
    body.appendChild(box);
    scroll();
    var nameEl = box.querySelector("#ec-name");
    var mailEl = box.querySelector("#ec-mail");
    box.querySelector("button").addEventListener("click", function () {
      var contact = (mailEl.value || "").trim();
      if (contact.length < 3) { mailEl.focus(); return; }
      this.disabled = true;
      var note = "【留资】" + ((nameEl.value || "").trim() || "(未填)") + " / " + contact +
        (prefix ? "\n问题：" + prefix : "");
      handoff(note).then(function () { box.remove(); add("bot", T.escOk); })
        .catch(function () { this.disabled = false; add("bot", T.escFail); });
    });
  }

  function answerFor(text) {
    var hit = match(text);
    if (hit) {
      var a = ZH ? hit.zh : hit.en;
      add("bot", a);
      logKB(text, a);
      return true;
    }
    return false;
  }

  var endpoint = null;
  var CFG_CANDIDATES = (function () {
    var out = [], seen = {};
    function add(u) { if (u && !seen[u]) { seen[u] = 1; out.push(u); } }
    try {
      var s = document.currentScript;
      if (!s) {
        var list = document.getElementsByTagName("script");
        for (var i = list.length - 1; i >= 0; i--) {
          if (/chat\.js(\?|$)/.test(list[i].src || "")) { s = list[i]; break; }
        }
      }
      if (s && s.src) {
        var u = new URL(s.src, location.href);
        add(u.pathname.replace(/chat\.js$/, "chat-config.json"));
      }
    } catch (e) {}
    add("chat-config.json");
    add("/energy-calc-platform/chat-config.json");
    return out;
  })();
  function loadConfig() {
    var i = 0;
    (function next() {
      if (i >= CFG_CANDIDATES.length) return;
      fetch(CFG_CANDIDATES[i++], { cache: "no-store" })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (c) {
          if (c && c.endpoint) { endpoint = c.endpoint; startPoll(); } else { next(); }
        })
        .catch(next);
    })();
  }

  var convId = null;
  try { convId = localStorage.getItem("ec_conv"); } catch (e) {}
  if (!convId) {
    convId = "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    try { localStorage.setItem("ec_conv", convId); } catch (e) {}
  }
  var lastId = 0, mode = "ai", polling = false;

  /* 2026-11-17: 访客第一个问题，先固定回这一句（中英对照），再正常作答 */
  var ACK = "请稍等，我为您连线工程师。\n\nPlease wait a moment while I connect you with an engineer.";
  var ackKey = "hs_ack_" + convId, ackSent = false;
  try { ackSent = localStorage.getItem(ackKey) === "1"; } catch (e) {}

  function api(path, body) {
    return fetch(endpoint.replace(/\/$/, "") + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body || {})
    });
  }
  function logKB(q, a) {
    api("/log", { conv: convId, message: q, answer: a, lang: ZH ? "zh" : "en" }).catch(function () {});
  }
  function startPoll() {
    if (polling || !endpoint) return;
    polling = true;
    function loop() {
      if (!panel.classList.contains("open")) { polling = false; return; }
      fetch(endpoint.replace(/\/$/, "") + "/poll?conv=" + encodeURIComponent(convId) + "&after=" + lastId + "&wait=20", { cache: "no-store" })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (j) {
          if (j) {
            if (j.mode) mode = j.mode;
            (j.messages || []).forEach(function (m) {
              if (m.id > lastId) lastId = m.id;
              if (m.role === "human") add("human", m.text);
              else add("bot", m.text);
            });
          }
          setTimeout(loop, 700);
        })
        .catch(function () { setTimeout(loop, 5000); });
    }
    loop();
  }
  function handoff(text) {
    if (!endpoint) return Promise.reject();
    return api("/handoff", { conv: convId, message: text, lang: ZH ? "zh" : "en" })
      .then(function () { mode = "human"; add("bot", T.waitHuman); startPoll(); });
  }
  function ask(text) {
    text = (text || "").trim();
    if (!text) return;
    add("me", text);
    if (!ackSent) { ackSent = true; try { localStorage.setItem(ackKey, "1"); } catch (e) {} add("bot", ACK); }
    if (HUMAN_RE.test(text) && endpoint) { handoff(text).catch(function () {}); return; }
    if (mode === "human" && endpoint) { api("/chat", { conv: convId, message: text, lang: ZH ? "zh" : "en" }).catch(function () {}); startPoll(); return; }
    if (answerFor(text)) return;
    if (endpoint) {
      typing(true);
      api("/chat", { conv: convId, message: text, lang: ZH ? "zh" : "en" })
        .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
        .then(function (j) {
          typing(false);
          if (j.mode) mode = j.mode;
          if (j.id && j.id > lastId) lastId = j.id;
          if (j.reply) {
            add("bot", j.reply);
            if (j.escalate) escalate(text);
          } else if (j.mode === "human") {
            add("bot", T.aiPaused);
          } else { throw new Error("empty"); }
          if (mode === "human") startPoll();
        })
        .catch(function () {
          typing(false);
          add("bot", T.errNet);
          escalate(text);
        });
      return;
    }
    add("bot", ZH
      ? "这个问题我拿不准，转给工程师更靠谱。留个电话或邮箱，1 个工作日内联系你；急事直接打 18041136555（微信同号）。"
      : "That one needs an engineer. Leave a phone or email and you will be contacted within one working day.");
    escalate(text);
  }

  function openPanel() {
    panel.classList.add("open");
    btn.style.display = "none";
    if (!opened) {
      opened = true;
      add("bot", T.greet);
      chips(T.chips);
      loadConfig();
    }
    startPoll();
    ta.focus();
  }
  function closePanel() {
    panel.classList.remove("open");
    btn.style.display = "";
  }

  btn.addEventListener("click", openPanel);
  panel.querySelector(".ec-close").addEventListener("click", closePanel);
  send.addEventListener("click", function () {
    var v = ta.value;
    ta.value = "";
    ta.style.height = "";
    ask(v);
  });
  ta.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send.click(); }
  });
  ta.addEventListener("input", function () {
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 96) + "px";
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && panel.classList.contains("open")) closePanel();
  });
})();
