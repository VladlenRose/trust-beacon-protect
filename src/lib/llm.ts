import { analyze, type Risk } from "@/lib/pause";
import { groqAnalyze } from "@/lib/groq.functions";

export type AnalysisResult = {
  score: number;
  risk: Risk;
  triggers: string[];
  advice: string[];
  mode: "ai" | "local";
  model?: string;
  fallbackReason?: "not_configured" | "unavailable";
  masked?: string;
};



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

function localAdvice(risk: Risk): string[] {
  if (risk === "critical") return ["Положите трубку.", "Не называйте коды и не переводите деньги.", "Позвоните в банк по номеру 1000."];
  if (risk === "phishing") return ["Не переходите по ссылкам и не совершайте действий.", "Проверьте информацию через официальное приложение."];
  return ["Признаков мошенничества не найдено."];
}

export function localAnalyze(text: string): AnalysisResult {
  const a = analyze(text);
  return { ...a, advice: localAdvice(a.risk), mode: "local" };
}

/** Глубокий анализ через Groq (серверная функция) с откатом на локальный эвристический фильтр. */
export async function analyzeDeep(text: string): Promise<AnalysisResult> {
  if (!text.trim()) return localAnalyze(text);
  const masked = maskPII(text);
  try {
    const r = await groqAnalyze({ data: { text: masked } });
    if (r.ok) return { score: r.score, risk: r.risk, triggers: r.triggers, advice: r.advice.length ? r.advice : localAdvice(r.risk), mode: "ai", model: r.model, masked };
    return { ...localAnalyze(text), masked, fallbackReason: r.reason };
  } catch {
    return { ...localAnalyze(text), masked, fallbackReason: "unavailable" };
  }
}
