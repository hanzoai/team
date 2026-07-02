package bots

import (
	"sort"
	"testing"
)

func TestReconcile_AddNewEnabled(t *testing.T) {
	desired := []ServiceAccount{
		{ID: "sa1"}, {ID: "sa2"},
	}
	plan := reconcile(desired, map[string]bool{})
	ids := saIDs(plan.toAdd)
	if len(ids) != 2 || ids[0] != "sa1" || ids[1] != "sa2" {
		t.Fatalf("expected sa1,sa2 to add, got %v", ids)
	}
	if len(plan.toRemove) != 0 {
		t.Fatalf("expected no removals, got %v", plan.toRemove)
	}
}

func TestReconcile_SkipDisabled(t *testing.T) {
	desired := []ServiceAccount{
		{ID: "sa1"}, {ID: "sa2", Disabled: true},
	}
	plan := reconcile(desired, map[string]bool{})
	if len(plan.toAdd) != 1 || plan.toAdd[0].ID != "sa1" {
		t.Fatalf("disabled SA should not be added: %v", saIDs(plan.toAdd))
	}
}

func TestReconcile_RemoveVanishedAndDisabled(t *testing.T) {
	// current: sa1 (still desired), sa2 (disabled now), sa3 (gone from IAM)
	desired := []ServiceAccount{
		{ID: "sa1"},
		{ID: "sa2", Disabled: true},
	}
	current := map[string]bool{"sa1": true, "sa2": true, "sa3": true}
	plan := reconcile(desired, current)
	if len(plan.toAdd) != 0 {
		t.Fatalf("nothing to add, got %v", saIDs(plan.toAdd))
	}
	rm := plan.toRemove
	sort.Strings(rm)
	if len(rm) != 2 || rm[0] != "sa2" || rm[1] != "sa3" {
		t.Fatalf("expected sa2,sa3 removed, got %v", rm)
	}
}

func TestReconcile_NoopIdempotent(t *testing.T) {
	desired := []ServiceAccount{{ID: "sa1"}, {ID: "sa2"}}
	current := map[string]bool{"sa1": true, "sa2": true}
	plan := reconcile(desired, current)
	if len(plan.toAdd) != 0 || len(plan.toRemove) != 0 {
		t.Fatalf("steady state should be a no-op: add=%v remove=%v", saIDs(plan.toAdd), plan.toRemove)
	}
}

func TestAccountUUID_Deterministic(t *testing.T) {
	// The SAME SA id always yields the SAME account uuid (no dupes on re-sync).
	a := accountUUID("sa-xyz")
	b := accountUUID("sa-xyz")
	if a != b {
		t.Fatalf("accountUUID not deterministic: %s != %s", a, b)
	}
	// Different SA ids yield different uuids.
	if accountUUID("sa-1") == accountUUID("sa-2") {
		t.Fatal("distinct SAs collided to same account uuid")
	}
	// It's a valid v5 uuid derived from iam:sa:<id>.
	if len(a) != 36 {
		t.Fatalf("not a uuid: %q", a)
	}
}

func TestSocialValue(t *testing.T) {
	if socialValue("abc") != "iam:sa:abc" {
		t.Fatalf("social value format changed: %q", socialValue("abc"))
	}
}

func TestNameAndDisplay(t *testing.T) {
	first, last := nameParts(ServiceAccount{Name: "hanzo-triage"})
	if first != "hanzo" || last != "triage" {
		t.Fatalf("<org>-<agent> split wrong: %q %q", first, last)
	}
	// No dash → last defaults to "bot".
	f2, l2 := nameParts(ServiceAccount{Name: "solo"})
	if f2 != "solo" || l2 != "bot" {
		t.Fatalf("no-dash fallback wrong: %q %q", f2, l2)
	}
	// displayName returns the SA's own name when no displayName is set.
	if displayName(ServiceAccount{Name: "hanzo-triage"}) != "hanzo-triage" {
		t.Fatalf("display name wrong: %q", displayName(ServiceAccount{Name: "hanzo-triage"}))
	}
	// displayName prefers the displayName field.
	if displayName(ServiceAccount{Name: "x-y", DisplayName: "Nice Bot"}) != "Nice Bot" {
		t.Fatal("displayName field not preferred")
	}
	// Falls back to id when both are empty.
	if displayName(ServiceAccount{ID: "sa-1"}) != "sa-1" {
		t.Fatal("id fallback wrong")
	}
}

func saIDs(sas []ServiceAccount) []string {
	out := make([]string, len(sas))
	for i, s := range sas {
		out[i] = s.ID
	}
	return out
}
