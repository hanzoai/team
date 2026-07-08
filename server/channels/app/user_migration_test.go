// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package app

import (
	"strings"
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/mattermost/mattermost/server/public/model"
)

func TestMigrateAuthToEmail(t *testing.T) {
	mainHelper.Parallel(t)
	th := Setup(t).InitBasic(t)

	ldapUser, appErr := th.App.CreateUser(th.Context, &model.User{
		Email:       strings.ToLower(model.NewId()) + "success+test@example.com",
		Username:    model.NewId(),
		AuthData:    new("ldap-auth-data"),
		AuthService: model.UserAuthServiceLdap,
	})
	require.Nil(t, appErr)

	emailUser := th.BasicUser

	t.Run("invalid from auth", func(t *testing.T) {
		numAffected, appErr := th.App.MigrateAuthToEmail(th.Context, "email", nil, true, false, false)
		require.NotNil(t, appErr)
		require.Equal(t, 0, numAffected)
	})

	t.Run("missing users scope", func(t *testing.T) {
		numAffected, appErr := th.App.MigrateAuthToEmail(th.Context, model.UserAuthServiceLdap, nil, false, false, false)
		require.NotNil(t, appErr)
		require.Equal(t, 0, numAffected)
	})

	t.Run("conflicting users scope", func(t *testing.T) {
		numAffected, appErr := th.App.MigrateAuthToEmail(th.Context, model.UserAuthServiceLdap, []string{ldapUser.Id}, true, false, false)
		require.NotNil(t, appErr)
		require.Equal(t, 0, numAffected)
	})

	t.Run("dry run with user ids", func(t *testing.T) {
		numAffected, appErr := th.App.MigrateAuthToEmail(th.Context, model.UserAuthServiceLdap, []string{ldapUser.Id, emailUser.Id}, false, false, true)
		require.Nil(t, appErr)
		require.Equal(t, 1, numAffected)

		storedUser, err := th.App.GetUser(ldapUser.Id)
		require.Nil(t, err)
		require.Equal(t, model.UserAuthServiceLdap, storedUser.AuthService)
	})

	t.Run("migrate user by id", func(t *testing.T) {
		numAffected, appErr := th.App.MigrateAuthToEmail(th.Context, model.UserAuthServiceLdap, []string{ldapUser.Id}, false, false, false)
		require.Nil(t, appErr)
		require.Equal(t, 1, numAffected)

		storedUser, err := th.App.GetUser(ldapUser.Id)
		require.Nil(t, err)
		require.Empty(t, storedUser.AuthService)
		require.Nil(t, storedUser.AuthData)
	})

	t.Run("migrate all users with auth service", func(t *testing.T) {
		samlUser, appErr := th.App.CreateUser(th.Context, &model.User{
			Email:       strings.ToLower(model.NewId()) + "success+test@example.com",
			Username:    model.NewId(),
			AuthData:    new("saml-auth-data"),
			AuthService: model.UserAuthServiceSaml,
		})
		require.Nil(t, appErr)

		numAffected, appErr := th.App.MigrateAuthToEmail(th.Context, model.UserAuthServiceSaml, nil, true, false, false)
		require.Nil(t, appErr)
		require.Equal(t, 1, numAffected)

		storedUser, err := th.App.GetUser(samlUser.Id)
		require.Nil(t, err)
		require.Empty(t, storedUser.AuthService)
		require.Nil(t, storedUser.AuthData)
	})

	t.Run("skip bot users", func(t *testing.T) {
		bot, appErr := th.App.CreateBot(th.Context, &model.Bot{
			Username:    model.NewId(),
			OwnerId:     th.BasicUser.Id,
			Description: "test bot",
		})
		require.Nil(t, appErr)

		_, appErr = th.App.UpdateUserAuth(th.Context, bot.UserId, &model.UserAuth{
			AuthData:    new("bot-ldap"),
			AuthService: model.UserAuthServiceLdap,
		})
		require.Nil(t, appErr)

		numAffected, appErr := th.App.MigrateAuthToEmail(th.Context, model.UserAuthServiceLdap, []string{bot.UserId}, false, false, true)
		require.Nil(t, appErr)
		require.Equal(t, 0, numAffected)
	})
}
