// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package app

import (
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/mattermost/mattermost/server/public/model"
)

func TestRewriteMessageRequestsStructuredOutput(t *testing.T) {
	bridge := &testAgentsBridge{
		completeFn: func(sessionUserID, agentID string, req BridgeCompletionRequest) (string, error) {
			return `{"rewritten_text":"Improved message"}`, nil
		},
	}

	th := Setup(t, WithAgentsBridge(bridge)).InitBasic(t)
	ctx := th.Context.WithSession(&model.Session{UserId: th.BasicUser.Id})

	response, appErr := th.App.RewriteMessage(ctx, model.NewId(), "hello", model.RewriteActionImproveWriting, "", "")
	require.Nil(t, appErr)
	require.NotNil(t, response)
	assert.Equal(t, "Improved message", response.RewrittenText)

	require.Len(t, bridge.completeCalls, 1)
	req := bridge.completeCalls[0].request
	assert.Equal(t, BridgeOperationRewrite, req.Operation)
	assert.Equal(t, rewriteResponseJSONSchema, req.JSONOutputFormat,
		"rewrite must request structured output so providers return parseable JSON")
}

func TestRewriteMessageResponseHandling(t *testing.T) {
	testCases := []struct {
		name          string
		completion    string
		completionErr error
		expectedErrID string
	}{
		{
			name:          "non-JSON completion returns parse failed",
			completion:    "Sure! Here is your rewrite.",
			expectedErrID: "app.post.rewrite.parse_response_failed",
		},
		{
			name:          "empty rewritten_text returns empty response",
			completion:    `{"rewritten_text":""}`,
			expectedErrID: "app.post.rewrite.empty_response",
		},
		{
			name:          "bridge error returns agent call failed",
			completionErr: assert.AnError,
			expectedErrID: "app.post.rewrite.agent_call_failed",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			bridge := &testAgentsBridge{
				completeFn: func(sessionUserID, agentID string, req BridgeCompletionRequest) (string, error) {
					return tc.completion, tc.completionErr
				},
			}

			th := Setup(t, WithAgentsBridge(bridge)).InitBasic(t)
			ctx := th.Context.WithSession(&model.Session{UserId: th.BasicUser.Id})

			response, appErr := th.App.RewriteMessage(ctx, model.NewId(), "hello", model.RewriteActionImproveWriting, "", "")
			require.Nil(t, response)
			require.NotNil(t, appErr)
			assert.Equal(t, tc.expectedErrID, appErr.Id)
		})
	}
}

func TestBuildRewriteSystemPrompt(t *testing.T) {
	basePrompt := model.RewriteSystemPrompt

	t.Run("uses_user_locale", func(t *testing.T) {
		prompt := buildRewriteSystemPrompt("en_CA")
		require.True(t, strings.HasPrefix(prompt, basePrompt))
		require.Contains(t, prompt, "User locale: en_CA.")
	})

	t.Run("returns_base_prompt_when_no_locale", func(t *testing.T) {
		prompt := buildRewriteSystemPrompt("")
		require.Equal(t, basePrompt, prompt)
	})
}
