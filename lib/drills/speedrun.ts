/* ============================================================
   PLUGIN 1 — SPEEDRUN  (time-min, floor-gated, T1-2 ranked)
   Ported verbatim from the prototype. Scoring untouched.
   ============================================================ */

import { norm, tokens, fmt, wordMatch } from "@/lib/engine/text";
import { beep } from "@/lib/engine/audio";
import { getSpeechProvider, type Recognizer } from "@/lib/engine/speech";
import type { DrillContext, DrillPlugin } from "@/lib/engine/types";

const CONTENT = [
  { tier: 1, label: "Warm-up", ranked: true, text: "Red lorry, yellow lorry", floor: 1300, gold: 1900, silver: 2400, bronze: 3200 },
  { tier: 2, label: "Wide alt", ranked: true, text: "Peter Piper picked a peck of pickled peppers", floor: 2200, gold: 3200, silver: 4000, bronze: 5200 },
  { tier: 3, label: "Narrow alt", ranked: false, text: "She sells sea shells by the sea shore", floor: 1900, gold: 2800, silver: 3600, bronze: 4600 },
  { tier: 4, label: "Voicing load", ranked: false, text: "The sixth sick sheikh's sixth sheep", floor: 1700, gold: 2600, silver: 3400, bronze: 4400 },
  { tier: 5, label: "Boss run", ranked: false, text: "Unique New York, you know you need unique New York", floor: 2800, gold: 4000, silver: 5000, bronze: 6500 },
];

