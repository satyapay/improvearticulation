/* ============================================================
   PLUGIN 2 — PACE & PAUSE  (score-max, tempo band + pause beats)
   Trains the opposite muscle: deliberate control, not raw speed.
   Ported verbatim from the prototype. Scoring untouched:
   control = 60% tempo residency + 40% pauses landed.
   ============================================================ */

import { norm, tokens, wordMatch } from "@/lib/engine/text";
import { beep } from "@/lib/engine/audio";
import { getSpeechProvider, type Recognizer } from "@/lib/engine/speech";
import type { DrillContext, DrillPlugin } from "@/lib/engine/types";

// "|" marks a pause the reader must land. all levels ranked.
const CONTENT = [
  { level: 1, label: "Steady", lo: 105, hi: 150, text: "Take a deep breath | and begin slowly. | You have all the time you need." },
  { level: 2, label: "Presenter", lo: 115, hi: 160, text: "Good morning everyone. | Today we will talk | about something that matters. | Let us begin." },
  { level: 3, label: "Broadcast", lo: 125, hi: 170, text: "The results are in | and the numbers surprised us. | Revenue climbed sharply, | but the costs rose too. | Here is what it means." },
];

const PAUSE_MS = 320;
const laneLo = 60,
  laneHi = 200;

export function createPace(ctx: DrillContext): DrillPlugin {
  let host: HTMLElement;
  const $ = (id: string) => host.querySelector("#" + id) as HTMLElement;

  let idx = 0,
    running = false,
    finished = false,
    startT = 0,
    raf = 0,
    rec: Recognizer | null = null;
  let target: string[] = [],
    pauseBefore: boolean[] = [],
    beatIndex: Record<number, number> = {},
    matched = 0,
    lastWordT = 0;
  let pausesMarked = 0,
    pausesHit = 0,
    inBandSamples = 0,
    totalSamples = 0,
    lastSample = 0;

  function mount(h: HTMLElement) {
    host = h;
    host.innerHTML = `
      <div class="rail" id="prail"></div>
      <div class="stage">
        <div class="meta"><span id="pmetaL">LEVEL 1 · STEADY</span><span class="flag ranked">RANKED</span></div>
        <div class="text passage" id="ptext"></div>
        <div class="tempo" id="tempo">
          <div class="wpm" id="wpm">—<b> WPM</b></div>
          <div class="lane"><div class="zone" id="zone"></div></div>
          <div class="needle cold" id="needle"></div>
          <div class="endlab" style="left:0">slow</div>
          <div class="endlab" style="right:0;text-align:right">fast</div>
        </div>
        <div class="readouts">
          <div class="stat zero" id="pbeatBox"><span class="n" id="pbeatN">0</span><span class="lab" id="pbeatL">/ 0 pauses</span></div>
          <div class="pb"><div class="lab">best control</div><div class="v none" id="ppbv">—</div></div>
        </div>
        <div class="verdict" id="pverdict">Read at a steady pace. Land the pauses on the marks.</div>
      </div>
      <div class="action">
        <button class="go" id="pgo">START</button>
        <div class="hint">Hold your rate inside the green band · pause on the marks</div>
      </div>`;
    $("pgo").onclick = () => go();
    buildRail();
    render();
  }

  function buildRail() {
    const r = $("prail");
    r.innerHTML = "";
    CONTENT.forEach((d, i) => {
      const c = document.createElement("button");
      c.className = "chip" + (i === idx ? " on" : "");
      c.onclick = () => {
        if (running) stop(true);
        idx = i;
        render();
      };
      c.innerHTML = `<div class="tn">L${d.level}</div><div class="tl">${d.label}</div>`;
      r.appendChild(c);
    });
  }

  function parse(text: string) {
    // build word list + pauseBefore flags + display html with caesura beats
    const rawTokens = text.split(/\s+/);
    target = [];
    pauseBefore = [];
    beatIndex = {};
    let html = "",
      ni = 0,
      pendingPause = false,
      beatN = 0;
    rawTokens.forEach((tk) => {
      if (tk === "|") {
        pendingPause = true;
        html += `<span class="beat" data-beat="${beatN}">│</span> `;
        beatIndex[ni] = beatN;
        beatN++;
        return;
      }
      const clean = norm(tk);
      if (!clean) {
        html += tk + " ";
        return;
      }
      target.push(clean);
      pauseBefore.push(pendingPause);
      html += `<span class="w" data-i="${ni}">${tk}</span> `;
      pendingPause = false;
      ni++;
    });
    pausesMarked = pauseBefore.filter(Boolean).length;
    return html;
  }

  function render() {
    const d = CONTENT[idx];
    buildRail();
    $("ptext").className = "text passage";
    $("ptext").innerHTML = parse(d.text);
    $("pmetaL").textContent = `LEVEL ${d.level} · ${d.label.toUpperCase()}`;
    // zone spans lo..hi on a 60..200 wpm lane
    const span = laneHi - laneLo;
    const zL = ((d.lo - laneLo) / span) * 100,
      zW = ((d.hi - d.lo) / span) * 100;
    $("zone").style.left = zL + "%";
    $("zone").style.width = zW + "%";
    $("pbeatN").textContent = "0";
    $("pbeatL").textContent = `/ ${pausesMarked} pauses`;
    $("pbeatBox").className = "stat zero";
    $("wpm").innerHTML = "—<b> WPM</b>";
    $("needle").className = "needle cold";
    $("needle").style.left = "0%";
    const pb = ctx.scores.getPB("pace", idx),
      pv = $("ppbv");
    if (pb != null) {
      pv.textContent = pb + "%";
      pv.className = "v";
    } else {
      pv.textContent = "—";
      pv.className = "v none";
    }
    resetRun();
    $("pverdict").className = "verdict";
    $("pverdict").textContent =
      "Read at a steady pace. Land the pauses on the marks.";
  }

  function resetRun() {
    matched = 0;
    finished = false;
    pausesHit = 0;
    inBandSamples = 0;
    totalSamples = 0;
    lastSample = 0;
    host
      .querySelectorAll("#ptext .w")
      .forEach((w) => (w.className = "w"));
    host
      .querySelectorAll("#ptext .beat")
      .forEach((b) => (b.className = "beat"));
  }

  function go() {
    if (running) stop(false);
    else start();
  }

  function start() {
    resetRun();
    $("pverdict").className = "verdict";
    $("pverdict").textContent = "READ";
    running = true;
    finished = false;
    $("pgo").textContent = "STOP";
    $("pgo").className = "go live";
    startT = performance.now();
    lastWordT = startT;
    loop();
    rec = getSpeechProvider().create(onText);
    rec.onend = () => {
      if (running && !finished) rec?.start();
    };
    rec.start();
  }

  function wpmToPct(w: number) {
    return Math.max(0, Math.min(100, ((w - laneLo) / (laneHi - laneLo)) * 100));
  }

  function loop() {
    if (!running) return;
    const now = performance.now();
    const el = now - startT;
    if (el > 900 && matched >= 2) {
      const wpm = Math.round(matched / (el / 60000));
      $("wpm").innerHTML = wpm + "<b> WPM</b>";
      const n = $("needle");
      n.style.left = wpmToPct(wpm) + "%";
      const d = CONTENT[idx];
      n.className = "needle" + (wpm > d.hi ? " hot" : wpm < d.lo ? " cold" : "");
      // sample band residency every ~200ms
      if (now - lastSample >= 200) {
        lastSample = now;
        totalSamples++;
        if (wpm >= d.lo && wpm <= d.hi) inBandSamples++;
      }
    }
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
      const now = performance.now();
      const gap = now - lastWordT;
      for (let k = matched; k < ti; k++) {
        const el = host.querySelector(`#ptext .w[data-i="${k}"]`);
        if (el) el.className = "w hit";
        // pause check: the gap immediately before a pauseBefore word is the moment
        if (pauseBefore[k] && k === matched) {
          // only judge on the first newly-crossed word
          const beat = host.querySelector(
            `#ptext .beat[data-beat="${beatIndex[k]}"]`
          );
          if (gap >= PAUSE_MS) {
            pausesHit++;
            if (beat) beat.className = "beat hit";
            beep("pause");
          } else {
            if (beat) beat.className = "beat miss";
            beep("tick");
          }
          $("pbeatN").textContent = String(pausesHit);
          $("pbeatBox").className = "stat";
        }
      }
      host
        .querySelectorAll("#ptext .w.cur")
        .forEach((w) => w.classList.remove("cur"));
      const cur = host.querySelector(`#ptext .w[data-i="${ti}"]`);
      if (cur) cur.classList.add("cur");
      matched = ti;
      lastWordT = now;
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
    $("pgo").textContent = "START";
    $("pgo").className = "go";
    if (!silent && !finished) {
      $("pverdict").className = "verdict nobank";
      $("pverdict").textContent = "Stopped — passage not completed";
    }
  }

  function complete() {
    if (finished) return;
    finished = true;
    running = false;
    cancelAnimationFrame(raf);
    if (rec) {
      rec.stop();
      rec = null;
    }
    $("pgo").textContent = "START";
    $("pgo").className = "go";
    const acc = matched / target.length;
    if (acc < 0.75) {
      $("ptext").classList.add("fail");
      ctx.flash("death");
      beep("death");
      $("pverdict").className = "verdict nobank";
      $("pverdict").textContent = "Missed words · no bank";
      return;
    }
    // Control score = 60% tempo residency + 40% pauses landed
    const tempoPct = totalSamples
      ? Math.round((inBandSamples / totalSamples) * 100)
      : 0;
    const pausePct = pausesMarked
      ? Math.round((pausesHit / pausesMarked) * 100)
      : 100;
    const control = Math.round(tempoPct * 0.6 + pausePct * 0.4);
    const prev = ctx.scores.getPB("pace", idx),
      isPB = prev === null || control > prev;
    if (isPB) ctx.scores.setPB("pace", idx, control);
    ctx.scores.bank("pace", idx, control);
    const grade = control >= 90 ? "A" : control >= 75 ? "B" : control >= 60 ? "C" : "D";
    if (control >= 60) {
      $("ptext").classList.add("win");
      ctx.flash("win");
      beep("win");
    }
    $("pverdict").className = "verdict " + (control >= 60 ? "bank" : "nobank");
    $("pverdict").textContent =
      `CONTROL ${control}% · ${tempoPct}% in-tempo · ${pausesHit}/${pausesMarked} pauses · ${grade}` +
      (isPB ? " · NEW BEST" : "");
    const pv = $("ppbv"),
      pb = ctx.scores.getPB("pace", idx);
    pv.textContent = pb + "%";
    pv.className = "v";
  }

  function teardown() {
    if (running) stop(true);
  }

  return { mount, teardown, label: "PACE" };
}
