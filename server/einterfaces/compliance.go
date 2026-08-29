// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package einterfaces

import (
	"github.com/hanzoteam/server/server/public/model"
	"github.com/hanzoteam/server/server/public/shared/request"
)

type ComplianceInterface interface {
	StartComplianceDailyJob()
	RunComplianceJob(rctx request.CTX, job *model.Compliance) *model.AppError
}
