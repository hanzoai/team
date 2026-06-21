package account

import (
	"net/http"
	"testing"

	"github.com/hanzoai/team-go/pkg/token"
)

func TestBearer(t *testing.T) {
	cases := map[string]string{
		"Bearer abc.def.ghi": "abc.def.ghi",
		"bearer abc":         "abc", // case-insensitive scheme
		"Basic abc":          "",
		"":                   "",
		"Bearer ":            "",
	}
	for h, want := range cases {
		r, _ := http.NewRequest("GET", "/", nil)
		if h != "" {
			r.Header.Set("Authorization", h)
		}
		if got := bearer(r); got != want {
			t.Errorf("bearer(%q) = %q want %q", h, got, want)
		}
	}
}

// TestTokenRoundTrip proves an account token minted by the IAM bridge decodes
// back to the same AccountUuid the account() helper would resolve — the spine
// of every authenticated RPC.
func TestTokenRoundTrip(t *testing.T) {
	const account = "550e8400-e29b-41d4-a716-446655440000"
	tok, err := token.Generate(account, "", nil, "s3cret")
	if err != nil {
		t.Fatal(err)
	}
	dec, err := token.Decode(tok, "s3cret", true)
	if err != nil {
		t.Fatal(err)
	}
	if dec.Account != account {
		t.Fatalf("account = %s want %s", dec.Account, account)
	}
}

func TestSlugify(t *testing.T) {
	cases := map[string]string{
		"Acme Corp":     "acme-corp",
		"  Hello_World ": "hello-world",
		"z@hanzo.ai":    "zhanzoai",
		"***":           "ws", // never empty
		"Café":          "caf",
	}
	for in, want := range cases {
		if got := slugify(in); got != want {
			t.Errorf("slugify(%q) = %q want %q", in, got, want)
		}
	}
}

func TestLocalPartAndFirstNonEmpty(t *testing.T) {
	if got := localPart("z@hanzo.ai"); got != "z" {
		t.Errorf("localPart = %q", got)
	}
	if got := localPart("noatsign"); got != "noatsign" {
		t.Errorf("localPart = %q", got)
	}
	if got := firstNonEmpty("", "", "third", "fourth"); got != "third" {
		t.Errorf("firstNonEmpty = %q", got)
	}
	if got := firstNonEmpty("", ""); got != "" {
		t.Errorf("firstNonEmpty empty = %q", got)
	}
}
