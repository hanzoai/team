// Package model owns the Huly platform MODEL version — the single number the
// front SPA handshakes against.
//
// This is DISTINCT from TEAM_VERSION (team-go's own release/commit, surfaced on
// /v1/health and Prometheus). Two concepts that were previously conflated:
//
//   - TEAM_VERSION  — the running binary's release identity (health, metrics).
//   - MODEL_VERSION — the Huly model the front validates against (transactor
//     hello's serverVersion + each workspace's versionMajor/Minor/Patch).
//
// Both places that answer the front's model-version handshake read from HERE,
// so serverVersion and the per-workspace version can never drift: one source,
// one number, parsed one way.
package model

import (
	"os"
	"strconv"
	"strings"
)

// DefaultVersion is the front SPA's current model version. Shipping it as the
// code default keeps the binary in sync with the front with no configuration —
// HULY_MODEL_VERSION exists only to fast-track a front bump ahead of a team-go
// release.
const DefaultVersion = "0.6.0"

// Version is the Huly MODEL version string (e.g. "0.6.0"), overridable via
// HULY_MODEL_VERSION.
func Version() string {
	if v := os.Getenv("HULY_MODEL_VERSION"); v != "" {
		return v
	}
	return DefaultVersion
}

// Major, Minor and Patch are Version parsed into its numeric components — the
// shape the workspace-info handshake needs. A missing or non-numeric component
// reads as 0, so a malformed override degrades to 0.0.0 rather than panicking.
func Major() int { return part(0) }
func Minor() int { return part(1) }
func Patch() int { return part(2) }

func part(i int) int {
	segs := strings.SplitN(Version(), ".", 3)
	if i >= len(segs) {
		return 0
	}
	n, _ := strconv.Atoi(strings.TrimSpace(segs[i]))
	return n
}
