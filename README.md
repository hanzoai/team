# Hanzo Team

The tracker and the workspace, on `@hanzo/gui` + `@hanzo/ui`, over the team
backend at `api.hanzo.ai/v1/team`.

```
pnpm install
pnpm dev
```

Regions, and who owns which:

| directory | region |
|---|---|
| `src/shell` | the four regions, the rail, the navigator frame, the aside |
| `src/nav` | the tracker's navigator: the standing rows and the projects tree |
| `src/tracker` | the head — trail, title, views, filter — and the board under it |
| `src/inbox` | the notification panel's contents |
| `src/chat` | the channel surface |
| `src/bots` | the Bots surface: @hanzo/app's Bots, the app hanzo.bot draws |

`src/shell/surfaces.ts` is the one declaration of what the product contains: a
surface is one entry there and is thereafter a rail icon, a navigator and a set
of addresses.

Published at `team2.hanzo.app`; `hanzo.yml` declares the build and the slug.
Any screen can be entered in a named state — `?state=realistic` and its four
siblings stand in for the whole plane, the door included.
