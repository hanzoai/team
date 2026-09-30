package model

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestNewClientRoute(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{
			name:     "simple path",
			input:    "v1",
			expected: "/v1",
		},
		{
			name:     "path with special characters",
			input:    "hello world",
			expected: "/hello%20world",
		},
		{
			name:     "path with slashes",
			input:    "v1/workspace",
			expected: "/v1%2Fworkspace",
		},
		{
			name:     "empty string",
			input:    "",
			expected: "/",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			route := newClientRoute(tt.input)
			result, err := route.String()
			require.NoError(t, err)
			require.Equal(t, tt.expected, result)
		})
	}
}

func TestClientRouteJoinRoute(t *testing.T) {
	tests := []struct {
		name     string
		base     clientRoute
		join     clientRoute
		expected string
		wantErr  bool
	}{
		{
			name:     "join two valid routes",
			base:     newClientRoute("v1"),
			join:     newClientRoute("workspace"),
			expected: "/v1/workspace",
			wantErr:  false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := tt.base.Join(tt.join)
			str, err := result.String()
			if tt.wantErr {
				require.Error(t, err)
			} else {
				require.NoError(t, err)
				require.Equal(t, tt.expected, str)
			}
		})
	}
}

func TestClientRouteJoinSegment(t *testing.T) {
	tests := []struct {
		name     string
		base     clientRoute
		segment  string
		expected string
		wantErr  bool
	}{
		{
			name:     "valid segment",
			base:     newClientRoute("v1"),
			segment:  "workspace",
			expected: "/v1/workspace",
			wantErr:  false,
		},
		{
			name:     "segment with spaces",
			base:     newClientRoute("v1"),
			segment:  "hello world",
			expected: "/v1/hello%20world",
			wantErr:  false,
		},
		{
			name:     "segment with slash - escaped",
			base:     newClientRoute("v1"),
			segment:  "workspace/users",
			expected: "/v1/workspace%2Fusers",
			wantErr:  false,
		},
		{
			name:     "empty segment",
			base:     newClientRoute("v1"),
			segment:  "",
			expected: "/v1/",
			wantErr:  false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := tt.base.Join(tt.segment)
			str, err := result.String()
			if tt.wantErr {
				require.Error(t, err)
			} else {
				require.NoError(t, err)
				require.Equal(t, tt.expected, str)
			}
		})
	}
}

func TestClientRouteJoin(t *testing.T) {
	tests := []struct {
		name     string
		base     clientRoute
		segments []any
		expected string
		wantErr  bool
	}{
		{
			name:     "multiple valid segments",
			base:     newClientRoute("v1"),
			segments: []any{"workspace", "users", "me"},
			expected: "/v1/workspace/users/me",
			wantErr:  false,
		},
		{
			name:     "no segments",
			base:     newClientRoute("v1"),
			segments: []any{},
			expected: "/v1",
			wantErr:  false,
		},
		{
			name:     "segment with slash - escaped",
			base:     newClientRoute("v1"),
			segments: []any{"workspace", "users/me"},
			expected: "/v1/workspace/users%2Fme",
			wantErr:  false,
		},
		{
			name:     "empty segment",
			base:     newClientRoute("v1"),
			segments: []any{"workspace", "users", "", "me"},
			expected: "/v1/workspace/users/me",
			wantErr:  false,
		},
		{
			name:     "empty segment at the end",
			base:     newClientRoute("v1"),
			segments: []any{"workspace", "users", ""},
			expected: "/v1/workspace/users/",
			wantErr:  false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := tt.base.Join(tt.segments...)
			str, err := result.String()
			if tt.wantErr {
				require.Error(t, err)
			} else {
				require.NoError(t, err)
				require.Equal(t, tt.expected, str)
			}
		})
	}
}

