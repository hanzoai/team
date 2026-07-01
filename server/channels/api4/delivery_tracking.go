// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package api4

import (
	"encoding/json"
	"net/http"

	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/shared/mlog"
)

func (api *API) InitDeliveryTracking() {
	if !api.srv.Config().FeatureFlags.PostDeliveryTracking {
		return
	}

	api.BaseRoutes.DeliveryTracking.Handle("/config", api.APISessionRequired(getDeliveryTrackingConfig)).Methods(http.MethodGet)
	api.BaseRoutes.DeliveryTracking.Handle("/config", api.APISessionRequired(saveDeliveryTrackingConfig)).Methods(http.MethodPut)
}

func requireDeliveryTrackingAvailable(c *Context) {
	if !model.MinimumEnterpriseAdvancedLicense(c.App.License()) {
		c.Err = model.NewAppError("requireDeliveryTrackingAvailable", "api.delivery_tracking.error.license", nil, "", http.StatusNotImplemented)
		return
	}
}

func getDeliveryTrackingConfig(c *Context, w http.ResponseWriter, r *http.Request) {
	requireDeliveryTrackingAvailable(c)
	if c.Err != nil {
		return
	}

	if !c.App.SessionHasPermissionTo(*c.AppContext.Session(), model.PermissionManageSystem) {
		c.SetPermissionError(model.PermissionManageSystem)
		return
	}

	config, appErr := c.App.GetDeliveryTrackingConfig(c.AppContext)
	if appErr != nil {
		c.Err = appErr
		return
	}

	if err := json.NewEncoder(w).Encode(config); err != nil {
		c.Logger.Warn("Error while writing response", mlog.Err(err))
		c.Err = model.NewAppError("getDeliveryTrackingConfig", "api.encoding_error", nil, "", http.StatusInternalServerError).Wrap(err)
	}
}

func saveDeliveryTrackingConfig(c *Context, w http.ResponseWriter, r *http.Request) {
	requireDeliveryTrackingAvailable(c)
	if c.Err != nil {
		return
	}

	var config model.DeliveryTrackingConfig
	if err := json.NewDecoder(r.Body).Decode(&config); err != nil {
		c.SetInvalidParamWithErr("config", err)
		return
	}

	auditRec := c.MakeAuditRecord(model.AuditEventUpdateDeliveryTrackingConfig, model.AuditStatusFail)
	defer c.LogAuditRec(auditRec)

	if !c.App.SessionHasPermissionTo(*c.AppContext.Session(), model.PermissionManageSystem) {
		c.SetPermissionError(model.PermissionManageSystem)
		return
	}

	config.SetDefaults()
	if appErr := config.IsValid(); appErr != nil {
		c.Err = appErr
		return
	}

	if appErr := c.App.SaveDeliveryTrackingConfig(c.AppContext, config); appErr != nil {
		c.Err = appErr
		return
	}

	auditRec.Success()
	writeOKResponse(w)
}
