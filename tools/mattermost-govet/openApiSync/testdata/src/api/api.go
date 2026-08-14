// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package api

import (
	"context"
	"net/http"

	"github.com/gorilla/mux"
)

type Routes struct {
	Root    *mux.Router // ''
	APIRoot *mux.Router // 'v1/team'

	Users  *mux.Router // 'v1/team/userzs'
	Groups *mux.Router // 'v1/team/groups'
}

type API struct {
	BaseRoutes *Routes
}

func (*API) ApiSessionRequired(h func(*context.Context, http.ResponseWriter, *http.Request)) http.Handler {
	return nil
}
func Init(root *mux.Router) *API {
	api := &API{
		BaseRoutes: &Routes{},
	}
	api.BaseRoutes.Root = root
	api.BaseRoutes.APIRoot = root.PathPrefix("v1/team").Subrouter()

	api.BaseRoutes.Users = api.BaseRoutes.APIRoot.PathPrefix("/users").Subrouter()   // want "PathPrefix doesn't match field comment for field 'Users': 'v1/team/users' vs 'v1/team/userzs'"
	api.BaseRoutes.Groups = api.BaseRoutes.APIRoot.PathPrefix("/gruops").Subrouter() // want "PathPrefix doesn't match field comment for field 'Groups': 'v1/team/gruops' vs 'v1/team/groups'"
	api.InitUsers()
	return api
}

func _() {
	_ = Init(nil)
}
