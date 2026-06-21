package token

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"strings"
	"testing"
)

const (
	acc    = "550e8400-e29b-41d4-a716-446655440000"
	ws     = "6ba7b810-9dad-11d1-80b4-00c04fd430c8"
	secret = "test-secret"
)

// TestWireFormat locks the exact jwt-simple HS256 byte layout: header,
// compact ordered payload, base64url-no-pad, raw HMAC-SHA256 signature.
// These assertions ARE the jwt-simple contract — matching them is what makes
// a team-go token interchangeable with an upstream one.
func TestWireFormat(t *testing.T) {
	cases := []struct {
		name      string
		account   string
		workspace string
		extra     map[string]any
		payload   string // exact decoded payload bytes JSON.stringify would emit
	}{
		{"account only", acc, "", nil, `{"account":"` + acc + `"}`},
		{"account+workspace", acc, ws, nil, `{"account":"` + acc + `","workspace":"` + ws + `"}`},
		{"with extra", acc, ws, map[string]any{"service": "team"},
			`{"extra":{"service":"team"},"account":"` + acc + `","workspace":"` + ws + `"}`},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			tok, err := Generate(c.account, c.workspace, c.extra, secret)
			if err != nil {
				t.Fatalf("Generate: %v", err)
			}
			parts := strings.Split(tok, ".")
			if len(parts) != 3 {
				t.Fatalf("want 3 segments, got %d", len(parts))
			}

			// header segment — exact bytes, typ before alg, no padding.
			hb, err := base64.RawURLEncoding.DecodeString(parts[0])
			if err != nil {
				t.Fatalf("header not base64url-no-pad: %v", err)
			}
			if string(hb) != `{"typ":"JWT","alg":"HS256"}` {
				t.Fatalf("header = %s", hb)
			}

			// payload segment — exact compact JSON, fixed key order, omitted empties.
			pb, err := base64.RawURLEncoding.DecodeString(parts[1])
			if err != nil {
				t.Fatalf("payload not base64url-no-pad: %v", err)
			}
			if string(pb) != c.payload {
				t.Fatalf("payload\n got %s\nwant %s", pb, c.payload)
			}

			// signature — raw HMAC-SHA256 over header.payload, base64url-no-pad.
			mac := hmac.New(sha256.New, []byte(secret))
			mac.Write([]byte(parts[0] + "." + parts[1]))
			want := base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
			if parts[2] != want {
				t.Fatalf("sig = %s want %s", parts[2], want)
			}
		})
	}
}

func TestRoundTrip(t *testing.T) {
	tok, err := Generate(acc, ws, map[string]any{"service": "team"}, secret)
	if err != nil {
		t.Fatal(err)
	}
	got, err := Decode(tok, secret, true)
	if err != nil {
		t.Fatalf("Decode: %v", err)
	}
	if got.Account != acc || got.Workspace != ws {
		t.Fatalf("got account=%s workspace=%s", got.Account, got.Workspace)
	}
	if got.Extra["service"] != "team" {
		t.Fatalf("extra not preserved: %v", got.Extra)
	}
}

func TestVerifyRejectsTamper(t *testing.T) {
	tok, _ := Generate(acc, ws, nil, secret)
	// flip the workspace claim under a different secret → signature must fail.
	forged, _ := Generate(acc, ws, map[string]any{"service": "evil"}, "other-secret")
	parts := strings.Split(tok, ".")
	bad := parts[0] + "." + strings.Split(forged, ".")[1] + "." + parts[2]
	if _, err := Decode(bad, secret, true); err != ErrSignature {
		t.Fatalf("want ErrSignature, got %v", err)
	}
	// wrong secret also rejected.
	if _, err := Decode(tok, "wrong", true); err != ErrSignature {
		t.Fatalf("wrong secret: want ErrSignature, got %v", err)
	}
}

func TestRejectsNonUUID(t *testing.T) {
	if _, err := Generate("not-a-uuid", "", nil, secret); err == nil {
		t.Fatal("want error for non-uuid account")
	}
	if _, err := Generate(acc, "bad-ws", nil, secret); err == nil {
		t.Fatal("want error for non-uuid workspace")
	}
}

func TestAlg(t *testing.T) {
	tok, _ := Generate(acc, "", nil, secret)
	alg, err := Alg(tok)
	if err != nil {
		t.Fatal(err)
	}
	if alg != "HS256" {
		t.Fatalf("alg = %s", alg)
	}
	if _, err := Alg("garbage"); err != ErrMalformed {
		t.Fatalf("want ErrMalformed, got %v", err)
	}
}
