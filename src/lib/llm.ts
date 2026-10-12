import { analyze, type Risk } from "@/lib/pause";

export type AnalysisResult = {
  score: number;
  risk: Risk;
  triggers: string[];
  advice: string[];
  mode: "ai" | "local";
  masked?: string;
};

const LLM_URL = (import.meta.env['VITE_LLM_URL'] as string | undefined)?.trim() || "";
const LLM_KEY = (import.meta.env['VITE_LLM_API_KEY'] as string | undefined)?.trim() || "";
const LLM_MODEL = (import.meta.env['VITE_LLM_MODEL'] as string | undefined)?.trim() || "gpt-4o-mini";
const TIMEOUT_MS = 12000;

export const llmConfigured = Boolean(LLM_URL);

/** Маскирование персональных данных перед отправкой в модель (152-ФЗ). */
export function maskPII(text: string): string {
  return text
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "[EMAIL]")
    .replace(/\b\d{20}\b|\b(?:\d{4}[ -]?){4}\d{4}\b/g, "[СЧЁТ]")
    .replace(/\b(?:\d[ -]?){15,18}\d\b/g, "[КАРТА]")
    .replace(/(?:\+7|\b8)[\s(-]*\d{3}[\s)-]*\d{3}[\s-]*\d{2}[\s-]*\d{2}\b/g, "[ТЕЛЕФОН]")
    .replace(/\b\d{4}\s?\d{6}\b/g, "[ПАСПОРТ]")
    .replace(/\b\d{3}-\d{3}-\d{3}\s?\d{2}\b/g, "[СНИЛС]")
    .replace(/\b[А-ЯЁ][а-яё]+(?:ов|ев|ин|ын|ский|цкий|ова|ева|ина|ына|ская|цкая)\s+[А-ЯЁ][а-яё]+(?:\s+[А-ЯЁ][а-яё]+(?:вич|вна|ична|чна))?\b/g, "[ФИО]")
    .replace(/\b[А-ЯЁ][а-яё]+\s+[А-ЯЁ][а-яё]+(?:ович|евич|ич|овна|евна|ична|инична)\b/g, "[ФИО]")
    .replace(/\b(?:код|пароль|cvv|cvc)\D{0,10}\d{3,6}\b/gi, (m) => m.replace(/\d/g, "•"));
}

export const SYSTEM_PROMPT = `Ты — антифрод-аналитик банка ВТБ. Анализируй текст звонка, SMS или сообщения на признаки социальной инженерии и мошенничества.
Ищи: давление срочностью, запугивание, ссылки на ЦБ/полицию/ФСБ/службу безопасности, «безопасный счёт», запрос кодов из SMS/CVV/паролей, требование перевода или снятия наличных, установку приложений удалённого доступа, изоляцию жертвы («никому не говорите»), подозрительные ссылки, обещания выгоды.
Персональные данные заменены плейсхолдерами вида [ТЕЛЕФОН], [КАРТА], [СЧЁТ], [ФИО] — не пытайся их восстановить.
Ответь СТРОГО JSON без пояснений:
{"risk":"safe"|"phishing"|"critical","score":0-100,"triggers":["краткие названия найденных приёмов на русском"],"advice":["2-4 конкретные рекомендации клиенту на русском"]}
critical — явная мошенническая схема или требование кода/перевода; phishing — признаки манипуляции; safe — признаков нет.`;

function localAdvice(risk: Risk): string[] {
  if (risk === "critical") return ["Положите трубку.", "Не называйте коды и не переводите деньги.", "Позвоните в банк по номеру 1000."];
  if (risk === "phishing") return ["Не переходите по ссылкам и не совершайте действий.", "Проверьте информацию через официальное приложение."];
  return ["Признаков мошенничества не найдено."];
}

export function localAnalyze(text: string): AnalysisResult {
  const a = analyze(text);
  return { ...a, advice: localAdvice(a.risk), mode: "local" };
}

function endpoint(url: string) {
  const u = url.replace(/\/+$/, "");
  if (u.endsWith("/chat/completions")) return u;
  return u.endsWith("/v1") ? `${u}/chat/completions` : `${u}/v1/chat/completions`;
}

function parse(content: string) {
  const m = content.match(/\{[\s\S]*\}/);
  if (!m) throw new Error("no json");
  const j = JSON.parse(m[0]);
  const risk: Risk = ["safe", "phishing", "critical"].includes(j.risk) ? j.risk : "safe";
  const score = Math.max(0, Math.min(100, Math.round(Number(j.score) || 0)));
  const arr = (x: unknown) => (Array.isArray(x) ? x.filter((s) => typeof s === "string").slice(0, 8) : []);
  return { risk, score, triggers: arr(j.triggers), advice: arr(j.advice) };
}

/** Глубокий анализ через LLM с автоматическим откатом на локальный эвристический фильтр. */
export async function analyzeDeep(text: string, signal?: AbortSignal): Promise<AnalysisResult> {
  if (!llmConfigured || !text.trim()) return localAnalyze(text);
  const masked = maskPII(text);
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  signal?.addEventListener("abort", () => ctrl.abort());
  try {
    const res = await fetch(endpoint(LLM_URL), {
      method: "POST",
      signal: ctrl.signal,
      headers: { "Content-Type": "application/json", ...(LLM_KEY ? { Authorization: `Bearer ${LLM_KEY}` } : {}) },
      body: JSON.stringify({
        model: LLM_MODEL,
        messages: [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: masked }],
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const r = parse(String(data?.choices?.[0]?.message?.content ?? ""));
    return { ...r, advice: r.advice.length ? r.advice : localAdvice(r.risk), mode: "ai", masked };
  } catch {
    return { ...localAnalyze(text), masked };
  } finally {
    clearTimeout(t);
  }
}
