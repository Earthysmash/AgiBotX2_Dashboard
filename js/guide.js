"use strict";
/* ============================================================================
   guide.js — renders GUIDE into the setup tab.

   Two details worth knowing:
   * {IP} and {USER} become <span> elements rather than baked-in text, so
     typing in the helper bar updates every command in place without a
     re-render — which would otherwise steal focus on each keystroke.
   * Copying falls back to execCommand, because navigator.clipboard is not
     reliably available when the page is opened straight off disk.
   ========================================================================= */

/* Escape, then turn the placeholders into live spans. */
function gsub(text){
  return esc(text)
    .replace(/\{IP\}/g,   '<span class="v-ip"></span>')
    .replace(/\{USER\}/g, '<span class="v-user"></span>');
}

function refreshVars(){
  const ip=App.cfg.ip || DEFAULTS.ip, user=App.cfg.user || DEFAULTS.user;
  $$(".v-ip").forEach(e=>e.textContent=ip);
  $$(".v-user").forEach(e=>e.textContent=user);
}

function copyText(text,btn){
  const done=()=>{
    const old=btn.textContent;
    btn.textContent="คัดลอกแล้ว ✓"; btn.classList.add("done");
    setTimeout(()=>{ btn.textContent=old; btn.classList.remove("done"); },1400);
  };
  if(navigator.clipboard && window.isSecureContext){
    navigator.clipboard.writeText(text).then(done,()=>fallback());
  }else fallback();

  function fallback(){
    const ta=document.createElement("textarea");
    ta.value=text; ta.style.position="fixed"; ta.style.opacity="0";
    document.body.appendChild(ta); ta.select();
    try{ document.execCommand("copy"); done(); }
    catch{ toast("คัดลอกไม่สำเร็จ — เลือกข้อความแล้วกด Ctrl+C","err"); }
    ta.remove();
  }
}

/* ------------------------------------------------------------- BLOCK TYPES */
function renderBlock(b){
  if(b.p)    return `<p class="th">${gsub(b.p.th)}</p><p class="en">${gsub(b.p.en)}</p>`;
  if(b.tip)  return callout("tip","เคล็ดลับ","Tip",b.tip);
  if(b.warn) return callout("warn","ระวัง","Careful",b.warn);

  if(b.list) return `<ul>`+b.list.map(i=>
      `<li class="th">${gsub(i.th)}</li><li class="en">${gsub(i.en)}</li>`).join("")+`</ul>`;

  if(b.cmd) return `
    <div class="cmd">
      <div class="lb"><span class="th">${gsub(b.cmd.lb.th)}</span><span class="en">${gsub(b.cmd.lb.en)}</span></div>
      <div class="cx">
        <code>${gsub(b.cmd.run)}</code>
        <button class="cp" type="button">คัดลอก</button>
      </div>
    </div>`;

  if(b.fork) return `<div class="fork">`+b.fork.map(c=>`
      <div>
        <h5><span class="th">${gsub(c.h.th)}</span><i class="en">${gsub(c.h.en)}</i></h5>
        ${c.blocks.map(renderBlock).join("")}
      </div>`).join("")+`</div>`;

  /* the list of endpoints this dashboard actually binds */
  if(b.topics) return `<div class="cmd"><div class="out">`+
    Object.entries(T).filter(([k])=>!["slamCmd","reloc","vel","joints"].includes(k))
      .map(([k,v])=>esc(v)).join("\n")+`</div></div>`;

  /* the "fill this into the settings box for me" button */
  if(b.apply) return `
    <div class="row" style="margin:11px 0">
      <button class="pb g" type="button" data-act="applyIp">
        <span class="th1">⚡ ใส่ที่อยู่นี้ให้อัตโนมัติ แล้วเชื่อมต่อเลย</span><span class="en1">⚡ Fill this in and connect now</span>
      </button>
    </div>`;

  return "";
}

function callout(cls,thH,enH,o){
  return `<div class="${cls}">
    <span class="h"><span class="th1">${thH}</span><span class="en1">${enH}</span></span>
    <p class="th">${gsub(o.th)}</p><p class="en">${gsub(o.en)}</p>
  </div>`;
}

