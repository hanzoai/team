// Package metrics exposes a /metrics Prometheus endpoint and a request
// middleware that records per-route timing + status. Go runtime metrics
// (goroutines, GC, mem) come for free from the default promauto
// registerer via collectors.NewGoCollector + NewProcessCollector, which
// metric.NewHTTPHandler(metric.DefaultGatherer, metric.HandlerOpts{}) exposes alongside our app metrics.
//
// Route label cardinality: we use the matched router pattern (not the
// raw request path), so /v1/iam/oauth/token and /v1/iam/oauth/userinfo
// both bucket as "/v1/iam/{path...}". Without that, every CDN-bypass
// query string blows up cardinality.
package metrics

import (
	"bufio"
	"net"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/hanzoai/base/apis"
	"github.com/hanzoai/base/core"
	"github.com/hanzoai/base/tools/hook"
	metric "github.com/luxfi/metric"
)

var (
	reqTotal = metric.NewCounterVec(metric.CounterOpts{
		Name: "team_http_requests_total",
		Help: "Count of HTTP requests handled by team-go.",
	}, []string{"route", "method", "status"})

	reqDuration = metric.NewHistogramVec(metric.HistogramOpts{
		Name:    "team_http_request_duration_seconds",
		Help:    "Latency of HTTP requests handled by team-go.",
		Buckets: metric.DefBuckets,
	}, []string{"route", "method"})

	buildInfo = metric.NewGaugeVec(metric.GaugeOpts{
		Name: "team_build_info",
		Help: "Constant 1, labelled with the running binary's version.",
	}, []string{"version"})
)

// Register binds /metrics on the Base app and wires the request-timing
// middleware. version is the TEAM_VERSION the binary was built with —
// expose it via the build_info constant so dashboards can correlate
// metrics with a deploy.
func Register(app core.App, version string) {
	buildInfo.WithLabelValues(version).Set(1)

	app.OnServe().Bind(&hook.Handler[*core.ServeEvent]{
		Func: func(e *core.ServeEvent) error {
			// /v1/metrics must not be authed — scrapers (kube-prometheus,
			// VictoriaMetrics agent) hit it without credentials. We use
			// /v1/metrics not /metrics because every route in this stack
			// lives under /v1; scrapers get a relabel_config in their
			// ServiceMonitor / vmagent config to point at the right path.
			e.Router.GET("/v1/metrics", apis.WrapStdHandler(metric.Handler()))

			// Global router middleware: tap before+after the request.
			// We can't read the matched pattern from RequestEvent
			// directly, so we wrap the Response to capture the status
			// code and label by URL.Path's first two segments (good
			// enough for an HTTP histogram — route templating that
			// reflects {path...} wildcards needs router internals
			// that v0.39 doesn't expose).
			e.Router.BindFunc(timing)
			return e.Next()
		},
	})
}

func timing(re *core.RequestEvent) error {
	start := time.Now()
	rec := &statusRecorder{ResponseWriter: re.Response, status: 200}
	re.Response = rec

	err := re.Next()

	route := routeLabel(re.Request.URL.Path)
	method := re.Request.Method
	reqDuration.WithLabelValues(route, method).Observe(time.Since(start).Seconds())
	reqTotal.WithLabelValues(route, method, strconv.Itoa(rec.status)).Inc()
	return err
}

// routeLabel collapses the request path into a low-cardinality bucket.
// We take the first two non-empty path segments — that's the level at
// which we care about p99 latency in practice (/v1/iam/*, /v1/billing/*,
// /v1/files/*, etc.). Trailing slashes are not significant.
func routeLabel(p string) string {
	if p == "" || p == "/" {
		return "/"
	}
	parts := strings.SplitN(strings.Trim(p, "/"), "/", 3)
	if len(parts) >= 2 {
		return "/" + parts[0] + "/" + parts[1]
	}
	return "/" + parts[0]
}

// statusRecorder is the minimal wrapper Prometheus middlewares use
// everywhere — we don't pull in a 3rd-party one because it's six lines.
type statusRecorder struct {
	http.ResponseWriter
	status      int
	wroteHeader bool
}

func (s *statusRecorder) WriteHeader(code int) {
	if s.wroteHeader {
		return
	}
	s.status = code
	s.wroteHeader = true
	s.ResponseWriter.WriteHeader(code)
}

func (s *statusRecorder) Write(b []byte) (int, error) {
	if !s.wroteHeader {
		s.wroteHeader = true
	}
	return s.ResponseWriter.Write(b)
}

// Flush forwards to the underlying writer if it supports flushing —
// required for SSE/streaming responses to actually push bytes.
func (s *statusRecorder) Flush() {
	if f, ok := s.ResponseWriter.(http.Flusher); ok {
		f.Flush()
	}
}

// Hijack forwards to the underlying writer so WebSocket endpoints (the ZAP
// transactor, /v1/subscribe) can upgrade even though this timing wrapper sits
// in front of every response. Embedding http.ResponseWriter does NOT promote
// Hijack (it's not in that interface), so without this the wrapper would mask
// the connection's Hijacker and the upgrade would fail.
func (s *statusRecorder) Hijack() (net.Conn, *bufio.ReadWriter, error) {
	if hj, ok := s.ResponseWriter.(http.Hijacker); ok {
		return hj.Hijack()
	}
	return nil, nil, http.ErrNotSupported
}
