// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package plugin

import (
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/stretchr/testify/require"

	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/plugin/utils"
	"github.com/mattermost/mattermost/server/public/shared/mlog"
)

// TestPluginMarksNotRunningAfterOnDeactivate verifies the state transitions during plugin
// teardown, for both Shutdown and Deactivate. While a plugin's OnDeactivate is still running,
// IsActive must return true so that hook dispatches the plugin makes to itself (e.g. CreatePost)
// are not rejected. Once OnDeactivate completes, IsActive must return false before the RPC
// connection is torn down.
func TestPluginMarksNotRunningAfterOnDeactivate(t *testing.T) {
	testCases := []struct {
		name     string
		teardown func(env *Environment, pluginID string)
	}{
		{
			name: "Shutdown",
			teardown: func(env *Environment, _ string) {
				env.Shutdown()
			},
		},
		{
			name: "Deactivate",
			teardown: func(env *Environment, pluginID string) {
				env.Deactivate(pluginID)
			},
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			pluginDir, err := os.MkdirTemp("", "mm-shutdown-state-plugin")
			require.NoError(t, err)
			t.Cleanup(func() { os.RemoveAll(pluginDir) })
			webappPluginDir, err := os.MkdirTemp("", "mm-shutdown-state-webapp")
			require.NoError(t, err)
			t.Cleanup(func() { os.RemoveAll(webappPluginDir) })

			pluginID := "test-shutdown-state-plugin"
			require.NoError(t, os.MkdirAll(filepath.Join(pluginDir, pluginID), 0700))
			backend := filepath.Join(pluginDir, pluginID, "backend.exe")

			// OnDeactivate blocks until the test signals it via MessageWillBePosted.
			utils.CompileGo(t, `
				package main

				import (
					"sync"

					"github.com/mattermost/mattermost/server/public/model"
					"github.com/mattermost/mattermost/server/public/plugin"
				)

				type MyPlugin struct {
					plugin.MattermostPlugin
					once    sync.Once
					proceed chan struct{}
				}

				func (p *MyPlugin) OnActivate() error {
					p.proceed = make(chan struct{})
					return nil
				}

				func (p *MyPlugin) OnDeactivate() error {
					<-p.proceed
					return nil
				}

				func (p *MyPlugin) MessageWillBePosted(_ *plugin.Context, _ *model.Post) (*model.Post, string) {
					p.once.Do(func() { close(p.proceed) })
					return nil, ""
				}

				func main() {
					plugin.ClientMain(&MyPlugin{})
				}
			`, backend)

			require.NoError(t, os.WriteFile(
				filepath.Join(pluginDir, pluginID, "plugin.json"),
				[]byte(`{"id":"`+pluginID+`","server":{"executable":"backend.exe"}}`),
				0600,
			))

			logger := mlog.CreateConsoleTestLogger(t)
			apiImpl := func(*model.Manifest) API { return nil }
			env, err := NewEnvironment(apiImpl, nil, pluginDir, webappPluginDir, logger, nil)
			require.NoError(t, err)

			_, _, err = env.Activate(pluginID)
			require.NoError(t, err)
			require.True(t, env.IsActive(pluginID))

			teardownDone := make(chan struct{})
			go func() {
				defer close(teardownDone)
				tc.teardown(env, pluginID)
			}()

			// Plugin is blocked in OnDeactivate — state must still be Running so a plugin
			// dispatching hooks back to itself from OnDeactivate isn't rejected.
			require.True(t, env.IsActive(pluginID), "IsActive should be true while OnDeactivate is blocking")

			// Signal the plugin to complete OnDeactivate.
			env.RunMultiPluginHook(func(hooks Hooks, _ *model.Manifest) bool {
				hooks.MessageWillBePosted(&Context{}, &model.Post{})
				return true
			}, MessageWillBePostedID)

			select {
			case <-teardownDone:
			case <-time.After(2 * time.Second):
				t.Fatalf("%s did not return", tc.name)
			}

			require.False(t, env.IsActive(pluginID))
		})
	}
}
