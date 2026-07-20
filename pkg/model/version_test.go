package model

import (
	"fmt"
	"testing"
)

// TestDefaultIsFrontVersion pins the code default to the front SPA's model
// version, so a fresh binary is in sync with the front with no env override.
func TestDefaultIsFrontVersion(t *testing.T) {
	if DefaultVersion != "0.6.0" {
		t.Fatalf("DefaultVersion = %q, want 0.6.0", DefaultVersion)
	}
	if got := Version(); got != "0.6.0" {
		t.Fatalf("Version() = %q, want 0.6.0", got)
	}
}

// TestParseDefault proves the numeric triple the workspace handshake needs
// matches the default string — 0.6.0 → 0/6/0.
func TestParseDefault(t *testing.T) {
	if Major() != 0 || Minor() != 6 || Patch() != 0 {
		t.Fatalf("parse = %d.%d.%d, want 0.6.0", Major(), Minor(), Patch())
	}
}

// TestEnvOverride proves MODEL_VERSION overrides both the string and the
// parsed triple — one source, both surfaces track it.
func TestEnvOverride(t *testing.T) {
	t.Setenv("MODEL_VERSION", "1.2.3")
	if got := Version(); got != "1.2.3" {
		t.Fatalf("Version() = %q, want 1.2.3", got)
	}
	if Major() != 1 || Minor() != 2 || Patch() != 3 {
		t.Fatalf("parse = %d.%d.%d, want 1.2.3", Major(), Minor(), Patch())
	}
}

// TestNoDrift is the core invariant: the parsed triple always re-serializes to
// Version() — the workspace-model version and the string server version are the
// SAME number, never drifting.
func TestNoDrift(t *testing.T) {
	for _, v := range []string{"0.6.0", "0.7.0", "1.10.5"} {
		t.Setenv("MODEL_VERSION", v)
		if got := fmt.Sprintf("%d.%d.%d", Major(), Minor(), Patch()); got != v {
			t.Fatalf("triple %q != Version() %q", got, v)
		}
	}
}

// TestMalformedDegrades proves a bad override degrades to 0 components rather
// than panicking.
func TestMalformedDegrades(t *testing.T) {
	t.Setenv("MODEL_VERSION", "not-a-version")
	if Major() != 0 || Minor() != 0 || Patch() != 0 {
		t.Fatalf("malformed parse = %d.%d.%d, want 0.0.0", Major(), Minor(), Patch())
	}
}
