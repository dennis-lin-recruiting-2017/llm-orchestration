package app

import (
	"embed"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"log"
	"net"
	"net/http"

	"llm-orchestration/internal/logdb"
	"llm-orchestration/internal/models"
	"llm-orchestration/internal/server"
	"llm-orchestration/internal/store"
)

func docsByQuery() map[string][]float64 {
	return map[string][]float64{
		"routing": {0.90, 0.10, 0.14, 0.05},
		"agents": {0.88, 0.18, 0.15, 0.05},
		"memory": {0.12, 0.91, 0.11, 0.12},
		"retrieval": {0.12, 0.25, 0.91, 0.21},
		"evaluation": {0.15, 0.10, 0.18, 0.94},
		"orchestration": {0.85, 0.20, 0.20, 0.08},
	}
}

func loadDocs(embeddedFiles embed.FS) ([]models.Document, error) {
	data, err := embeddedFiles.ReadFile("db/seed.json")
	if err != nil { return nil, err }
	var docs []models.Document
	return docs, json.Unmarshal(data, &docs)
}

func RunWithFS(embeddedFiles embed.FS) {
	webHost := flag.String("web-host", "127.0.0.1", "Host interface for the web UI server")
	webPort := flag.Int("web-port", 8080, "Port for the web UI server")
	apiHost := flag.String("api-host", "127.0.0.1", "Host interface for the API server")
	apiPort := flag.Int("api-port", 8081, "Port for the API server")
	noBrowser := flag.Bool("no-browser", false, "Disable automatic browser launch")
	flag.Usage = func() {
		fmt.Fprintf(flag.CommandLine.Output(), "llm-orchestration v0013\n\n")
		fmt.Fprintf(flag.CommandLine.Output(), "Starts separate web and API servers.\n\nUsage:\n  llm-orchestration [flags]\n\nFlags:\n")
		flag.PrintDefaults()
	}
	flag.Parse()

	webAddr := net.JoinHostPort(*webHost, fmt.Sprintf("%d", *webPort))
	apiAddr := net.JoinHostPort(*apiHost, fmt.Sprintf("%d", *apiPort))

	docs, err := loadDocs(embeddedFiles)
	if err != nil { log.Fatal(err) }
	templates, err := store.LoadStore[models.VersionedItem](embeddedFiles, "templates.json", "db/templates.json")
	if err != nil { log.Fatal(err) }
	inputs, err := store.LoadStore[models.VersionedItem](embeddedFiles, "input_guardrails.json", "db/input_guardrails.json")
	if err != nil { log.Fatal(err) }
	outputs, err := store.LoadStore[models.VersionedItem](embeddedFiles, "output_guardrails.json", "db/output_guardrails.json")
	if err != nil { log.Fatal(err) }
	workflows, err := store.LoadStore[models.Workflow](embeddedFiles, "workflows.json", "db/workflows.json")
	if err != nil { log.Fatal(err) }
	connections, err := store.LoadStore[models.LLMConnections](embeddedFiles, "llm_connections.json", "db/llm_connections.json")
	if err != nil { log.Fatal(err) }
	logs, err := logdb.Open()
	if err != nil { log.Fatal(err) }

	srv, err := server.New(embeddedFiles, server.NormalizePublicURL(webAddr), server.NormalizePublicURL(apiAddr), docs, docsByQuery(), templates, inputs, outputs, workflows, connections, logs)
	if err != nil { log.Fatal(err) }

	apiServer := &http.Server{Addr: apiAddr, Handler: server.LoggingMiddleware(server.WithCORS(srv.APIMux())), ReadHeaderTimeout: 5e9}
	webServer := &http.Server{Addr: webAddr, Handler: server.LoggingMiddleware(srv.WebMux()), ReadHeaderTimeout: 5e9}

	go func() {
		log.Printf("api listening on %s", srv.APIURL)
		if err := apiServer.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) { log.Fatal(err) }
	}()
	log.Printf("web listening on %s", srv.PublicURL)
	if !*noBrowser { go server.TryOpenBrowser(srv.PublicURL) }
	if err := webServer.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) { log.Fatal(err) }
}
