package wsauth

import (
	"net/http"
	"testing"

	"github.com/google/uuid"
)

// TestAccountID_UuidVerbatim_NonUuidHashed locks the ONE account-id derivation:
// a UUID sub is used verbatim, any other sub maps to a stable UUIDv5 over
// namespace "iam:<sub>" — byte-identical to what the account layer stamps on
// members.user_id, so a member row and its caller resolve to the same key.
func TestAccountID_UuidVerbatim_NonUuidHashed(t *testing.T) {
	sub := "113d4dd4-2486-40de-be2b-88d6e3e0b718"
	if got := AccountID(sub); got != sub {
		t.Fatalf("AccountID(uuid) = %q, want the uuid verbatim", got)
	}
	want := uuid.NewSHA1(uuid.NameSpaceURL, []byte("iam:casdoor-alice")).String()
	if got := AccountID("casdoor-alice"); got != want {
		t.Fatalf("AccountID(non-uuid) = %q, want stable uuidv5 %q", got, want)
	}
	if AccountID("") != "" || AccountID("   ") != "" {
		t.Fatal("AccountID(empty/blank) must be empty")
	}
}

// TestCallerUID_PrefersAuthSubOverMangledAuthId proves CallerUID reads the raw
// OIDC sub (stashed by the JWKS middleware at authSub) rather than the mangled
// 15-char re.Auth.Id (subToRecordID), falling back to re.Auth.Id only when
// authSub is absent.
func TestCallerUID_PrefersAuthSubOverMangledAuthId(t *testing.T) {
	app, _, _, acmeAdmin, _, _ := boot(t)
	sub := "113d4dd4-2486-40de-be2b-88d6e3e0b718"
	re := req(app, acmeAdmin, "") // acmeAdmin.Id is a 15-char Base id, != sub
	if got := CallerUID(re); got != acmeAdmin.Id {
		t.Fatalf("CallerUID without authSub = %q, want re.Auth.Id %q", got, acmeAdmin.Id)
	}
	re.Set("authSub", sub)
	if got := CallerUID(re); got != sub {
		t.Fatalf("CallerUID with authSub = %q, want the raw sub %q (not the mangled re.Auth.Id)", got, sub)
	}
}

// TestAssertAdmin_ResolvesOwnerViaAuthSub_NotMangledAuthId is the Dave case that
// a live witness refuted the pinned theory with: the member row is keyed by the
// RAW sub (the account uuid the login path stores), but Base's JWKS middleware
// hands re.Auth.Id a subToRecordID-mangled value. AssertAdmin must resolve the
// owner via authSub → 200; keyed on the mangled id it would 403 despite the
// role=owner row that exists.
func TestAssertAdmin_ResolvesOwnerViaAuthSub_NotMangledAuthId(t *testing.T) {
	app, _, _, _, _, _ := boot(t)
	wsColl, _ := app.FindCollectionByNameOrId("workspaces")
	memColl, _ := app.FindCollectionByNameOrId("members")
	daveSub := "113d4dd4-2486-40de-be2b-88d6e3e0b718"
	daveWS := mkWS(t, app, wsColl, "dave-ws", "acme", "66666666-6666-6666-6666-666666666666")
	mkMember(t, app, memColl, daveWS.Id, daveSub, "owner") // keyed by the RAW sub

	users, _ := app.FindCollectionByNameOrId("users")
	daveAuth := mkUser(t, app, users, "dave@acme.test", "acme") // Base id != daveSub
	if daveAuth.Id == daveSub {
		t.Fatal("precondition: the Base auth record id must differ from the raw sub")
	}

	// Control — no authSub: keyed on the mangled re.Auth.Id, the owner row is
	// unreachable → 403 (this is exactly the live /v1/bots symptom).
	re := req(app, daveAuth, "dave-ws")
	if _, err := AssertAdmin(app, re); status(err) != http.StatusForbidden {
		t.Fatalf("control (no authSub): status %d, want 403", status(err))
	}
	// Production path — authSub carries the raw sub: the owner resolves → 200.
	re = req(app, daveAuth, "dave-ws")
	re.Set("authSub", daveSub)
	res, err := AssertAdmin(app, re)
	if err != nil {
		t.Fatalf("owner resolved via authSub was refused: %v (status %d)", err, status(err))
	}
	if res.Role != "owner" || res.UserID != daveSub {
		t.Fatalf("resolved caller: role=%q uid=%q, want owner / %s", res.Role, res.UserID, daveSub)
	}
}
