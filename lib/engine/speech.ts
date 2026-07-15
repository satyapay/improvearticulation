/* ============================================================
   Speech provider abstraction.

   Week 1 ships the browser Web Speech API only (Chrome/Edge),
   exactly as the prototype used it. Week 2+ cloud STT
   (ElevenLabs / Deepgram / Azure) plugs in by implementing
   SpeechProvider and returning it from getSpeechProvider() —
   no drill code changes required.
   ============================================================ */

export interface Recognizer {
  start(): void;
  stop(): void;
  /** Fired when the underlying recognizer ends; drills use this to auto-restart mid-run. */
  onend: (() => void) | null;
}

export interface SpeechProvider {
  isSupported(): boolean;
  /**
   * onText receives the FULL accumulated transcript so far
   * (interim + final), matching the prototype's onresult handling.
   */
  create(onText: (fullTranscript: string) => void): Recognizer;
}

/* Minimal typing for the vendor-prefixed Web Speech API. */
type SRInstance = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((ev: SREvent) => void) | null;
  onerror: ((ev: unknown) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
};
type SREvent = {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
};
type SRCtor = new () => SRInstance;

function getSRCtor(): SRCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SRCtor;
    webkitSpeechRecognition?: SRCtor;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

const webSpeechProvider: SpeechProvider = {
  isSupported() {
    return getSRCtor() !== null;
  },
  create(onText) {
    const SR = getSRCtor();
    if (!SR) throw new Error("Web Speech API not available");
    const r = new SR();
    r.lang = "en-US";
    r.continuous = true;
    r.interimResults = true;
    r.maxAlternatives = 1;
    r.onresult = (ev) => {
      let txt = "";
      for (let i = 0; i < ev.results.length; i++)
        txt += " " + ev.results[i][0].transcript;
      onText(txt);
    };
    r.onerror = () => {};
    const rec: Recognizer = {
      start() {
        try {
          r.start();
        } catch {
          /* already started — same guard as prototype */
        }
      },
      stop() {
        try {
          r.stop();
        } catch {
          /* already stopped */
        }
      },
      onend: null,
    };
    r.onend = () => {
      if (rec.onend) rec.onend();
    };
    return rec;
  },
};

/** Week 2+ swap point: return a cloud STT provider here instead. */
export function getSpeechProvider(): SpeechProvider {
  return webSpeechProvider;
}
