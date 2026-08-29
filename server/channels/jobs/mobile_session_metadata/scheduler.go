// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package mobile_session_metadata

import (
	"time"

	"github.com/hanzoteam/server/server/public/model"
	"github.com/hanzoteam/server/server/v8/channels/jobs"
)

const schedFreq = 24 * time.Hour

func MakeScheduler(jobServer *jobs.JobServer) *jobs.PeriodicScheduler {
	isEnabled := func(cfg *model.Config) bool {
		return *cfg.MetricsSettings.EnableClientMetrics
	}
	return jobs.NewPeriodicScheduler(jobServer, model.JobTypeMobileSessionMetadata, schedFreq, isEnabled)
}
