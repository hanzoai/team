package transactor

import (
	"encoding/json"
	"testing"
)

// newTestSession wires a session onto a fresh per-workspace store + the real
// embedded model hierarchy.
func newTestSession(t *testing.T) *session {
	t.Helper()
	return &session{
		server:    &server{hub: newHub()},
		store:     newStore(t.TempDir()),
		hier:      buildHierarchy(modelJSON),
		org:       "test-org",
		workspace: "ws-test",
		account:   "acc-test",
	}
}

func TestPersistenceCRUD(t *testing.T) {
	s := newTestSession(t)

	// create a tracker Project
	s.applyTx(json.RawMessage(`{"_class":"core:class:TxCreateDoc","objectId":"proj1",
		"objectClass":"tracker:class:Project","objectSpace":"core:space:Space",
		"modifiedBy":"acc-test","modifiedOn":1,
		"attributes":{"name":"My Project","identifier":"TSK","sequence":0}}`))

	if docs := s.queryDocs("tracker:class:Project", nil); len(docs) != 1 {
		t.Fatalf("create: want 1 project, got %d", len(docs))
	} else if docs[0]["name"] != "My Project" {
		t.Fatalf("create: name=%v", docs[0]["name"])
	}

	// hierarchy: a Project IS a Space IS a Doc — findAll by ancestor must find it
	if docs := s.queryDocs("core:class:Space", nil); len(docs) != 1 {
		t.Fatalf("hierarchy(Space): want 1, got %d", len(docs))
	}
	if docs := s.queryDocs("core:class:Doc", map[string]any{"_id": "proj1"}); len(docs) != 1 {
		t.Fatalf("hierarchy(Doc) by _id: want 1, got %d", len(docs))
	}

	// query by field + predicate
	if docs := s.queryDocs("tracker:class:Project", map[string]any{"identifier": "TSK"}); len(docs) != 1 {
		t.Fatalf("query identifier: want 1, got %d", len(docs))
	}
	if docs := s.queryDocs("tracker:class:Project", map[string]any{"sequence": map[string]any{"$gte": float64(0)}}); len(docs) != 1 {
		t.Fatalf("query $gte: want 1, got %d", len(docs))
	}

	// update — operator + plain set
	s.applyTx(json.RawMessage(`{"_class":"core:class:TxUpdateDoc","objectId":"proj1",
		"objectClass":"tracker:class:Project","modifiedBy":"acc-test","modifiedOn":2,
		"operations":{"name":"Renamed","$inc":{"sequence":1}}}`))
	docs := s.queryDocs("tracker:class:Project", nil)
	if docs[0]["name"] != "Renamed" {
		t.Fatalf("update set: name=%v", docs[0]["name"])
	}
	if seq, _ := asFloat(docs[0]["sequence"]); seq != 1 {
		t.Fatalf("update $inc: sequence=%v", docs[0]["sequence"])
	}

	// persistence across a fresh store handle (simulates reconnect/reload)
	s2 := &session{server: s.server, store: newStore(s.store.dir), hier: s.hier, org: s.org, workspace: s.workspace, account: s.account}
	if docs := s2.queryDocs("tracker:class:Project", nil); len(docs) != 1 {
		t.Fatalf("reload: want 1 persisted project, got %d", len(docs))
	}

	// remove
	s.applyTx(json.RawMessage(`{"_class":"core:class:TxRemoveDoc","objectId":"proj1",
		"objectClass":"tracker:class:Project","modifiedBy":"acc-test","modifiedOn":3}`))
	if docs := s.queryDocs("tracker:class:Project", nil); len(docs) != 0 {
		t.Fatalf("remove: want 0, got %d", len(docs))
	}
}

func TestMixinAndTrigger(t *testing.T) {
	s := newTestSession(t)

	// create a Person, then apply the Employee mixin (active) — the trigger must
	// materialize a PersonSpace (fixes "Failed to find space for employee").
	s.applyTx(json.RawMessage(`{"_class":"core:class:TxCreateDoc","objectId":"person1",
		"objectClass":"contact:class:Person","objectSpace":"contact:space:Contacts",
		"modifiedBy":"acc-test","modifiedOn":1,"attributes":{"name":"Z","city":""}}`))
	s.applyTx(json.RawMessage(`{"_class":"core:class:TxMixin","objectId":"person1",
		"objectClass":"contact:class:Person","mixin":"contact:mixin:Employee",
		"objectSpace":"contact:space:Contacts","modifiedBy":"acc-test","modifiedOn":2,
		"attributes":{"active":true,"role":"USER"}}`))

	// mixin data stored under the mixin key; findAll(Employee mixin) filters by it
	emps := s.queryDocs("contact:mixin:Employee", nil)
	if len(emps) != 1 {
		t.Fatalf("mixin query: want 1 employee, got %d", len(emps))
	}
	if sub, ok := emps[0]["contact:mixin:Employee"].(map[string]any); !ok || sub["active"] != true {
		t.Fatalf("mixin payload missing/inactive: %v", emps[0]["contact:mixin:Employee"])
	}

	// trigger: a PersonSpace for person1 must now exist
	sp := s.queryDocs("contact:class:PersonSpace", map[string]any{"person": "person1"})
	if len(sp) != 1 {
		t.Fatalf("trigger: want 1 PersonSpace, got %d", len(sp))
	}
}

func TestSeedSpaces(t *testing.T) {
	s := newTestSession(t)
	s.seedWorkspace()
	if sp := s.queryDocs("core:class:Space", map[string]any{"_id": "contact:space:Contacts"}); len(sp) != 1 {
		t.Fatalf("seed: Contacts space not found")
	}
	// idempotent
	s.seedWorkspace()
	if n, _ := s.store.count(s.org, s.workspace); n != len(systemSpaces()) {
		t.Fatalf("seed not idempotent: count=%d", n)
	}
}

// TestTenantIsolation proves two orgs sharing a workspace id never see each
// other's data — the whole point of per-(org,workspace) SQLite files.
func TestTenantIsolation(t *testing.T) {
	st := newStore(t.TempDir())
	hier := buildHierarchy(modelJSON)
	mk := func(org string) *session {
		return &session{server: &server{hub: newHub()}, store: st, hier: hier, org: org, workspace: "shared-ws", account: "u"}
	}
	a := mk("org-a")
	b := mk("org-b")

	a.applyTx(json.RawMessage(`{"_class":"core:class:TxCreateDoc","objectId":"p1",
		"objectClass":"tracker:class:Project","objectSpace":"core:space:Space",
		"modifiedBy":"u","modifiedOn":1,"attributes":{"name":"A only"}}`))

	if got := a.queryDocs("tracker:class:Project", nil); len(got) != 1 {
		t.Fatalf("org-a should see its project, got %d", len(got))
	}
	if got := b.queryDocs("tracker:class:Project", nil); len(got) != 0 {
		t.Fatalf("org-b must NOT see org-a's project (tenant leak), got %d", len(got))
	}
}
