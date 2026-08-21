// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package slashcommands

import (
	"github.com/hanzoai/team/server/public/model"
	"github.com/hanzoai/team/server/public/shared/i18n"
	"github.com/hanzoai/team/server/public/shared/request"
	"github.com/hanzoai/team/server/v8/channels/app"
)

type DndProvider struct {
}

const (
	CmdDND = "dnd"
)

func init() {
	app.RegisterCommandProvider(&DndProvider{})
}

func (*DndProvider) GetTrigger() string {
	return CmdDND
}

func (*DndProvider) GetCommand(a *app.App, T i18n.TranslateFunc) *model.Command {
	return &model.Command{
		Trigger:          CmdDND,
		AutoComplete:     true,
		AutoCompleteDesc: T("api.command_dnd.desc"),
		DisplayName:      T("api.command_dnd.name"),
	}
}

func (*DndProvider) DoCommand(a *app.App, rctx request.CTX, args *model.CommandArgs, message string) *model.CommandResponse {
	a.SetStatusDoNotDisturb(args.UserId)

	return &model.CommandResponse{ResponseType: model.CommandResponseTypeEphemeral, Text: args.T("api.command_dnd.success")}
}
