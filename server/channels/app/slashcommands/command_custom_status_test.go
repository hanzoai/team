// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package slashcommands

import (
	"testing"

	"github.com/hanzoai/team/server/public/model"
)

func TestGetCustomStatus(t *testing.T) {
	for msg, expected := range map[string]model.CustomStatus{
		"":                         {Emoji: model.DefaultCustomStatusEmoji, Text: ""},
		"Hey":                      {Emoji: model.DefaultCustomStatusEmoji, Text: "Hey"},
		":cactus: Hurt":            {Emoji: "cactus", Text: "Hurt"},
		"👅":                        {Emoji: "tongue", Text: ""},
		"👅 Eating":                 {Emoji: "tongue", Text: "Eating"},
		"💪🏻 Working out":           {Emoji: "muscle_light_skin_tone", Text: "Working out"},
		"👙 Swimming":               {Emoji: "bikini", Text: "Swimming"},
		"👙Swimming":                {Emoji: model.DefaultCustomStatusEmoji, Text: "👙Swimming"},
		"👍🏿 Okay":                  {Emoji: "+1_dark_skin_tone", Text: "Okay"},
		"🤴🏾 Dark king":             {Emoji: "prince_medium_dark_skin_tone", Text: "Dark king"},
		"⛹🏾‍♀️ Playing basketball": {Emoji: "basketball_woman_medium_dark_skin_tone", Text: "Playing basketball"},
		"🏋🏿‍♀️ Weightlifting":      {Emoji: "weight_lifting_woman_dark_skin_tone", Text: "Weightlifting"},
		"🏄 Surfing":                {Emoji: "surfer", Text: "Surfing"},
		"👨‍👨‍👦‍👦 Family":           {Emoji: "family_man_man_boy_boy", Text: "Family"},
	} {
		actual := GetCustomStatus(msg)
		if actual.Emoji != expected.Emoji || actual.Text != expected.Text {
			t.Errorf("expected `%v`, got `%v`", expected, *actual)
		}
	}
}
