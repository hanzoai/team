// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package oauthhanzo

import (
	"strings"
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/shared/mlog"
	"github.com/mattermost/mattermost/server/public/shared/request"
)

func TestIAMUserIsValid(t *testing.T) {
	valid := func() *IAMUser {
		return &IAMUser{Sub: "u-1", Email: "z@hanzo.ai", Owner: "hanzo"}
	}

	t.Run("accepts a complete claim set", func(t *testing.T) {
		require.NoError(t, valid().IsValid())
	})

	t.Run("rejects a missing subject", func(t *testing.T) {
		u := valid()
		u.Sub = ""
		require.Error(t, u.IsValid())
	})

	t.Run("rejects a missing email", func(t *testing.T) {
		u := valid()
		u.Email = ""
		require.Error(t, u.IsValid())
	})

	t.Run("rejects a missing owner, because there is no tenant to place them in", func(t *testing.T) {
		u := valid()
		u.Owner = ""
		require.Error(t, u.IsValid())
	})
}

func TestUserFromIAMUser(t *testing.T) {
	logger := mlog.CreateConsoleTestLogger(t)

	t.Run("maps the claims onto a user", func(t *testing.T) {
		user := userFromIAMUser(logger, &IAMUser{
			Sub:               "u-42",
			Email:             "Z@Hanzo.AI",
			EmailVerified:     true,
			PreferredUsername: "zeekay",
			DisplayName:       "Zach Kelling",
			Owner:             "hanzo",
		}, nil)

		require.Equal(t, "zeekay", user.Username)
		require.Equal(t, "z@hanzo.ai", user.Email, "email should be lowercased")
		require.True(t, user.EmailVerified)
		require.Equal(t, "Zach", user.FirstName)
		require.Equal(t, "Kelling", user.LastName)
		require.Equal(t, "u-42", *user.AuthData, "sub is the stable identifier")
		require.Equal(t, model.UserAuthServiceHanzo, user.AuthService)

		org, ok := user.GetProp(model.UserPropOrg)
		require.True(t, ok)
		require.Equal(t, "hanzo", org)
	})

	t.Run("takes the local part when preferred_username is an address", func(t *testing.T) {
		user := userFromIAMUser(logger, &IAMUser{
			Sub: "u-1", Email: "z@hanzo.ai", PreferredUsername: "zeekay@hanzo.ai", Owner: "hanzo",
		}, nil)
		require.Equal(t, "zeekay", user.Username)
	})

	t.Run("falls back to name when preferred_username is absent", func(t *testing.T) {
		user := userFromIAMUser(logger, &IAMUser{
			Sub: "u-1", Email: "z@hanzo.ai", Name: "zeekay", Owner: "hanzo",
		}, nil)
		require.Equal(t, "zeekay", user.Username)
	})

	t.Run("keeps a multi-word surname whole", func(t *testing.T) {
		user := userFromIAMUser(logger, &IAMUser{
			Sub: "u-1", Email: "a@hanzo.ai", PreferredUsername: "a", DisplayName: "Ada Van Der Berg", Owner: "hanzo",
		}, nil)
		require.Equal(t, "Ada", user.FirstName)
		require.Equal(t, "Van Der Berg", user.LastName)
	})

	t.Run("handles a single-word display name", func(t *testing.T) {
		user := userFromIAMUser(logger, &IAMUser{
			Sub: "u-1", Email: "a@hanzo.ai", PreferredUsername: "a", DisplayName: "Ada", Owner: "hanzo",
		}, nil)
		require.Equal(t, "Ada", user.FirstName)
		require.Empty(t, user.LastName)
	})
}

func TestProviderGetUserFromJSON(t *testing.T) {
	p := &Provider{}
	rctx := request.TestContext(t)

	t.Run("reads a UserInfo response", func(t *testing.T) {
		body := `{"sub":"u-7","email":"z@hanzo.ai","email_verified":true,
			"preferred_username":"zeekay","displayName":"Zach Kelling",
			"owner":"hanzo","organization":"Hanzo AI"}`

		user, err := p.GetUserFromJSON(rctx, strings.NewReader(body), nil, nil)
		require.NoError(t, err)
		require.Equal(t, "z@hanzo.ai", user.Email)

		org, _ := user.GetProp(model.UserPropOrg)
		require.Equal(t, "hanzo", org, "the owner claim is the tenant, not organization")
	})

	t.Run("refuses a response with no owner", func(t *testing.T) {
		body := `{"sub":"u-7","email":"z@hanzo.ai","preferred_username":"zeekay"}`
		_, err := p.GetUserFromJSON(rctx, strings.NewReader(body), nil, nil)
		require.Error(t, err)
	})

	t.Run("refuses malformed JSON", func(t *testing.T) {
		_, err := p.GetUserFromJSON(rctx, strings.NewReader("{"), nil, nil)
		require.Error(t, err)
	})
}

func TestProviderIsSameUser(t *testing.T) {
	p := &Provider{}
	rctx := request.TestContext(t)
	id := func(s string) *model.User { return &model.User{AuthData: &s} }

	require.True(t, p.IsSameUser(rctx, id("u-1"), id("u-1")))
	require.False(t, p.IsSameUser(rctx, id("u-1"), id("u-2")))
	require.False(t, p.IsSameUser(rctx, &model.User{}, id("u-1")), "a nil auth data must never match")

	sub := func(s string) *string { return &s }
	signingIn := &model.User{AuthService: model.UserAuthServiceHanzo, AuthData: sub("u-9"), Email: "z@hanzo.ai"}

	password := &model.User{Email: "z@hanzo.ai"}
	require.True(t, p.IsSameUser(rctx, password, signingIn), "an account with a password is the person hanzo.id vouches for")

	strangerAddress := &model.User{Email: "someone@hanzo.ai"}
	require.False(t, p.IsSameUser(rctx, strangerAddress, signingIn))

	require.False(t, p.IsSameUser(rctx, &model.User{}, &model.User{}), "two blank users are not each other")

	otherSubject := &model.User{AuthService: model.UserAuthServiceHanzo, AuthData: sub("u-8"), Email: "z@hanzo.ai"}
	require.False(t, p.IsSameUser(rctx, otherSubject, signingIn), "an identity never moves from one subject to another")
}

func TestProviderReadsTheHanzoSlot(t *testing.T) {
	p := &Provider{}
	cfg := &model.Config{}
	cfg.SetDefaults()

	settings, err := p.GetSSOSettings(request.TestContext(t), cfg, model.UserAuthServiceHanzo)
	require.NoError(t, err)
	require.Same(t, &cfg.HanzoSettings, settings)
	require.Equal(t, model.HanzoSettingsDefaultAuthEndpoint, *settings.AuthEndpoint)
}
