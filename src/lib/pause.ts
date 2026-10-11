export type Risk = "critical" | "phishing" | "safe";

export const TRIGGERS: { re: RegExp; label: string; weight: number }[] = [
  { re: /срочн\w*|немедленно|прямо сейчас|быстрее/gi, label: "Давление срочностью", weight: 18 },
  { re: /безопасн\w* сч[её]т\w*/gi, label: "«Безопасный счёт»", weight: 35 },
  { re: /центральн\w* банк\w*|\bЦБ\b/gi, label: "Имя регулятора", weight: 15 },
  { re: /следственн\w* комитет\w*|ФСБ|полици\w*|прокуратур\w*/gi, label: "Силовые структуры", weight: 25 },
  { re: /назовите код|код из смс|код из sms|продиктуйте\w*|cvv|cvc/gi, label: "Запрос кода", weight: 40 },
  { re: /никому не говорите|не сообщайте родственникам|тайн\w* следствия/gi, label: "Изоляция жертвы", weight: 25 },
  { re: /мошенни\w* оформил\w*|кредит на ваше имя|взлом\w*/gi, label: "Легенда угрозы", weight: 20 },
  { re: /переведите|перевод\w*|снимите наличн\w*/gi, label: "Требование перевода", weight: 18 },
  { re: /установите|приложени\w* поддержк\w*|anydesk|rustdesk/gi, label: "Удалённый доступ", weight: 30 },
  { re: /https?:\/\/\S+|bit\.ly\S*/gi, label: "Подозрительная ссылка", weight: 22 },
  { re: /\b(?:\d[ -]?){16}\b/g, label: "Номер карты в тексте", weight: 20 },
];

export function analyze(text: string) {
  const found = new Map<string, number>();
  let score = 0;
  for (const t of TRIGGERS) {
    const m = text.match(t.re);
    if (m) {
      found.set(t.label, m.length);
      score += t.weight + (m.length - 1) * 5;
    }
  }
  score = Math.min(99, score);
  const risk: Risk = score >= 50 ? "critical" : score >= 20 ? "phishing" : "safe";
  return { score, risk, triggers: [...found.keys()] };
}

export function highlight(text: string): { t: string; hit: boolean }[] {
  const ranges: [number, number][] = [];
  for (const tr of TRIGGERS) {
    for (const m of text.matchAll(new RegExp(tr.re.source, tr.re.flags))) {
      ranges.push([m.index!, m.index! + m[0].length]);
    }
  }
  ranges.sort((a, b) => a[0] - b[0]);
  const out: { t: string; hit: boolean }[] = [];
  let i = 0;
  for (const [s, e] of ranges) {
    if (s < i) continue;
    if (s > i) out.push({ t: text.slice(i, s), hit: false });
    out.push({ t: text.slice(s, e), hit: true });
    i = e;
  }
  if (i < text.length) out.push({ t: text.slice(i), hit: false });
  return out;
}

export type Line = { who: "caller" | "client"; text: string };
export type Incident = {
  id: string;
  kind: "call" | "sms";
  title: string;
  from: string;
  time: string;
  risk: Risk;
  label: string;
  lines: Line[];
  verdict: string;
  advice: string[];
};

export const INCIDENTS: Incident[] = [
  {
    id: "1", kind: "call", title: "«Служба безопасности ЦБ»", from: "+7 495 ••• 42 17", time: "Сегодня, 12:14",
    risk: "critical", label: "Критический риск: психологическое давление",
    lines: [
      { who: "caller", text: "Здравствуйте, это служба безопасности Центрального банка. На ваше имя мошенники оформили кредит." },
      { who: "client", text: "Как это? Я ничего не оформляла." },
      { who: "caller", text: "Действовать нужно срочно. Ваши средства необходимо перевести на безопасный счёт ЦБ." },
      { who: "caller", text: "С вами также свяжется следственный комитет. Никому не говорите, это тайна следствия." },
      { who: "caller", text: "Сейчас придёт СМС — назовите код для подтверждения." },
    ],
    verdict: "Мошенничество. ЦБ не обслуживает счета граждан и никогда не звонит клиентам. «Безопасных счетов» не существует.",
    advice: ["Положите трубку — PAUSE уже прервал звонок", "Никому не сообщайте коды из СМС", "Перезвоните в ВТБ по номеру 1000 на карте", "Предупредите близких о схеме"],
  },
  {
    id: "2", kind: "sms", title: "SMS: «Карта заблокирована»", from: "VTB-Info (подмена)", time: "Сегодня, 09:41",
    risk: "phishing", label: "Фишинг",
    lines: [{ who: "caller", text: "Ваша карта заблокирована. Срочно подтвердите данные: http://vtb-secure-help.ru/login" }],
    verdict: "Фишинговая ссылка на поддельный домен. Официальные сообщения ВТБ не содержат ссылок для ввода данных карты.",
    advice: ["Не переходите по ссылке", "Проверьте статус карты в приложении", "Удалите сообщение"],
  },
  {
    id: "3", kind: "call", title: "Курьер СДЭК", from: "+7 800 250 ••••", time: "Вчера, 18:02",
    risk: "safe", label: "Безопасно",
    lines: [
      { who: "caller", text: "Добрый день, курьер. Буду у вас через двадцать минут с посылкой, удобно?" },
      { who: "client", text: "Да, жду, спасибо." },
    ],
    verdict: "Штатный звонок. Признаков манипуляции не обнаружено, номер в реестре доверенных служб.",
    advice: ["Никаких действий не требуется"],
  },
  {
    id: "4", kind: "call", title: "«Полиция, отдел киберпреступлений»", from: "+7 925 ••• 03 88", time: "Вчера, 14:30",
    risk: "critical", label: "Критический риск: удалённый доступ",
    lines: [
      { who: "caller", text: "Это полиция. Ваш аккаунт пытались взломать." },
      { who: "caller", text: "Установите приложение поддержки AnyDesk, мы проверим телефон немедленно." },
    ],
    verdict: "Мошенничество. Полиция не просит устанавливать программы удалённого доступа.",
    advice: ["Не устанавливайте приложения по просьбе звонящих", "Удалите AnyDesk, если установили", "Обратитесь в отделение лично"],
  },
];

export const DEMOS = [
  { name: "Звонок «из ЦБ»", text: "Здравствуйте, служба безопасности Центрального банка. Срочно переведите средства на безопасный счёт, иначе их спишут. Назовите код из смс." },
  { name: "«Следователь»", text: "Говорит следственный комитет. Вы проходите свидетелем. Никому не говорите о разговоре и снимите наличные прямо сейчас." },
  { name: "Обычный звонок", text: "Привет, это Маша. Встречаемся в семь у кафе, не опаздывай." },
];

export const RISK_META: Record<Risk, { cls: string; short: string }> = {
  critical: { cls: "bg-destructive/10 text-destructive", short: "Критический" },
  phishing: { cls: "bg-warning/15 text-warning-foreground", short: "Фишинг" },
  safe: { cls: "bg-success/12 text-success", short: "Безопасно" },
};
