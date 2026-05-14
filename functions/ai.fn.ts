/// <reference path="./types.d.ts" />
//
// AI assistant — formerly the `ai-bot` + `love-agent` pods in the Huly
// Node stack. Now runs inside Goja, one goroutine per request, served
// by the team binary on /api/ai/*.
//
// Real chat + tool calling is delegated to hanzo.bot via
// pkg/bot/bot.go (/api/bot/*). This handler is a small helper that
// the Huly Svelte UI calls for inline "explain" / "summarize" actions
// where we want a single completion, not a streaming chat.

routerAdd("POST", "/api/ai/complete", (e) => {
  // platform plugin already validated the JWT; e.auth is set.
  if (!e.auth) {
    return e.json(401, { error: "auth required" });
  }
  const body = e.requestInfo().body as { prompt?: string; model?: string };
  if (!body?.prompt) {
    return e.json(400, { error: "prompt required" });
  }

  const endpoint = $os.getenv("LLM_GATEWAY_URL") || "https://api.hanzo.ai/v1";
  const apiKey   = $os.getenv("HANZO_API_KEY");
  if (!apiKey) {
    return e.json(503, { error: "LLM_GATEWAY not configured" });
  }

  // Talk to the Hanzo LLM Gateway (api.hanzo.ai/v1/chat/completions)
  // using the request's owner as the billing tenant header.
  const owner = e.auth.get("owner") || "";
  const res = $http.send({
    method: "POST",
    url: `${endpoint}/chat/completions`,
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "X-Org-Id":      owner,
      "X-User-Id":     e.auth.id,
      "Content-Type":  "application/json",
    },
    body: JSON.stringify({
      model:    body.model || "zen",
      messages: [{ role: "user", content: body.prompt }],
      max_tokens: 512,
    }),
    timeout: 30,
  });

  if (res.statusCode >= 400) {
    return e.json(res.statusCode, { error: "llm upstream error", upstream: res.body });
  }
  return e.json(200, JSON.parse(res.body));
});
