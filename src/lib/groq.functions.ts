import { createServerFn } from "@tanstack/react-start";

const SYSTEM_PROMPT = `Ты — антифрод-аналитик банка ВТБ. Оцени текст звонка, SMS или сообщения на признаки социальной инженерии по СМЫСЛУ и КОНТЕКСТУ, а не по ключевым словам: учитывай синонимы, перефразирования, завуалированные формулировки, опечатки, сленг и смешение языков.
Ищи: давление срочностью и страхом, выдачу себя за банк/ЦБ/полицию/ФСБ/госорганы/родственников, «безопасный» или «резервный» счёт, запрос кодов, паролей, CVV, данных карты, требование перевода, снятия наличных, оформления кредита, установку приложений удалённого доступа, изоляцию жертвы, подозрительные ссылки, обещания выгоды или выплат.
Персональные данные заменены плейсхолдерами вида [ТЕЛЕФОН], [КАРТА], [СЧЁТ], [ФИО] — не пытайся их восстановить.
Ответь СТРОГО одним JSON-объектом:
{"risk":"safe"|"phishing"|"critical","score":0-100,"triggers":["краткие названия найденных приёмов на русском"],"advice":["2-4 конкретные рекомендации клиенту на русском"]}
critical — явная мошенническая схема или требование кода/перевода; phishing — признаки манипуляции; safe — признаков нет.`;

type Out =
  | { ok: true; risk: "safe" | "phishing" | "critical"; score: number; triggers: string[]; advice: string[]; model: string }
  | { ok: false; reason: "not_configured" | "unavailable" };

export const groqAnalyze = createServerFn({ method: "POST" })
  .inputValidator((d: { text: string }) => {
    if (typeof d?.text !== "string" || !d.text.trim()) throw new Error("empty");
    return { text: d.text.slice(0, 4000) };
  })
  .handler(async ({ data }): Promise<Out> => {
    const key = process.env["GROQ_API_KEY"];
    if (!key) return { ok: false, reason: "not_configured" };
    const model = process.env["GROQ_MODEL"] || "llama-3.3-70b-versatile";
    const base = (process.env["GROQ_BASE_URL"] || "https://api.groq.com/openai/v1").replace(/\/+$/, "");
    try {
      const res = await fetch(`${base}/chat/completions`, {
        method: "POST",
        signal: AbortSignal.timeout(15000),
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model,
          temperature: 0.1,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: `Проанализируй текст и верни json:\n\n${data.text}` },
          ],
        }),
      });
      if (!res.ok) {
        console.error("Groq error", res.status, (await res.text()).slice(0, 300));
        return { ok: false, reason: "unavailable" };
      }
      const j = await res.json();
      const p = JSON.parse(String(j?.choices?.[0]?.message?.content ?? "{}"));
      const risk = ["safe", "phishing", "critical"].includes(p.risk) ? p.risk : "safe";
      const arr = (x: unknown) => (Array.isArray(x) ? x.filter((s): s is string => typeof s === "string").slice(0, 8) : []);
      return { ok: true, risk, score: Math.max(0, Math.min(100, Math.round(Number(p.score) || 0))), triggers: arr(p.triggers), advice: arr(p.advice), model };
    } catch (e) {
      console.error("Groq request failed", e);
      return { ok: false, reason: "unavailable" };
    }
  });
