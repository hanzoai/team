package pluginapi_test

import (
	"testing"

	"github.com/hanzoai/team/server/public/model"
	"github.com/hanzoai/team/server/public/plugin"
	"github.com/hanzoai/team/server/public/plugin/plugintest"
	"github.com/hanzoai/team/server/public/pluginapi"
	"github.com/hanzoai/team/server/public/shared/mlog"
)

func TestAuditService(t *testing.T) {
	t.Run("record", func(t *testing.T) {
		rec := plugin.MakeAuditRecord("test.event", model.AuditStatusSuccess)

		api := &plugintest.API{}
		api.On("LogAuditRec", rec).Return()
		defer api.AssertExpectations(t)

		client := pluginapi.NewClient(api, &plugintest.Driver{})
		client.Audit.Record(rec)
	})

	t.Run("record with level", func(t *testing.T) {
		rec := plugin.MakeAuditRecord("test.event", model.AuditStatusFail)
		level := mlog.LvlAuditCLI

		api := &plugintest.API{}
		api.On("LogAuditRecWithLevel", rec, level).Return()
		defer api.AssertExpectations(t)

		client := pluginapi.NewClient(api, &plugintest.Driver{})
		client.Audit.RecordWithLevel(rec, level)
	})
}