export function createSpeedrun(ctx: DrillContext): DrillPlugin {
  let host: HTMLElement;
  const $ = (id: string) => host.querySelector("#" + id) as HTMLElement;

  let idx = 0,
    mode: "practice" | "hardcore" = "practice",
    running = false,
    finished = false,
    startT = 0,
    raf = 0,
    rec: Recognizer | null = null,
    matched = 0,
    combo = 0,
    target: string[] = [],
    scaleMax = 0;

  function mount(h: HTMLElement) {
    host = h;
    host.innerHTML = `
      <div class="rail" id="rail"></div>
      <div class="stage">
        <div class="meta"><span id="metaL">TIER 1 · WARM-UP</span><span class="flag ranked" id="flag">RANKED</span></div>
        <div class="text phrase" id="text"></div>
        <div>
          <div class="timer" id="timer">0.00</div>
          <div class="track" id="track" style="margin-top:10px">
            <div class="danger" id="danger"></div><div class="bar"><div class="fill" id="fill"></div></div>
            <div class="gate floor" id="g-floor"><span class="lab">slur</span></div>
            <div class="gate gold" id="g-gold"><span class="lab">gold</span></div>
            <div class="gate silver" id="g-silver"><span class="lab">silver</span></div>
            <div class="gate bronze" id="g-bronze"><span class="lab">bronze</span></div>
            <div class="ghost" id="ghost"></div>
          </div>
        </div>
        <div class="readouts">
          <div class="stat zero" id="comboBox"><span class="x">×</span><span class="n" id="comboN">0</span><span class="lab">combo</span></div>
          <div class="pb"><div class="lab">best time</div><div class="v none" id="pbv">—</div></div>
        </div>
        <div class="verdict" id="verdict">Tap to start. Say it fast — stay crisp.</div>
      </div>
      <div class="action">
        <div class="row-toggle">
          <button id="mp" class="on">Practice</button>
          <button id="mh">Hardcore</button>
        </div>
        <button class="go" id="go">START</button>
        <div class="hint" id="hint">Chrome only · mic access required</div>
      </div>`;
    $("mp").onclick = () => setMode("practice");
    $("mh").onclick = () => setMode("hardcore");
    $("go").onclick = () => go();
    buildRail();
    render();
  }

  function buildRail() {
    const r = $("rail");
    r.innerHTML = "";
    CONTENT.forEach((d, i) => {
      const c = document.createElement("button");
      c.className = "chip" + (i === idx ? " on" : "");
      c.onclick = () => {
        if (running) stop(true);
        idx = i;
        render();
      };
      c.innerHTML =
        `<div class="tn">T${d.tier}</div><div class="tl">${d.label}</div>` +
        (d.ranked ? "" : '<span class="exp">EXP</span>');
      r.appendChild(c);
    });
  }

  function render() {
    const d = CONTENT[idx];
    target = tokens(d.text);
    buildRail();
    const raw = d.text.split(/\s+/);
    let ni = 0;
    $("text").className = "text phrase";
    $("text").innerHTML = raw
      .map((w) => {
        const has = norm(w).length > 0;
        const i2 = has ? ni++ : -1;
        return `<span class="w" data-i="${i2}">${w}</span>`;
      })
      .join(" ");
    $("metaL").textContent = `TIER ${d.tier} · ${d.label.toUpperCase()}`;
    const f = $("flag");
    if (d.ranked) {
      f.textContent = "RANKED";
      f.className = "flag ranked";
    } else {
      f.textContent = "EXPERIMENTAL · UNRANKED";
      f.className = "flag";
    }
    scaleMax = d.bronze * 1.3;
    const pct = (t: number) => Math.min(100, (t / scaleMax) * 100);
    $("danger").style.width = pct(d.floor) + "%";
    $("g-floor").style.left = pct(d.floor) + "%";
    $("g-gold").style.left = pct(d.gold) + "%";
    $("g-silver").style.left = pct(d.silver) + "%";
    $("g-bronze").style.left = pct(d.bronze) + "%";
    const pb = ctx.scores.getPB("speedrun", idx),
      gh = $("ghost");
    if (pb) {
      gh.style.left = pct(pb) + "%";
      gh.style.opacity = ".85";
    } else gh.style.opacity = "0";
    const pv = $("pbv");
    if (pb) {
      pv.textContent = fmt(pb) + "s";
      pv.className = "v";
    } else {
      pv.textContent = "—";
      pv.className = "v none";
    }
    resetReadouts();
    $("verdict").className = "verdict";
    $("verdict").textContent = "Tap to start. Say it fast — stay crisp.";
  }

  function resetReadouts() {
    combo = 0;
    matched = 0;
    finished = false;
    $("comboN").textContent = "0";
    $("comboBox").className = "stat zero";
    $("timer").textContent = "0.00";
    $("timer").className = "timer";
    $("fill").style.width = "0%";
    $("track").className = "track";
    host
      .querySelectorAll("#text .w")
      .forEach((w) => (w.className = "w"));
  }

  function setMode(m: "practice" | "hardcore") {
    mode = m;
    $("mp").className = m === "practice" ? "on" : "";
    $("mh").className = m === "hardcore" ? "on hardcore" : "";
    $("hint").textContent =
      m === "hardcore"
        ? "Hardcore · one slur ends the run"
        : "Chrome only · mic access required";
  }

  function go() {
    if (running) stop(false);
    else start();
  }

  function start() {
    resetReadouts();
    $("verdict").className = "verdict";
    $("verdict").textContent = "GO";
    running = true;
    finished = false;
    $("go").textContent = "STOP";
    $("go").className = "go live";
    startT = performance.now();
    loop();
    rec = getSpeechProvider().create(onText);
    rec.onend = () => {
      if (running && !finished) rec?.start();
    };
    rec.start();
  }

  function loop() {
    if (!running) return;
    const el = performance.now() - startT;
    $("timer").innerHTML = fmt(el) + '<span class="ms"></span>';
    $("fill").style.width = Math.min(100, (el / scaleMax) * 100) + "%";
    raf = requestAnimationFrame(loop);
  }

  function onText(txt: string) {
    if (!running) return;
    const heard = tokens(txt);
    let ti = 0;
    for (let hi = 0; hi < heard.length && ti < target.length; hi++) {
      if (wordMatch(target[ti], heard[hi])) ti++;
    }
    if (ti > matched) {
      for (let k = matched; k < ti; k++) {
        const el = host.querySelector(`#text .w[data-i="${k}"]`);
        if (el) el.className = "w hit";
        combo++;
      }
      host
        .querySelectorAll("#text .w.cur")
        .forEach((w) => w.classList.remove("cur"));
      const cur = host.querySelector(`#text .w[data-i="${ti}"]`);
      if (cur) cur.classList.add("cur");
      matched = ti;
      $("comboN").textContent = String(combo);
      $("comboBox").className = "stat";
      beep("tick");
    }
    if (matched >= target.length) complete();
  }

  function stop(silent: boolean) {
    running = false;
    cancelAnimationFrame(raf);
    if (rec) {
      rec.stop();
      rec = null;
    }
    $("go").textContent = "START";
    $("go").className = "go";
    if (!silent && !finished) {
      $("verdict").className = "verdict nobank";
      $("verdict").textContent = "Stopped — phrase not completed";
    }
  }

  function complete() {
    if (finished) return;
    finished = true;
    const el = performance.now() - startT;
    running = false;
    cancelAnimationFrame(raf);
    if (rec) {
      rec.stop();
      rec = null;
    }
    $("go").textContent = "START";
    $("go").className = "go";
    $("timer").innerHTML = fmt(el);
    const d = CONTENT[idx];
    const acc = matched / target.length;
    if (el < d.floor) {
      return fail("slur", "Too fast to be clean — slur suspected · no bank");
    }
    if (acc < 0.75) {
      return fail("miss", "Missed words · no bank");
    }
    if (mode === "hardcore" && combo < target.length) {
      return fail("death", "Combo broke — run dead");
    }
    const medal =
      el <= d.gold ? "gold" : el <= d.silver ? "silver" : el <= d.bronze ? "bronze" : null;
    const prev = ctx.scores.getPB("speedrun", idx),
      isPB = prev === null || el < prev;
    if (isPB) ctx.scores.setPB("speedrun", idx, el);
    ctx.scores.bank("speedrun", idx, el);
    $("text").classList.add("win");
    $("timer").className = "timer win";
    $("track").className = "track win";
    ctx.flash("win");
    beep("win");
    const m =
      (medal ? medal.toUpperCase() + " · " : "") +
      (isPB ? "NEW PERSONAL BEST" : "BANKED") +
      (d.ranked ? "" : " · unranked");
    $("verdict").className = "verdict bank";
    $("verdict").textContent = m;
    const pv = $("pbv"),
      pb = ctx.scores.getPB("speedrun", idx)!;
    pv.textContent = fmt(pb) + "s";
    pv.className = "v";
    const gh = $("ghost");
    gh.style.left = Math.min(100, (pb / scaleMax) * 100) + "%";
    gh.style.opacity = ".85";
  }

  function fail(kind: string, msg: string) {
    $("text").classList.add("fail");
    $("timer").className = "timer fail";
    if (kind === "slur") {
      $("track").className = "track toofast";
      $("fill").style.width = "100%";
    }
    ctx.flash("death");
    beep("death");
    $("verdict").className = "verdict nobank";
    $("verdict").textContent = msg;
  }

  function teardown() {
    if (running) stop(true);
  }

  return { mount, teardown, label: "SPEEDRUN" };
}
