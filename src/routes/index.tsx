import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Shield, ShieldCheck, Lock, Headphones, UserSearch, Phone, MessageSquare, Mic, MicOff,
  Play, Square, ChevronLeft, Home, ScanSearch, BarChart3, AlertTriangle, CheckCircle2, Sparkles as _s,
} from "lucide-react";
import { INCIDENTS, DEMOS, RISK_META, analyze, highlight, type Incident } from "@/lib/pause";

void _s;

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PAUSE · ВТБ Защитник — защита от мошенников" },
      { name: "description", content: "Сервис безопасности в стиле ВТБ Онлайн: перехват звонков, разбор манипуляций и проверка речи на риск." },
      { property: "og:title", content: "PAUSE · ВТБ Защитник" },
      { property: "og:description", content: "Защита клиентов банка от социальной инженерии с ИИ-скорингом риска." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: App,
});

type Tab = "home" | "check" | "metrics";

function App() {
  const [tab, setTab] = useState<Tab>("home");
  const [open, setOpen] = useState<Incident | null>(null);
  const [blocked, setBlocked] = useState(false);

  return (
    <div className="min-h-screen bg-[image:var(--gradient-page)] flex items-center justify-center p-4 lg:gap-12">
      <aside className="hidden lg:block max-w-sm text-primary-foreground">
        <div className="flex items-center gap-2 text-sm tracking-[0.3em] opacity-70">ВТБ · ЛАБОРАТОРИЯ ИБ</div>
        <h1 className="mt-4 text-5xl font-extrabold leading-tight">PAUSE<br />ВТБ Защитник</h1>
        <p className="mt-4 opacity-80">ИИ ставит разговор на паузу, когда мошенник давит на эмоции: срочность, «безопасный счёт», «следственный комитет», запрос кода.</p>
        <div className="mt-6 flex gap-2">
          {(["home", "check", "metrics"] as Tab[]).map((t) => (
            <button key={t} onClick={() => { setTab(t); setOpen(null); }}
              className={`rounded-full px-4 py-2 text-sm transition ${tab === t ? "bg-primary-foreground text-primary" : "bg-primary-foreground/10 hover:bg-primary-foreground/20"}`}>
              {t === "home" ? "Главная" : t === "check" ? "Проверка" : "Панель ИБ"}
            </button>
          ))}
        </div>
      </aside>

      <div className="relative w-full max-w-[400px] h-[820px] max-h-[calc(100vh-2rem)] rounded-[2.75rem] bg-foreground p-2.5 shadow-[var(--shadow-phone)]">
        <div className="relative h-full w-full overflow-hidden rounded-[2.25rem] bg-background flex flex-col">
          <div className="flex justify-between px-7 pt-3 text-xs font-semibold"><span>12:46</span><span>5G ▮▮▮</span></div>
          <div className="flex-1 overflow-y-auto">
            {open ? <IncidentView inc={open} onBack={() => setOpen(null)} /> :
              tab === "home" ? <HomeView onOpen={setOpen} blocked={blocked} setBlocked={setBlocked} goCheck={() => setTab("check")} /> :
              tab === "check" ? <CheckView /> : <MetricsView />}
          </div>
          <nav className="grid grid-cols-3 border-t bg-card py-2">
            {([["home", Home, "Главная"], ["check", ScanSearch, "Проверка"], ["metrics", BarChart3, "Панель ИБ"]] as const).map(([k, I, l]) => (
              <button key={k} onClick={() => { setTab(k); setOpen(null); }}
                className={`flex flex-col items-center gap-0.5 text-[11px] ${tab === k ? "text-accent" : "text-muted-foreground"}`}>
                <I className="h-5 w-5" />{l}
              </button>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
}

function Badge({ risk, text }: { risk: keyof typeof RISK_META; text?: string }) {
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${RISK_META[risk].cls}`}>{text ?? RISK_META[risk].short}</span>;
}

function HomeView({ onOpen, blocked, setBlocked, goCheck }: { onOpen: (i: Incident) => void; blocked: boolean; setBlocked: (b: boolean) => void; goCheck: () => void }) {
  return (
    <div className="pb-4">
      <div className="mx-4 mt-3 rounded-3xl bg-[image:var(--gradient-hero)] p-5 text-primary-foreground animate-fade-in">
        <div className="flex items-center justify-between">
          <span className="text-xs tracking-widest opacity-75">ВТБ ЗАЩИТНИК</span>
          <span className="flex items-center gap-1.5 text-xs"><span className="h-2 w-2 rounded-full bg-success animate-pulse" />PAUSE активен</span>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary-foreground/15"><ShieldCheck className="h-8 w-8" /></div>
          <div>
            <div className="text-2xl font-bold">{blocked ? "Операции заморожены" : "Под защитой"}</div>
            <div className="text-sm opacity-80">Уровень риска: {blocked ? "блокировка" : "низкий"}</div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
          {[["3", "перехвата"], ["1", "фишинг"], ["24/7", "мониторинг"]].map(([a, b]) => (
            <div key={b} className="rounded-xl bg-primary-foreground/10 py-2"><div className="text-lg font-bold">{a}</div>{b}</div>
          ))}
        </div>
      </div>

      <div className="mx-4 mt-4 grid grid-cols-3 gap-2">
        <Quick icon={Lock} label={blocked ? "Снять блок" : "Экстренная блокировка"} danger={!blocked} onClick={() => setBlocked(!blocked)} />
        <Quick icon={Headphones} label="Поддержка 1000" onClick={() => (window.location.href = "tel:1000")} />
        <Quick icon={UserSearch} label="Проверить контакт" onClick={goCheck} />
      </div>

      <div className="mx-4 mt-5 flex items-baseline justify-between">
        <h2 className="text-lg font-bold">Журнал безопасности</h2>
        <span className="text-xs text-muted-foreground">{INCIDENTS.length} события</span>
      </div>
      <div className="mx-4 mt-2 space-y-2">
        {INCIDENTS.map((i, n) => (
          <button key={i.id} onClick={() => onOpen(i)} style={{ animationDelay: `${n * 60}ms` }}
            className="w-full rounded-2xl border bg-card p-3 text-left transition hover:shadow-md hover:-translate-y-0.5 animate-fade-in">
            <div className="flex gap-3">
              <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${RISK_META[i.risk].cls}`}>
                {i.kind === "call" ? <Phone className="h-5 w-5" /> : <MessageSquare className="h-5 w-5" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex justify-between gap-2"><span className="truncate font-semibold text-sm">{i.title}</span><span className="shrink-0 text-[11px] text-muted-foreground">{i.time}</span></div>
                <div className="text-xs text-muted-foreground">{i.from}</div>
                <div className="mt-1.5"><Badge risk={i.risk} text={i.label} /></div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function Quick({ icon: I, label, onClick, danger }: { icon: typeof Lock; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1.5 rounded-2xl border bg-card p-3 text-center text-[11px] font-medium leading-tight transition hover:bg-secondary active:scale-95">
      <span className={`grid h-9 w-9 place-items-center rounded-full ${danger ? "bg-destructive/10 text-destructive" : "bg-accent/10 text-accent"}`}><I className="h-4.5 w-4.5" /></span>
      {label}
    </button>
  );
}

function Hl({ text }: { text: string }) {
  return <>{highlight(text).map((p, i) => p.hit ? <mark key={i} className="rounded bg-destructive/15 px-0.5 font-semibold text-destructive">{p.t}</mark> : <span key={i}>{p.t}</span>)}</>;
}

function IncidentView({ inc, onBack }: { inc: Incident; onBack: () => void }) {
  const a = analyze(inc.lines.map((l) => l.text).join(" "));
  return (
    <div className="p-4 animate-fade-in">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-accent"><ChevronLeft className="h-4 w-4" />Журнал</button>
      <div className="mt-3 flex items-start justify-between gap-2">
        <div><h2 className="text-xl font-bold">{inc.title}</h2><p className="text-xs text-muted-foreground">{inc.from} · {inc.time}</p></div>
        <ScoreRing score={a.score} risk={a.risk} />
      </div>
      <div className="mt-2"><Badge risk={inc.risk} text={inc.label} /></div>

      <h3 className="mt-5 text-sm font-semibold text-muted-foreground">Транскрипт</h3>
      <div className="mt-2 space-y-2">
        {inc.lines.map((l, i) => (
          <div key={i} className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${l.who === "caller" ? "bg-secondary" : "ml-auto bg-accent text-accent-foreground"}`}>
            <div className="mb-0.5 text-[10px] opacity-60">{l.who === "caller" ? "Звонящий" : "Клиент"}</div>
            {l.who === "caller" ? <Hl text={l.text} /> : l.text}
          </div>
        ))}
      </div>

      {a.triggers.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">{a.triggers.map((t) => <span key={t} className="rounded-full border border-destructive/30 px-2 py-0.5 text-[11px] text-destructive">{t}</span>)}</div>
      )}

      <div className={`mt-4 rounded-2xl p-4 ${inc.risk === "safe" ? "bg-success/10" : "bg-destructive/8"}`}>
        <div className="flex items-center gap-2 font-semibold text-sm">
          {inc.risk === "safe" ? <CheckCircle2 className="h-4 w-4 text-success" /> : <AlertTriangle className="h-4 w-4 text-destructive" />}Вердикт ИИ
        </div>
        <p className="mt-1 text-sm">{inc.verdict}</p>
      </div>
      <div className="mt-3 rounded-2xl border p-4">
        <div className="text-sm font-semibold">Что делать</div>
        <ul className="mt-2 space-y-1.5 text-sm">{inc.advice.map((x, i) => <li key={i} className="flex gap-2"><span className="text-accent font-bold">{i + 1}.</span>{x}</li>)}</ul>
      </div>
    </div>
  );
}

function ScoreRing({ score, risk }: { score: number; risk: "critical" | "phishing" | "safe" }) {
  const color = risk === "critical" ? "var(--destructive)" : risk === "phishing" ? "var(--warning)" : "var(--success)";
  return (
    <div className="relative h-16 w-16 shrink-0">
      <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
        <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--secondary)" strokeWidth="3.5" />
        <circle cx="18" cy="18" r="15.5" fill="none" stroke={color} strokeWidth="3.5" strokeLinecap="round"
          strokeDasharray={`${score * 0.974} 100`} style={{ transition: "stroke-dasharray .5s" }} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-sm font-bold">{score}%</div>
    </div>
  );
}

type SR = { lang: string; continuous: boolean; interimResults: boolean; start(): void; stop(): void; onresult: ((e: any) => void) | null; onend: (() => void) | null; onerror: ((e: any) => void) | null };

function CheckView() {
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const [playing, setPlaying] = useState<number | null>(null);
  const [err, setErr] = useState("");
  const recRef = useRef<SR | null>(null);
  const timer = useRef<number | null>(null);
  const a = analyze(text);

  useEffect(() => () => { recRef.current?.stop(); if (timer.current) clearInterval(timer.current); window.speechSynthesis?.cancel(); }, []);

  const toggleMic = () => {
    if (listening) { recRef.current?.stop(); return; }
    const C = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!C) { setErr("Браузер не поддерживает распознавание речи. Попробуйте Chrome."); return; }
    setErr("");
    const r: SR = new C();
    r.lang = "ru-RU"; r.continuous = true; r.interimResults = true;
    const base = text ? text + " " : "";
    r.onresult = (e) => {
      let s = "";
      for (let i = 0; i < e.results.length; i++) s += e.results[i][0].transcript;
      setText(base + s);
    };
    r.onerror = (e) => setErr(e.error === "not-allowed" ? "Нет доступа к микрофону" : "Ошибка распознавания");
    r.onend = () => setListening(false);
    recRef.current = r; r.start(); setListening(true);
  };

  const playDemo = (i: number) => {
    stopDemo();
    const words = DEMOS[i].text.split(" ");
    setText(""); setPlaying(i);
    try {
      const u = new SpeechSynthesisUtterance(DEMOS[i].text);
      u.lang = "ru-RU"; u.rate = 1.05;
      window.speechSynthesis?.speak(u);
    } catch { /* no audio */ }
    let n = 0;
    timer.current = window.setInterval(() => {
      n++; setText(words.slice(0, n).join(" "));
      if (n >= words.length) { clearInterval(timer.current!); timer.current = null; setPlaying(null); }
    }, 330);
  };
  const stopDemo = () => { if (timer.current) clearInterval(timer.current); timer.current = null; window.speechSynthesis?.cancel(); setPlaying(null); };

  return (
    <div className="p-4 animate-fade-in">
      <h2 className="text-xl font-bold">Проверка на мошенничество</h2>
      <p className="text-xs text-muted-foreground">Произнесите фразу, запустите демо-звонок или вставьте текст</p>

      <div className="mt-4 flex flex-col items-center">
        <button onClick={toggleMic}
          className={`relative grid h-20 w-20 place-items-center rounded-full text-primary-foreground transition active:scale-95 ${listening ? "bg-destructive" : "bg-[image:var(--gradient-hero)]"}`}>
          {listening && <span className="absolute inset-0 rounded-full bg-destructive/40 animate-ping" />}
          {listening ? <MicOff className="relative h-8 w-8" /> : <Mic className="h-8 w-8" />}
        </button>
        <span className="mt-2 text-xs text-muted-foreground">{listening ? "Слушаю… нажмите, чтобы остановить" : "Нажмите и говорите"}</span>
        {err && <span className="mt-1 text-xs text-destructive">{err}</span>}
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {DEMOS.map((d, i) => (
          <button key={i} onClick={() => (playing === i ? stopDemo() : playDemo(i))}
            className="flex shrink-0 items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-xs font-medium hover:bg-secondary">
            {playing === i ? <Square className="h-3 w-3 text-destructive" /> : <Play className="h-3 w-3 text-accent" />}{d.name}
          </button>
        ))}
      </div>

      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} placeholder="Вставьте текст SMS, сообщения или номер карты…"
        className="mt-3 w-full resize-none rounded-2xl border bg-card p-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
      <div className="mt-2 flex gap-2">
        <button onClick={() => setText((t) => t.trim())} className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground">Проверить</button>
        <button onClick={() => { stopDemo(); setText(""); }} className="rounded-xl border px-4 text-sm">Очистить</button>
      </div>

      {text.trim() && (
        <div className="mt-4 rounded-2xl border bg-card p-4 animate-fade-in">
          <div className="flex items-center gap-3">
            <ScoreRing score={a.score} risk={a.risk} />
            <div>
              <Badge risk={a.risk} text={a.risk === "critical" ? "Критический риск" : a.risk === "phishing" ? "Подозрительно" : "Безопасно"} />
              <p className="mt-1 text-xs text-muted-foreground">
                {a.risk === "critical" ? "Положите трубку и позвоните в банк по номеру 1000." : a.risk === "phishing" ? "Есть признаки манипуляции — не совершайте действий." : "Признаков мошенничества не найдено."}
              </p>
            </div>
          </div>
          <div className="mt-3 rounded-xl bg-secondary p-3 text-sm leading-relaxed"><Hl text={text} /></div>
          {a.triggers.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{a.triggers.map((t) => <span key={t} className="rounded-full border border-destructive/30 px-2 py-0.5 text-[11px] text-destructive">{t}</span>)}</div>}
        </div>
      )}
    </div>
  );
}

function MetricsView() {
  const patterns = [["«Безопасный счёт»", 38], ["Звонок «из ЦБ»", 27], ["Запрос кода из SMS", 19], ["Силовые структуры", 11], ["Удалённый доступ", 5]] as const;
  return (
    <div className="p-4 animate-fade-in">
      <div className="flex items-center gap-2"><Shield className="h-5 w-5 text-accent" /><h2 className="text-xl font-bold">Панель ИБ</h2></div>
      <p className="text-xs text-muted-foreground">Сводка для жюри · последние 30 дней</p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {[["12 480", "звонков проанализировано"], ["1 932", "атак перехвачено"], ["96,4%", "точность скоринга"], ["1,8%", "ложных срабатываний"], ["0,7 с", "время реакции"], ["₽ 214 млн", "сохранено клиентам"]].map(([v, l]) => (
          <div key={l} className="rounded-2xl border bg-card p-3"><div className="text-xl font-extrabold text-primary">{v}</div><div className="text-[11px] text-muted-foreground">{l}</div></div>
        ))}
      </div>
      <h3 className="mt-5 text-sm font-semibold">Обнаруженные паттерны</h3>
      <div className="mt-2 space-y-2.5">
        {patterns.map(([n, p]) => (
          <div key={n}>
            <div className="flex justify-between text-xs"><span>{n}</span><span className="font-semibold">{p}%</span></div>
            <div className="mt-1 h-2 rounded-full bg-secondary"><div className="h-2 rounded-full bg-[image:var(--gradient-hero)]" style={{ width: `${p * 2.4}%` }} /></div>
          </div>
        ))}
      </div>
      <h3 className="mt-5 text-sm font-semibold">Атаки по дням недели</h3>
      <div className="mt-2 flex h-28 items-end gap-2">
        {[42, 58, 51, 66, 80, 34, 28].map((v, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-1">
            <div className="w-full rounded-t-md bg-accent/80" style={{ height: `${v}%` }} />
            <span className="text-[10px] text-muted-foreground">{"ПнВтСрЧтПтСбВс".slice(i * 2, i * 2 + 2)}</span>
          </div>
        ))}
      </div>
      <p className="mt-4 text-[11px] text-muted-foreground">Демонстрационные данные. Скоринг — взвешенная модель триггеров социальной инженерии.</p>
    </div>
  );
}
