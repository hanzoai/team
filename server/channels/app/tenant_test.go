// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package app

import (
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/mattermost/mattermost/server/public/model"
)

func TestTeamNameForOrg(t *testing.T) {
	for _, tc := range []struct {
		org  string
		want string
	}{
		{"hanzo", "hanzo"},
		{"Hanzo", "hanzo"},
		{"Hanzo AI", "hanzo-ai"},
		{"hanzo_ai", "hanzo-ai"},
		{"hanzo.ai", "hanzo-ai"},
		{"ACME Corp.", "acme-corp"},
		{"-hanzo-", "hanzo"},
		{"a/b\\c", "a-b-c"},
		{"team 42", "team-42"},
		{"", ""},
		{"...", ""},
	} {
		t.Run(tc.org, func(t *testing.T) {
			require.Equal(t, tc.want, teamNameForOrg(tc.org))
		})
	}
}

func TestEnterOrgTeam(t *testing.T) {
	th := Setup(t).InitBasic(t)

	userInOrg := func(t *testing.T, org string) *model.User {
		t.Helper()
		user := th.CreateUser(t)
		if org != "" {
			user.SetProp(model.UserPropOrg, org)
		}
		return user
	}

	t.Run("creates the org team and joins the user", func(t *testing.T) {
		org := "acme-" + model.NewId()[:8]
		user := userInOrg(t, org)

		require.Nil(t, th.App.EnterOrgTeam(th.Context, user))

		team, appErr := th.App.GetTeamByName(org)
		require.Nil(t, appErr)
		require.Equal(t, org, team.DisplayName)
		require.Equal(t, model.TeamInvite, team.Type, "a tenant's team must not be open to browse")

		_, appErr = th.App.GetTeamMember(th.Context, team.Id, user.Id)
		require.Nil(t, appErr, "user should be a member of their org team")
	})

	t.Run("puts a second user from the same org in the same team", func(t *testing.T) {
		org := "acme-" + model.NewId()[:8]
		first, second := userInOrg(t, org), userInOrg(t, org)

		require.Nil(t, th.App.EnterOrgTeam(th.Context, first))
		require.Nil(t, th.App.EnterOrgTeam(th.Context, second))

		team, appErr := th.App.GetTeamByName(org)
		require.Nil(t, appErr)
		for _, u := range []*model.User{first, second} {
			_, appErr = th.App.GetTeamMember(th.Context, team.Id, u.Id)
			require.Nil(t, appErr)
		}
	})

	t.Run("keeps orgs apart", func(t *testing.T) {
		orgA, orgB := "a-"+model.NewId()[:8], "b-"+model.NewId()[:8]
		userA, userB := userInOrg(t, orgA), userInOrg(t, orgB)

		require.Nil(t, th.App.EnterOrgTeam(th.Context, userA))
		require.Nil(t, th.App.EnterOrgTeam(th.Context, userB))

		teamA, appErr := th.App.GetTeamByName(orgA)
		require.Nil(t, appErr)

		_, appErr = th.App.GetTeamMember(th.Context, teamA.Id, userB.Id)
		require.NotNil(t, appErr, "a user must not land in another org's team")
	})

	t.Run("is idempotent", func(t *testing.T) {
		org := "acme-" + model.NewId()[:8]
		user := userInOrg(t, org)

		require.Nil(t, th.App.EnterOrgTeam(th.Context, user))
		require.Nil(t, th.App.EnterOrgTeam(th.Context, user), "a repeat sign-in must not error")
	})

	t.Run("does nothing without an org claim", func(t *testing.T) {
		require.Nil(t, th.App.EnterOrgTeam(th.Context, userInOrg(t, "")))
	})

	t.Run("rejects an org that slugs to nothing", func(t *testing.T) {
		require.NotNil(t, th.App.EnterOrgTeam(th.Context, userInOrg(t, "...")))
	})
}
