/// <reference path="./types.d.ts" />
//
// Notification dispatcher — unifies what the upstream Node stack had as
// mail/, telegram/, telegram-bot/, gmail/, notification/ pods. One
// handler, one Goja goroutine per request, no microservices.
//
// Channels (email/sms/push/slack/discord/telegram) are configured per
// org in IAM. team-go fans out to the right provider via env-mapped
// API keys; payload contracts match Hanzo Insights' notify spec so
// downstream analytics is consistent.

interface NotifyRequest {
  channel:   "email" | "sms" | "push" | "telegram" | "slack" | "discord";
  to:        string;
  subject?:  string;
  body:      string;
  template?: string;
  vars?:     Record<string, string | number | boolean>;
}

routerAdd("POST", "/v1/notify", (e) => {
  if (!e.auth) {
    return e.json(401, { error: "auth required" });
  }
  const req = e.requestInfo().body as NotifyRequest;
  if (!req?.channel || !req?.to || !req?.body) {
    return e.json(400, { error: "channel, to, body required" });
  }

  switch (req.channel) {
    case "email":    return sendEmail(e, req);
    case "telegram": return sendTelegram(e, req);
    case "slack":
    case "discord":
    case "sms":
    case "push":     return e.json(501, { error: `${req.channel} not yet ported` });
    default:         return e.json(400, { error: `unknown channel ${req.channel}` });
  }
});

function sendEmail(e: any, req: NotifyRequest) {
  const smtp = {
    host: $os.getenv("SMTP_HOST"),
    port: parseInt($os.getenv("SMTP_PORT") || "587", 10),
    user: $os.getenv("SMTP_USER"),
    pass: $os.getenv("SMTP_PASS"),
    from: $os.getenv("SMTP_FROM") || "no-reply@hanzo.team",
  };
  if (!smtp.host) {
    return e.json(503, { error: "SMTP_HOST not configured" });
  }
  $app.newMailClient().send(new MailerMessage({
    from:    { address: smtp.from, name: "Hanzo Team" },
    to:      [{ address: req.to }],
    subject: req.subject || "",
    html:    req.body,
  }));
  return e.json(200, { ok: true });
}

function sendTelegram(e: any, req: NotifyRequest) {
  const token = $os.getenv("TELEGRAM_BOT_TOKEN");
  if (!token) {
    return e.json(503, { error: "TELEGRAM_BOT_TOKEN not configured" });
  }
  const res = $http.send({
    method: "POST",
    url:    `https://api.telegram.org/bot${token}/sendMessage`,
    body:   JSON.stringify({ chat_id: req.to, text: req.body, parse_mode: "HTML" }),
    headers: { "Content-Type": "application/json" },
    timeout: 10,
  });
  if (res.statusCode >= 400) {
    return e.json(res.statusCode, { error: "telegram upstream", upstream: res.body });
  }
  return e.json(200, { ok: true });
}
