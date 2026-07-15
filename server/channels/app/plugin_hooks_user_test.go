// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package app

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/mattermost/mattermost/server/public/model"
)

func TestHookUserWillBeUpdated(t *testing.T) {
	mainHelper.Parallel(t)

	t.Run("rejected", func(t *testing.T) {
		mainHelper.Parallel(t)
		th := Setup(t).InitBasic(t)

		tearDown, _, _ := SetAppEnvironmentWithPlugins(t, []string{
			`
			package main

			import (
				"github.com/mattermost/mattermost/server/public/plugin"
				"github.com/mattermost/mattermost/server/public/model"
			)

			type MyPlugin struct {
				plugin.MattermostPlugin
			}

			func (p *MyPlugin) UserWillBeUpdated(c *plugin.Context, newUser, oldUser *model.User) (*model.User, string) {
				return nil, "update not permitted"
			}

			func main() {
				plugin.ClientMain(&MyPlugin{})
			}
			`,
		}, th.App, th.NewPluginAPI)
		defer tearDown()

		original := th.BasicUser.Username
		updated := th.BasicUser.DeepCopy()
		updated.Username = "shouldnotpersist"

		_, appErr := th.App.UpdateUser(th.Context, updated, false)
		require.NotNil(t, appErr)
		assert.Contains(t, appErr.Id, "rejected_by_plugin")

		fetched, err := th.App.GetUser(th.BasicUser.Id)
		require.Nil(t, err)
		assert.Equal(t, original, fetched.Username)
	})

	t.Run("modified", func(t *testing.T) {
		mainHelper.Parallel(t)
		th := Setup(t).InitBasic(t)

		tearDown, _, _ := SetAppEnvironmentWithPlugins(t, []string{
			`
			package main

			import (
				"strings"

				"github.com/mattermost/mattermost/server/public/plugin"
				"github.com/mattermost/mattermost/server/public/model"
			)

			type MyPlugin struct {
				plugin.MattermostPlugin
			}

			func (p *MyPlugin) UserWillBeUpdated(c *plugin.Context, newUser, oldUser *model.User) (*model.User, string) {
				newUser.Nickname = strings.ToUpper(newUser.Nickname)
				return newUser, ""
			}

			func main() {
				plugin.ClientMain(&MyPlugin{})
			}
			`,
		}, th.App, th.NewPluginAPI)
		defer tearDown()

		updated := th.BasicUser.DeepCopy()
		updated.Nickname = "lowercase nick"

		_, appErr := th.App.UpdateUser(th.Context, updated, false)
		require.Nil(t, appErr)

		fetched, err := th.App.GetUser(th.BasicUser.Id)
		require.Nil(t, err)
		assert.Equal(t, "LOWERCASE NICK", fetched.Nickname)
	})

	t.Run("old vs new diff", func(t *testing.T) {
		mainHelper.Parallel(t)
		th := Setup(t).InitBasic(t)

		tearDown, _, _ := SetAppEnvironmentWithPlugins(t, []string{
			`
			package main

			import (
				"github.com/mattermost/mattermost/server/public/plugin"
				"github.com/mattermost/mattermost/server/public/model"
			)

			type MyPlugin struct {
				plugin.MattermostPlugin
			}

			func (p *MyPlugin) UserWillBeUpdated(c *plugin.Context, newUser, oldUser *model.User) (*model.User, string) {
				if oldUser.Username != newUser.Username {
					return nil, "username changed"
				}
				return nil, ""
			}

			func main() {
				plugin.ClientMain(&MyPlugin{})
			}
			`,
		}, th.App, th.NewPluginAPI)
		defer tearDown()

		changed := th.BasicUser.DeepCopy()
		changed.Username = "renameduser" + model.NewId()[:8]
		_, appErr := th.App.UpdateUser(th.Context, changed, false)
		require.NotNil(t, appErr)
		assert.Contains(t, appErr.Id, "rejected_by_plugin")

		same := th.BasicUser.DeepCopy()
		same.Nickname = "allowed nickname change"
		_, appErr = th.App.UpdateUser(th.Context, same, false)
		require.Nil(t, appErr)
	})

	t.Run("allowed", func(t *testing.T) {
		mainHelper.Parallel(t)
		th := Setup(t).InitBasic(t)

		tearDown, _, _ := SetAppEnvironmentWithPlugins(t, []string{
			`
			package main

			import (
				"github.com/mattermost/mattermost/server/public/plugin"
				"github.com/mattermost/mattermost/server/public/model"
			)

			type MyPlugin struct {
				plugin.MattermostPlugin
			}

			func (p *MyPlugin) UserWillBeUpdated(c *plugin.Context, newUser, oldUser *model.User) (*model.User, string) {
				return nil, ""
			}

			func main() {
				plugin.ClientMain(&MyPlugin{})
			}
			`,
		}, th.App, th.NewPluginAPI)
		defer tearDown()

		updated := th.BasicUser.DeepCopy()
		updated.Nickname = "allowed"
		_, appErr := th.App.UpdateUser(th.Context, updated, false)
		require.Nil(t, appErr)

		fetched, err := th.App.GetUser(th.BasicUser.Id)
		require.Nil(t, err)
		assert.Equal(t, "allowed", fetched.Nickname)
	})

	t.Run("immutable id and create_at restored", func(t *testing.T) {
		mainHelper.Parallel(t)
		th := Setup(t).InitBasic(t)

		tearDown, _, _ := SetAppEnvironmentWithPlugins(t, []string{
			`
			package main

			import (
				"github.com/mattermost/mattermost/server/public/plugin"
				"github.com/mattermost/mattermost/server/public/model"
			)

			type MyPlugin struct {
				plugin.MattermostPlugin
			}

			func (p *MyPlugin) UserWillBeUpdated(c *plugin.Context, newUser, oldUser *model.User) (*model.User, string) {
				newUser.Id = "forged-id"
				newUser.CreateAt = 1
				newUser.Nickname = "kept"
				return newUser, ""
			}

			func main() {
				plugin.ClientMain(&MyPlugin{})
			}
			`,
		}, th.App, th.NewPluginAPI)
		defer tearDown()

		updated := th.BasicUser.DeepCopy()
		updated.Nickname = "ignored"
		_, appErr := th.App.UpdateUser(th.Context, updated, false)
		require.Nil(t, appErr)

		fetched, err := th.App.GetUser(th.BasicUser.Id)
		require.Nil(t, err)
		assert.Equal(t, th.BasicUser.Id, fetched.Id)
		assert.Equal(t, th.BasicUser.CreateAt, fetched.CreateAt)
		assert.Equal(t, "kept", fetched.Nickname)
	})

	t.Run("plugin email mutation subject to domain restriction", func(t *testing.T) {
		mainHelper.Parallel(t)
		th := Setup(t).InitBasic(t)

		th.App.UpdateConfig(func(cfg *model.Config) {
			*cfg.TeamSettings.RestrictCreationToDomains = "allowed.example"
		})

		tearDown, _, _ := SetAppEnvironmentWithPlugins(t, []string{
			`
			package main

			import (
				"github.com/mattermost/mattermost/server/public/plugin"
				"github.com/mattermost/mattermost/server/public/model"
			)

			type MyPlugin struct {
				plugin.MattermostPlugin
			}

			func (p *MyPlugin) UserWillBeUpdated(c *plugin.Context, newUser, oldUser *model.User) (*model.User, string) {
				newUser.Email = "evil@denied.example"
				return newUser, ""
			}

			func main() {
				plugin.ClientMain(&MyPlugin{})
			}
			`,
		}, th.App, th.NewPluginAPI)
		defer tearDown()

		updated := th.BasicUser.DeepCopy()
		updated.Nickname = "trigger-update"
		_, appErr := th.App.UpdateUser(th.Context, updated, false)
		require.NotNil(t, appErr)
		assert.Equal(t, "api.user.update_user.accepted_domain.app_error", appErr.Id)
	})
}