func TestClientRouteURL(t *testing.T) {
	tests := []struct {
		name        string
		route       clientRoute
		expectedURL string
		wantErr     bool
	}{
		{
			name:        "simple route",
			route:       newClientRoute("v1").Join(newClientRoute("workspace")),
			expectedURL: "/v1/workspace",
			wantErr:     false,
		},
		{
			name:        "empty route",
			route:       clientRoute{},
			expectedURL: "/",
			wantErr:     false,
		},
		{
			name:        "complex route",
			route:       newClientRoute("v1").Join(newClientRoute("workspace"), "users"),
			expectedURL: "/v1/workspace/users",
			wantErr:     false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := tt.route.URL()
			if tt.wantErr {
				require.Error(t, err)
				require.Nil(t, result)
			} else {
				require.NoError(t, err)
				require.NotNil(t, result)
				require.Equal(t, tt.expectedURL, result.Path)
			}
		})
	}
}

func TestClientRouteString(t *testing.T) {
	tests := []struct {
		name     string
		route    clientRoute
		expected string
		wantErr  bool
	}{
		{
			name:     "simple route",
			route:    newClientRoute("v1"),
			expected: "/v1",
			wantErr:  false,
		},
		{
			name:     "empty route",
			route:    clientRoute{},
			expected: "/",
			wantErr:  false,
		},
		{
			name:     "complex route",
			route:    newClientRoute("v1").Join(newClientRoute("workspace"), "users", "me"),
			expected: "/v1/workspace/users/me",
			wantErr:  false,
		},
		{
			name:     "route with special characters",
			route:    newClientRoute("v1").Join("hello world"),
			expected: "/v1/hello%20world",
			wantErr:  false,
		},
		{
			name:     "route with special characters",
			route:    newClientRoute("").Join(".."),
			expected: "/",
			wantErr:  false,
		},
		{
			name:     "route with control characters, which make url.JoinPath to error out",
			route:    newClientRoute("[fe80::1%en0]"),
			expected: "/%5Bfe80::1%25en0%5D",
			wantErr:  false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := tt.route.String()
			if tt.wantErr {
				require.Error(t, err)
				require.Equal(t, tt.expected, result)
			} else {
				require.NoError(t, err)
				require.Equal(t, tt.expected, result)
			}
		})
	}
}

func TestClientRouteLeadingSlash(t *testing.T) {
	tests := []struct {
		name  string
		route clientRoute
	}{
		{
			name:  "single segment",
			route: newClientRoute("v1"),
		},
		{
			name:  "multiple segments",
			route: newClientRoute("v1").Join("workspace"),
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Test String() has leading slash
			str, err := tt.route.String()
			require.NoError(t, err)
			require.True(t, len(str) > 0 && str[0] == '/', "String() result should have leading slash")

			// Test URL() has leading slash
			u, err := tt.route.URL()
			require.NoError(t, err)
			require.True(t, len(u.Path) > 0 && u.Path[0] == '/', "URL() result path should have leading slash")
		})
	}
}

func TestClean(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{
			name:     "simple string",
			input:    "v1",
			expected: "v1",
		},
		{
			name:     "string with spaces",
			input:    "hello world",
			expected: "hello%20world",
		},
		{
			name:     "string with slashes",
			input:    "v1/workspace",
			expected: "v1%2Fworkspace",
		},
		{
			name:     "just two dots",
			input:    "..",
			expected: "",
		},
		{
			name:     "two dots at start",
			input:    "../api",
			expected: "%2Fapi",
		},
		{
			name:     "two dots at end",
			input:    "api/..",
			expected: "api%2F",
		},
		{
			name:     "two dots in middle",
			input:    "api/../v4",
			expected: "api%2F%2Fv4",
		},
		{
			name:     "multiple two dots",
			input:    "../../api",
			expected: "%2F%2Fapi",
		},
		{
			name:     "empty string",
			input:    "",
			expected: "",
		},
		{
			name:     "special characters",
			input:    "user@example.com",
			expected: "user@example.com",
		},
		{
			name:     "single dot",
			input:    ".",
			expected: ".",
		},
		{
			name:     "three dots",
			input:    "...",
			expected: ".",
		},
		{
			name:     "four dots",
			input:    "....",
			expected: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := cleanSegment(tt.input)
			require.Equal(t, tt.expected, result)
		})
	}
}

// Every path this server serves is under /v1; /api is retired.
func TestAPIURLSuffixIsV1(t *testing.T) {
	require.Equal(t, "/v1/workspace", APIURLSuffix)
}