/* ----------------------------------------------------------------- RENDER */
function renderGuide(){
  const host=$("#pane-guide");
  if(!host) return;

  const steps=GUIDE.steps.map((s,i)=>`
    <section class="gstep">
      <header>
        <div class="gnum">${i+1}</div>
        <div>
          <h3><span class="th">${s.icon} ${gsub(s.title.th)}</span><i class="en">${s.icon} ${gsub(s.title.en)}</i></h3>
        </div>
      </header>
      ${s.blocks.map(renderBlock).join("")}
    </section>`).join("");

  const trouble=`
    <section class="gtable">
      <h3><span class="th">🩹 แก้ปัญหาที่เจอบ่อย</span><i class="en">Common problems and what they mean</i></h3>
      <div class="trb">${GUIDE.trouble.map(t=>`
        <div>
          <div class="sym">${esc(t.sym)}</div>
          <div class="fix"><span class="th">${gsub(t.fix.th)}</span><span class="en">${gsub(t.fix.en)}</span></div>
        </div>`).join("")}
      </div>
    </section>`;

  const glossary=`
    <section class="gtable">
      <h3><span class="th">📖 ศัพท์ที่โผล่มาบ่อย</span><i class="en">Words that keep coming up</i></h3>
      <div class="gloss">${GUIDE.glossary.map(g=>`
        <div>
          <dt>${esc(g.t)}</dt>
          <dd class="th">${gsub(g.th)}</dd>
          <dd class="en">${gsub(g.en)}</dd>
        </div>`).join("")}
      </div>
    </section>`;

  host.innerHTML=`
    <div class="guide">
      <div class="gtool">
        <div class="f">
          <label>IP ของหุ่นยนต์ · Robot IP</label>
          <input type="text" id="gIp" spellcheck="false">
        </div>
        <div class="f">
          <label>ชื่อผู้ใช้ · SSH username</label>
          <input type="text" id="gUser" spellcheck="false">
        </div>
        <div class="sp"></div>
        <div class="f">
          <label>ภาษา · Language</label>
          <span class="seg" id="gLang">
            <button type="button" data-lang="both">ทั้งคู่</button>
            <button type="button" data-lang="th">ไทย</button>
            <button type="button" data-lang="en">EN</button>
          </span>
        </div>
      </div>

      <div class="ghero">
        <h2><span class="th">${gsub(GUIDE.hero.th)}</span><i class="en">${gsub(GUIDE.hero.en)}</i></h2>
        <p class="th">${gsub(GUIDE.hero.p.th)}</p>
        <p class="en">${gsub(GUIDE.hero.p.en)}</p>
      </div>

      ${steps}${trouble}${glossary}
    </div>`;

  wireGuide();
  refreshVars();
}

function wireGuide(){
  const ip=$("#gIp"), user=$("#gUser");
  ip.value=App.cfg.ip || DEFAULTS.ip;
  user.value=App.cfg.user || DEFAULTS.user;

  ip.addEventListener("input",()=>{
    App.cfg.ip=ip.value.trim() || DEFAULTS.ip;
    refreshVars(); Prefs.save();
  });
  user.addEventListener("input",()=>{
    App.cfg.user=user.value.trim() || DEFAULTS.user;
    refreshVars(); Prefs.save();
  });

  /* every copy button copies the command sitting next to it */
  $$("#pane-guide .cp").forEach(btn=>{
    btn.onclick=()=>copyText(btn.previousElementSibling.textContent.trim(),btn);
  });

  /* language segmented control */
  const cur=document.body.getAttribute("data-lang") || "both";
  $$("#gLang button").forEach(b=>{
    b.classList.toggle("on",b.dataset.lang===cur);
    b.onclick=()=>{
      document.body.setAttribute("data-lang",b.dataset.lang);
      $$("#gLang button").forEach(o=>o.classList.toggle("on",o===b));
      Prefs.save();
    };
  });

  /* "fill it in for me" — writes the URL into settings and connects */
  $$('#pane-guide [data-act="applyIp"]').forEach(b=>b.onclick=()=>{
    const url=urlFromIp(App.cfg.ip);
    $("#cfgUrl").value=url;
    App.cfg.url=url; Prefs.save();
    toast("ตั้งค่าเป็น "+url,"ok");
    Tabs.go("live");
    connect();
  });
}
