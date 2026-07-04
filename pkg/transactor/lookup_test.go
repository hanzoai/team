package transactor

import (
	"encoding/json"
	"testing"
)

// TestFindAllReverseLookupSocialIds locks the employees-query join: findAll with
// { lookup: { _id: { socialIds: SocialIdentity } } } must attach each Employee's
// SocialIdentity children (attachedTo == person._id) under $lookup.socialIds —
// the join the SPA needs to populate its socialId→employee maps (blank rows
// otherwise).
func TestFindAllReverseLookupSocialIds(t *testing.T) {
	const org, ws = "hanzo", "e48f81fd-12be-4bcd-aecb-3eaa9a9b5b18"
	const uid = "2d4d67ab-30f1-474e-b81f-f60461852259"
	srv, sess := ingestServer(t, org, ws)

	Apply(org, ws, acctSystem, MemberTxes(Member{UserID: uid, Name: "Zeekay", Role: "owner", Active: true}, false)...)

	req := []byte(`{"id":9,"method":"findAll","params":["contact:mixin:Employee",{},{"lookup":{"_id":{"socialIds":"contact:class:SocialIdentity"}}}]}`)
	out := sess.handle(req)
	_ = srv

	var resp struct {
		Result struct {
			Value []map[string]any `json:"value"`
		} `json:"result"`
	}
	if err := json.Unmarshal(out, &resp); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if len(resp.Result.Value) != 1 {
		t.Fatalf("employees = %d, want 1", len(resp.Result.Value))
	}
	emp := resp.Result.Value[0]
	if emp["name"] != ",Zeekay" {
		t.Fatalf("employee name lost in lookup path: %v", emp["name"])
	}
	lk, ok := emp["$lookup"].(map[string]any)
	if !ok {
		t.Fatalf("no $lookup on employee: %v", emp)
	}
	sids, ok := lk["socialIds"].([]any)
	if !ok || len(sids) != 1 {
		t.Fatalf("$lookup.socialIds = %v, want 1 social identity", lk["socialIds"])
	}
	sid := sids[0].(map[string]any)
	if sid["key"] != "hanzo:"+uid || sid["attachedTo"] != PersonRef(uid) {
		t.Fatalf("social identity join wrong: %v", sid)
	}
}

// TestFindAllNoLookupUnchanged proves a findAll WITHOUT lookup returns bare docs
// (no $lookup key) — the join is strictly opt-in.
func TestFindAllNoLookupUnchanged(t *testing.T) {
	const org, ws = "hanzo", "e48f81fd-12be-4bcd-aecb-3eaa9a9b5b18"
	const uid = "2d4d67ab-30f1-474e-b81f-f60461852259"
	_, sess := ingestServer(t, org, ws)
	Apply(org, ws, acctSystem, MemberTxes(Member{UserID: uid, Name: "Zeekay", Role: "owner", Active: true}, false)...)

	out := sess.handle([]byte(`{"id":1,"method":"findAll","params":["contact:mixin:Employee",{},{}]}`))
	var resp struct {
		Result struct {
			Value []map[string]any `json:"value"`
		} `json:"result"`
	}
	if err := json.Unmarshal(out, &resp); err != nil {
		t.Fatal(err)
	}
	if _, has := resp.Result.Value[0]["$lookup"]; has {
		t.Fatal("$lookup must be absent when no lookup option is given")
	}
}
