// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package model

import (
	"strings"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestCoreTeam(t *testing.T) {
	t.Run("is the roster the product page promises", func(t *testing.T) {
		want := []string{
			"vi", "dev", "des", "opera",
			"db", "sec", "core", "algo",
			"mark", "su", "fin", "cal",
			"art", "mu", "data", "chat",
		}
		got := make([]string, 0, len(CoreTeam))
		for _, c := range CoreTeam {
			got = append(got, c.Name)
		}
		require.Equal(t, want, got, "the roster and hanzo.team's roster have drifted")
	})

	t.Run("every coworker is addressable and briefed", func(t *testing.T) {
		seen := map[string]bool{}
		for _, c := range CoreTeam {
			require.NotEmpty(t, c.Role, "%s has no role", c.Name)
			require.NotEmpty(t, c.Brief, "%s has no brief", c.Name)

			// One word, lowercase: these are typed as @mentions.
			require.Equal(t, strings.ToLower(c.Name), c.Name, "%s is not lowercase", c.Name)
			require.NotContains(t, c.Name, " ", "%s is not one word", c.Name)

			require.False(t, seen[c.Name], "%s appears twice", c.Name)
			seen[c.Name] = true
		}
	})

	t.Run("a brief tells the coworker who they are", func(t *testing.T) {
		// The brief is the standing instruction. One that does not name the
		// coworker leaves sixteen identical assistants wearing different labels.
		for _, c := range CoreTeam {
			require.Contains(t, strings.ToLower(c.Brief), strings.ToLower(c.Name),
				"%s's brief never names them", c.Name)
		}
	})
}

func TestCoreTeamBots(t *testing.T) {
	bots := coreTeamBots(HanzoAIServiceID)
	require.Len(t, bots, len(CoreTeam))

	for i, raw := range bots {
		bot, ok := raw.(map[string]any)
		require.True(t, ok)
		require.Equal(t, CoreTeam[i].Name, bot["name"])
		require.Equal(t, CoreTeam[i].Brief, bot["customInstructions"])
		// One service for all sixteen: the model and the key are changed in one
		// place, not sixteen.
		require.Equal(t, HanzoAIServiceID, bot["serviceID"])
	}
}

func TestConfigSeedsTheCoreTeam(t *testing.T) {
	c := Config{}
	c.SetDefaults()

	plugin, ok := c.PluginSettings.Plugins[PluginIdAI]
	require.True(t, ok, "the Agents plugin has no configuration")

	cfg, ok := plugin["config"].(map[string]any)
	require.True(t, ok)

	bots, ok := cfg["bots"].([]any)
	require.True(t, ok)
	require.Len(t, bots, len(CoreTeam), "a new workspace does not start with the core team")

	require.Equal(t, CoreTeam[0].Name, cfg["defaultBotName"])
}
