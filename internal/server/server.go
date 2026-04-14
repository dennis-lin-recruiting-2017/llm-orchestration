package server

import (
	"context"
	"embed"
	"encoding/json"
	"fmt"
	"io"
	"io/fs"
	"log"
	"net/http"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"llm-orchestration/internal/guardrails"
	"llm-orchestration/internal/llm"
	"llm-orchestration/internal/logdb"
	"llm-orchestration/internal/models"
	"llm-orchestration/internal/store"
)

type Server struct {
	StaticFS    http.Handler
	PublicURL   string
	APIURL      string
	Docs        []models.Document
	DocsByQuery map[string][]float64
	Templates   *store.JSONStore[models.VersionedItem]
	Inputs      *store.JSONStore[models.VersionedItem]
	Outputs     *store.JSONStore[models.VersionedItem]
	Workflows   *store.JSONStore[models.Workflow]
	Connections *store.JSONStore[models.LLMConnections]
	LogDB       *logdb.DB
	Runtime     guardrails.Runtime
}

func New(
		embeddedFiles embed.FS,
		publicURL, apiURL string,
		docs []models.Document,
		docsByQuery map[string][]float64,
		templates *store.JSONStore[models.VersionedItem],
		inputs *store.JSONStore[models.VersionedItem],
		outputs *store.JSONStore[models.VersionedItem],
		workflows *store.JSONStore[models.Workflow],
		connections *store.JSONStore[models.LLMConnections],
		logs *logdb.DB,
) (*Server, error) {
	staticRoot, err := fs.Sub(embeddedFiles, "web/dist")
	if err != nil {
		return nil, err
	}
	return &Server{
		StaticFS:    http.FileServer(http.FS(staticRoot)),
		PublicURL:   publicURL,
		APIURL:      apiURL,
		Docs:        docs,
		DocsByQuery: docsByQuery,
		Templates:   templates,
		Inputs:      inputs,
		Outputs:     outputs,
		Workflows:   workflows,
		Connections: connections,
		LogDB:       logs,
		Runtime: guardrails.Runtime{
			ActiveLLMConn: func() (models.ProviderConnection, bool) {
				connections.Mu.RLock()
				defer connections.Mu.RUnlock()
				if len(connections.Data) == 0 {
					return models.ProviderConnection{}, false
				}
				c := connections.Data[0]
				switch c.Provider {
				case "Ollama":
					return c.Ollama, true
				default: // "LMStudio" and anything unrecognised
					return c.LMStudio, true
				}
			},
		},
	}, nil
}

func (s *Server) WebMux() *http.ServeMux {
	mux := http.NewServeMux()
	mux.HandleFunc("/config.json", s.HandleWebConfig)
	mux.Handle("/", s.SPAHandler())
	return mux
}

func (s *Server) APIMux() *http.ServeMux {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/health", s.HandleHealth)
	mux.HandleFunc("/api/documents", s.HandleDocuments)
	mux.HandleFunc("/api/search", s.HandleSearch)
	mux.HandleFunc("/api/templates", s.HandleVersionedCollection(s.Templates, false))
	mux.HandleFunc("/api/templates/", s.HandleVersionedItem(s.Templates, false))
	mux.HandleFunc("/api/input-guardrails", s.HandleVersionedCollection(s.Inputs, true))
	mux.HandleFunc("/api/input-guardrails/", s.HandleVersionedItem(s.Inputs, true))
	mux.HandleFunc("/api/output-guardrails", s.HandleVersionedCollection(s.Outputs, true))
	mux.HandleFunc("/api/output-guardrails/", s.HandleVersionedItem(s.Outputs, true))
	mux.HandleFunc("/api/llm-connections", s.HandleLLMConnections)
	mux.HandleFunc("/api/llm-connections/ping", s.HandleLLMPing)
	mux.HandleFunc("/api/workflow-logs", s.HandleWorkflowLogs)
	mux.HandleFunc("/api/workflow-logs/", s.HandleWorkflowLogDetail)
	mux.HandleFunc("/api/workflows", s.HandleWorkflowCollection)
	mux.HandleFunc("/api/workflows/", s.HandleWorkflowItem)
	mux.HandleFunc("/api/run-template", s.HandleRunTemplate)
	mux.HandleFunc("/api/run-guardrail", s.HandleRunGuardrail)
	mux.HandleFunc("/ai/v1/workflow/", s.HandleWorkflowEndpoint)
	return mux
}

func (s *Server) HandleWebConfig(w http.ResponseWriter, _ *http.Request) {
	WriteJSON(w, http.StatusOK, models.AppConfig{
		APIBaseURL: s.APIURL,
		WebBaseURL: s.PublicURL,
	})
}

func (s *Server) SPAHandler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		expiry := time.Date(2026, time.April, 15, 23, 59, 0, 0, time.UTC)
		if time.Now().UTC().After(expiry) {
			w.Header().Set("Content-Type", "text/html; charset=utf-8")
			_, _ = io.WriteString(w, `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Demo expired</title>
  </head>
  <body style="font-family: system-ui, sans-serif; background: #0b1020; color: #e7ecff; display: grid; place-items: center; min-height: 100vh; margin: 0;">
    <div style="text-align: center;">
      <h1>Demo expired</h1>
      <p>This demo is no longer available.</p>
      <p>Please contact <a href="mailto:dennis.lin@dhcs.ca.gov">Dennis Lin</a> if you would like to see an updated version.</p>"
    </div>
  </body>
</html>`)
			return
		}

		if r.URL.Path == "/" || r.URL.Path == "/index.html" || filepath.Ext(r.URL.Path) != "" {
			s.StaticFS.ServeHTTP(w, r)
			return
		}
		r2 := r.Clone(r.Context())
		r2.URL.Path = "/"
		s.StaticFS.ServeHTTP(w, r2)
	})
}

func (s *Server) HandleHealth(w http.ResponseWriter, _ *http.Request) {
	WriteJSON(w, http.StatusOK, map[string]any{
		"ok":      true,
		"webURL":  s.PublicURL,
		"apiURL":  s.APIURL,
		"version": "v0013",
	})
}

func (s *Server) HandleDocuments(w http.ResponseWriter, _ *http.Request) {
	docs := append([]models.Document(nil), s.Docs...)
	for i := range docs {
		docs[i].Embedding = nil
	}
	WriteJSON(w, http.StatusOK, map[string]any{"documents": docs})
}

// tokenize splits text into lowercase words, stripping punctuation.
func tokenize(s string) map[string]bool {
	words := make(map[string]bool)
	for _, w := range strings.Fields(strings.ToLower(s)) {
		w = strings.Trim(w, ".,!?;:\"'()-")
		if len(w) > 1 {
			words[w] = true
		}
	}
	return words
}

// queryEmbedding builds a query vector for any freeform string:
//  1. Exact keyword map match.
//  2. Average known-keyword vectors whose keyword appears in q.
//  3. Weighted average of all document embeddings by word-overlap with q.
func (s *Server) queryEmbedding(q string) []float64 {
	ql := strings.ToLower(strings.TrimSpace(q))
	if emb, ok := s.DocsByQuery[ql]; ok {
		return emb
	}

	// Try blending any known keyword vectors present in the query.
	var kwSum []float64
	kwCount := 0
	for kw, emb := range s.DocsByQuery {
		if strings.Contains(ql, kw) {
			if kwSum == nil {
				kwSum = make([]float64, len(emb))
			}
			for i, v := range emb {
				kwSum[i] += v
			}
			kwCount++
		}
	}
	if kwCount > 0 {
		for i := range kwSum {
			kwSum[i] /= float64(kwCount)
		}
		return kwSum
	}

	// Freeform: weighted average of document embeddings by token overlap.
	queryTokens := tokenize(q)
	if len(queryTokens) == 0 {
		return nil
	}
	var dim int
	for _, d := range s.Docs {
		if len(d.Embedding) > 0 {
			dim = len(d.Embedding)
			break
		}
	}
	if dim == 0 {
		return nil
	}
	result := make([]float64, dim)
	totalWeight := 0.0
	for _, d := range s.Docs {
		docTokens := tokenize(d.Title + " " + d.Body + " " + d.Category)
		overlap := 0
		for w := range queryTokens {
			if docTokens[w] {
				overlap++
			}
		}
		if overlap == 0 {
			continue
		}
		weight := float64(overlap)
		totalWeight += weight
		for i, v := range d.Embedding {
			result[i] += v * weight
		}
	}
	if totalWeight == 0 {
		return nil
	}
	for i := range result {
		result[i] /= totalWeight
	}
	return result
}

func (s *Server) keywordSearch(q string) []models.Document {
	ql := strings.ToLower(q)
	tokens := tokenize(q)
	type scored struct {
		doc   models.Document
		score int
	}
	var hits []scored
	for _, d := range s.Docs {
		tl := strings.ToLower(d.Title)
		bl := strings.ToLower(d.Body)
		cl := strings.ToLower(d.Category)
		// Phrase-level scoring
		score := 0
		if strings.Contains(tl, ql) {
			score += 4
		}
		if strings.Contains(bl, ql) {
			score += 2
		}
		if strings.Contains(cl, ql) {
			score += 1
		}
		// Token-level scoring for multi-word queries
		for tok := range tokens {
			if strings.Contains(tl, tok) {
				score += 2
			}
			if strings.Contains(bl, tok) {
				score += 1
			}
		}
		if score == 0 {
			continue
		}
		item := d
		item.Embedding = nil
		// Express relevance as a distance in [0,1): higher score → lower distance.
		item.Distance = 1.0 / float64(1+score)
		hits = append(hits, scored{doc: item, score: score})
	}
	sort.Slice(hits, func(i, j int) bool { return hits[i].score > hits[j].score })
	results := make([]models.Document, len(hits))
	for i, h := range hits {
		results[i] = h.doc
	}
	return results
}

func (s *Server) HandleSearch(w http.ResponseWriter, r *http.Request) {
	q := strings.TrimSpace(r.URL.Query().Get("q"))
	mode := strings.ToLower(strings.TrimSpace(r.URL.Query().Get("mode")))
	if q == "" {
		WriteJSON(w, http.StatusOK, map[string]any{"query": q, "mode": mode, "results": []models.Document{}})
		return
	}

	if mode == "keyword" {
		WriteJSON(w, http.StatusOK, map[string]any{"query": q, "mode": "keyword", "results": s.keywordSearch(q)})
		return
	}

	// vector mode (default)
	if emb := s.queryEmbedding(q); emb != nil {
		WriteJSON(w, http.StatusOK, map[string]any{"query": q, "mode": "vector", "results": TopVectorMatches(s.Docs, emb, 10)})
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"query": q, "mode": "vector-no-embedding", "results": []models.Document{}})
}

func (s *Server) HandleVersionedCollection(st *store.JSONStore[models.VersionedItem], typed bool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			st.Mu.RLock()
			items := append([]models.VersionedItem(nil), st.Data...)
			st.Mu.RUnlock()
			WriteJSON(w, http.StatusOK, map[string]any{"items": items})
		case http.MethodPost:
			var req struct{ Type, Name, Description, Content string }
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				WriteError(w, http.StatusBadRequest, err)
				return
			}
			now := time.Now().UTC()
			item := models.VersionedItem{
				ID:             GenerateID("itm"),
				Name:           Fallback(req.Name, "Untitled"),
				Description:    strings.TrimSpace(req.Description),
				CurrentVersion: 1,
				Versions:       []models.ItemVersion{{Version: 1, Content: strings.TrimSpace(req.Content), UpdatedAt: now}},
				UpdatedAt:      now,
			}
			if typed {
				item.Type = Fallback(req.Type, "LLM")
			}
			st.Mu.Lock()
			st.Data = append([]models.VersionedItem{item}, st.Data...)
			err := st.Save()
			st.Mu.Unlock()
			if err != nil {
				WriteError(w, http.StatusInternalServerError, err)
				return
			}
			WriteJSON(w, http.StatusCreated, item)
		default:
			MethodNotAllowed(w)
		}
	}
}

func (s *Server) HandleVersionedItem(st *store.JSONStore[models.VersionedItem], typed bool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id := PathTail(r.URL.Path)
		switch r.Method {
		case http.MethodPut:
			var req struct {
				Type, Name, Description, Content string
				RestoreVersion                   int `json:"restoreVersion"`
			}
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				WriteError(w, http.StatusBadRequest, err)
				return
			}
			st.Mu.Lock()
			defer st.Mu.Unlock()
			for i := range st.Data {
				if st.Data[i].ID != id {
					continue
				}
				if req.RestoreVersion > 0 {
					for _, v := range st.Data[i].Versions {
						if v.Version == req.RestoreVersion {
							st.Data[i].CurrentVersion = req.RestoreVersion
							st.Data[i].UpdatedAt = time.Now().UTC()
							if err := st.Save(); err != nil {
								WriteError(w, http.StatusInternalServerError, err)
								return
							}
							WriteJSON(w, http.StatusOK, st.Data[i])
							return
						}
					}
					WriteError(w, http.StatusBadRequest, http.ErrMissingFile)
					return
				}
				now := time.Now().UTC()
				st.Data[i].Name = Fallback(req.Name, st.Data[i].Name)
				st.Data[i].Description = strings.TrimSpace(req.Description)
				if typed {
					st.Data[i].Type = Fallback(req.Type, st.Data[i].Type)
				}
				nextVersion := st.Data[i].CurrentVersion + 1
				st.Data[i].Versions = append(st.Data[i].Versions, models.ItemVersion{Version: nextVersion, Content: strings.TrimSpace(req.Content), UpdatedAt: now})
				st.Data[i].CurrentVersion = nextVersion
				st.Data[i].UpdatedAt = now
				if err := st.Save(); err != nil {
					WriteError(w, http.StatusInternalServerError, err)
					return
				}
				WriteJSON(w, http.StatusOK, st.Data[i])
				return
			}
			http.NotFound(w, r)
		case http.MethodDelete:
			st.Mu.Lock()
			defer st.Mu.Unlock()
			for i := range st.Data {
				if st.Data[i].ID == id {
					st.Data = append(st.Data[:i], st.Data[i+1:]...)
					if err := st.Save(); err != nil {
						WriteError(w, http.StatusInternalServerError, err)
						return
					}
					WriteJSON(w, http.StatusOK, map[string]any{"deleted": true})
					return
				}
			}
			http.NotFound(w, r)
		default:
			MethodNotAllowed(w)
		}
	}
}

func (s *Server) HandleLLMConnections(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		s.Connections.Mu.RLock()
		var item models.LLMConnections
		if len(s.Connections.Data) > 0 {
			item = s.Connections.Data[0]
		}
		s.Connections.Mu.RUnlock()
		WriteJSON(w, http.StatusOK, item)
	case http.MethodPut:
		var req models.LLMConnections
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			WriteError(w, http.StatusBadRequest, err)
			return
		}
		req.UpdatedAt = time.Now().UTC()
		s.Connections.Mu.Lock()
		s.Connections.Data = []models.LLMConnections{req}
		err := s.Connections.Save()
		s.Connections.Mu.Unlock()
		if err != nil {
			WriteError(w, http.StatusInternalServerError, err)
			return
		}
		WriteJSON(w, http.StatusOK, req)
	default:
		MethodNotAllowed(w)
	}
}

// HandleLLMPing checks whether the configured LLM server is reachable by
// issuing a GET /v1/models request with a short timeout.
func (s *Server) HandleLLMPing(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		MethodNotAllowed(w)
		return
	}
	conn, ok := s.activeLLMConn()
	if !ok {
		WriteJSON(w, http.StatusOK, map[string]any{
			"reachable": false,
			"endpoint":  "",
			"model":     "",
			"error":     "no LLM connection configured",
		})
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 3*time.Second)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, conn.BaseURL+"/v1/models", nil)
	if err != nil {
		WriteJSON(w, http.StatusOK, map[string]any{
			"reachable": false,
			"endpoint":  conn.BaseURL,
			"model":     conn.Model,
			"error":     err.Error(),
		})
		return
	}
	resp, err := llm.DefaultClient.Do(req)
	if err != nil {
		WriteJSON(w, http.StatusOK, map[string]any{
			"reachable": false,
			"endpoint":  conn.BaseURL,
			"model":     conn.Model,
			"error":     err.Error(),
		})
		return
	}
	resp.Body.Close()
	WriteJSON(w, http.StatusOK, map[string]any{
		"reachable": true,
		"endpoint":  conn.BaseURL,
		"model":     conn.Model,
		"error":     nil,
	})
}

func (s *Server) HandleWorkflowCollection(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		s.Workflows.Mu.RLock()
		items := append([]models.Workflow(nil), s.Workflows.Data...)
		s.Workflows.Mu.RUnlock()
		WriteJSON(w, http.StatusOK, map[string]any{"items": items})
	case http.MethodPost:
		var req models.Workflow
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			WriteError(w, http.StatusBadRequest, err)
			return
		}
		now := time.Now().UTC()
		item := models.Workflow{
			ID:                 GenerateUUIDv6Like(now),
			Name:               Fallback(req.Name, "Untitled workflow"),
			Description:        strings.TrimSpace(req.Description),
			PromptTemplateID:   req.PromptTemplateID,
			InputGuardrailIDs:  req.InputGuardrailIDs,
			OutputGuardrailIDs: req.OutputGuardrailIDs,
			UpdatedAt:          now,
		}
		s.Workflows.Mu.Lock()
		s.Workflows.Data = append([]models.Workflow{item}, s.Workflows.Data...)
		err := s.Workflows.Save()
		s.Workflows.Mu.Unlock()
		if err != nil {
			WriteError(w, http.StatusInternalServerError, err)
			return
		}
		WriteJSON(w, http.StatusCreated, item)
	default:
		MethodNotAllowed(w)
	}
}

func (s *Server) HandleWorkflowItem(w http.ResponseWriter, r *http.Request) {
	id := PathTail(r.URL.Path)
	switch r.Method {
	case http.MethodPut:
		var req models.Workflow
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			WriteError(w, http.StatusBadRequest, err)
			return
		}
		s.Workflows.Mu.Lock()
		defer s.Workflows.Mu.Unlock()
		for i := range s.Workflows.Data {
			if s.Workflows.Data[i].ID == id {
				s.Workflows.Data[i].Name = Fallback(req.Name, s.Workflows.Data[i].Name)
				s.Workflows.Data[i].Description = strings.TrimSpace(req.Description)
				s.Workflows.Data[i].PromptTemplateID = req.PromptTemplateID
				s.Workflows.Data[i].InputGuardrailIDs = req.InputGuardrailIDs
				s.Workflows.Data[i].OutputGuardrailIDs = req.OutputGuardrailIDs
				s.Workflows.Data[i].UpdatedAt = time.Now().UTC()
				if err := s.Workflows.Save(); err != nil {
					WriteError(w, http.StatusInternalServerError, err)
					return
				}
				WriteJSON(w, http.StatusOK, s.Workflows.Data[i])
				return
			}
		}
		http.NotFound(w, r)
	case http.MethodDelete:
		s.Workflows.Mu.Lock()
		defer s.Workflows.Mu.Unlock()
		for i := range s.Workflows.Data {
			if s.Workflows.Data[i].ID == id {
				s.Workflows.Data = append(s.Workflows.Data[:i], s.Workflows.Data[i+1:]...)
				if err := s.Workflows.Save(); err != nil {
					WriteError(w, http.StatusInternalServerError, err)
					return
				}
				WriteJSON(w, http.StatusOK, map[string]any{"deleted": true})
				return
			}
		}
		http.NotFound(w, r)
	default:
		MethodNotAllowed(w)
	}
}

func (s *Server) promptTemplateInfo(id string) (string, int) {
	s.Templates.Mu.RLock()
	defer s.Templates.Mu.RUnlock()
	for _, item := range s.Templates.Data {
		if item.ID == id {
			return item.Name, item.CurrentVersion
		}
	}
	return "", 0
}

func (s *Server) HandleWorkflowLogs(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		MethodNotAllowed(w)
		return
	}
	if s.LogDB == nil {
		WriteJSON(w, http.StatusOK, map[string]any{"items": []any{}})
		return
	}
	items, err := s.LogDB.ListWorkflowLogs()
	if err != nil {
		WriteError(w, http.StatusInternalServerError, err)
		return
	}
	for i := range items {
		items[i].PromptTemplateName, _ = s.promptTemplateInfo(items[i].PromptTemplateID)
	}
	WriteJSON(w, http.StatusOK, map[string]any{"items": items})
}

func (s *Server) HandleWorkflowLogDetail(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		MethodNotAllowed(w)
		return
	}
	if s.LogDB == nil {
		http.NotFound(w, r)
		return
	}
	requestID := PathTail(r.URL.Path)
	detail, err := s.LogDB.GetWorkflowLogDetail(requestID)
	if err != nil {
		if strings.Contains(strings.ToLower(err.Error()), "no rows") {
			http.NotFound(w, r)
			return
		}
		WriteError(w, http.StatusInternalServerError, err)
		return
	}
	detail.PromptTemplateName, _ = s.promptTemplateInfo(detail.PromptTemplateID)
	WriteJSON(w, http.StatusOK, detail)
}

func activeVersionedItem(id string, src []models.VersionedItem) (models.VersionedItem, bool) {
	for _, item := range src {
		if item.ID == id {
			return item, true
		}
	}
	return models.VersionedItem{}, false
}

func activePromptVersion(id string, src []models.VersionedItem) (int, string) {
	for _, item := range src {
		if item.ID == id {
			for _, v := range item.Versions {
				if v.Version == item.CurrentVersion {
					return item.CurrentVersion, v.Content
				}
			}
			return item.CurrentVersion, ""
		}
	}
	return 0, ""
}

func selectedGuardrails(ids []string, src []models.VersionedItem) []models.VersionedItem {
	out := make([]models.VersionedItem, 0, len(ids))
	for _, id := range ids {
		for _, item := range src {
			if item.ID == id {
				out = append(out, item)
				break
			}
		}
	}
	return out
}

func (s *Server) guardrailTypes(ids []string, src []models.VersionedItem) []string {
	out := make([]string, 0, len(ids))
	for _, id := range ids {
		for _, item := range src {
			if item.ID == id {
				out = append(out, item.Type)
				break
			}
		}
	}
	return out
}

func (s *Server) HandleWorkflowEndpoint(w http.ResponseWriter, r *http.Request) {
	id := PathTail(r.URL.Path)
	wf, ok := s.FindWorkflow(id)
	if !ok {
		http.NotFound(w, r)
		return
	}

	s.Inputs.Mu.RLock()
	inputs := append([]models.VersionedItem(nil), s.Inputs.Data...)
	s.Inputs.Mu.RUnlock()
	s.Outputs.Mu.RLock()
	outputs := append([]models.VersionedItem(nil), s.Outputs.Data...)
	s.Outputs.Mu.RUnlock()

	s.Templates.Mu.RLock()
	_, activePromptVersionNumber := s.promptTemplateInfo(wf.PromptTemplateID)
	s.Templates.Mu.RUnlock()

	switch r.Method {
	case http.MethodGet:
		WriteJSON(w, http.StatusOK, map[string]any{
			"workflowId":            wf.ID,
			"endpoint":              "/ai/v1/workflow/" + wf.ID,
			"promptTemplateId":      wf.PromptTemplateID,
			"promptTemplateVersion": activePromptVersionNumber,
			"inputGuardrails":       wf.InputGuardrailIDs,
			"outputGuardrails":      wf.OutputGuardrailIDs,
			"inputGuardrailTypes":   s.guardrailTypes(wf.InputGuardrailIDs, inputs),
			"outputGuardrailTypes":  s.guardrailTypes(wf.OutputGuardrailIDs, outputs),
			"updatedAt":             wf.UpdatedAt,
		})
	case http.MethodPost:
		ctx, cancel := context.WithTimeout(r.Context(), 15*time.Second)
		defer cancel()

		bodyBytes, err := io.ReadAll(r.Body)
		if err != nil {
			WriteError(w, http.StatusBadRequest, err)
			return
		}
		requestBody := string(bodyBytes)

		var req models.WorkflowInvokeRequest
		if len(bodyBytes) > 0 {
			_ = json.Unmarshal(bodyBytes, &req)
		}

		// Resolve {{query}} server-side: search using rawQuery (fallback to query field).
		queryTerm := req.RawQuery
		if queryTerm == "" {
			queryTerm = req.Query
		}
		var resolvedQuery string
		var searchDurationMs int64
		ragResultSlice := []string{}
		if queryTerm != "" {
			searchStart := time.Now()
			docs := s.searchDocs(queryTerm)
			searchDurationMs = time.Since(searchStart).Microseconds()
			ragResultSlice = searchResultStrings(docs)
			if formatted := formatSearchResults(docs); formatted != "" {
				resolvedQuery = formatted
			} else {
				resolvedQuery = queryTerm
			}
		}

		requestID := GenerateID("req")
		if s.LogDB != nil {
			if err := s.LogDB.InsertRequest(requestID, wf.ID, wf.PromptTemplateID, activePromptVersionNumber, r.Method, r.URL.Path, requestBody, req.RawQuery, resolvedQuery, req.Text); err != nil {
				log.Printf("log workflow request: %v", err)
			}
		}

		inputPayload := map[string]any{}
		for k, v := range req.Input {
			inputPayload[k] = v
		}
		inputPayload["text"] = req.Text
		inputPayload["query"] = resolvedQuery

		inputGuardrailDebug := make(map[string]models.GuardrailDebugResult)
		inputBlocked := false
		for _, gr := range selectedGuardrails(wf.InputGuardrailIDs, inputs) {
			grStart := time.Now()
			result, err := s.Runtime.ExecuteDetail(ctx, gr, inputPayload, "")
			grUs := time.Since(grStart).Microseconds()
			entry := models.GuardrailDebugResult{Passed: result.Passed, Engine: result.Engine, Detail: result.Detail, DurationMs: float64(grUs) / 1000.0}
			if err != nil {
				entry = models.GuardrailDebugResult{Passed: false, Engine: result.Engine, Detail: err.Error(), DurationMs: float64(grUs) / 1000.0}
			}
			if !entry.Passed {
				inputBlocked = true
			}
			inputGuardrailDebug[gr.Name] = entry
			if s.LogDB != nil {
				if err := s.LogDB.InsertInputGuardrailResult(requestID, wf.ID, gr.ID, gr.Type, entry.Passed, entry.Engine, entry.Detail, entry.DurationMs); err != nil {
					log.Printf("log input guardrail result: %v", err)
				}
			}
		}

		// Fill prompt template and call LLM — skipped when an input guardrail blocked.
		s.Templates.Mu.RLock()
		_, promptContent := activePromptVersion(wf.PromptTemplateID, s.Templates.Data)
		s.Templates.Mu.RUnlock()

		var llmOutput, finalPrompt string
		var inferenceDurationUs int64
		var inferenceEndpoint, inferenceModel string
		if !inputBlocked {
			if conn, ok := s.activeLLMConn(); ok && promptContent != "" {
				inferenceEndpoint = conn.BaseURL
				inferenceModel = conn.Model
				finalPrompt = strings.ReplaceAll(promptContent, "{{text}}", req.Text)
				finalPrompt = strings.ReplaceAll(finalPrompt, "{{query}}", resolvedQuery)
				inferenceStart := time.Now()
				result, err := llm.Chat(ctx, conn.BaseURL, conn.Model, []llm.Message{
					{Role: "user", Content: finalPrompt},
				})
				inferenceDurationUs = time.Since(inferenceStart).Microseconds()
				if err != nil {
					log.Printf("workflow LLM inference: %v", err)
				} else {
					llmOutput = result
				}
			}
		}
		if s.LogDB != nil {
			if err := s.LogDB.UpdateRequestInference(requestID, finalPrompt, llmOutput, inferenceEndpoint, inferenceModel, searchDurationMs, inferenceDurationUs); err != nil {
				log.Printf("log workflow inference: %v", err)
			}
		}

		outputGuardrailDebug := make(map[string]models.GuardrailDebugResult)
		outputBlocked := false
		if !inputBlocked {
			for _, gr := range selectedGuardrails(wf.OutputGuardrailIDs, outputs) {
				grStart := time.Now()
				result, err := s.Runtime.ExecuteDetail(ctx, gr, inputPayload, llmOutput)
				grUs := time.Since(grStart).Microseconds()
				entry := models.GuardrailDebugResult{Passed: result.Passed, Engine: result.Engine, Detail: result.Detail, DurationMs: float64(grUs) / 1000.0}
				if err != nil {
					entry = models.GuardrailDebugResult{Passed: false, Engine: result.Engine, Detail: err.Error(), DurationMs: float64(grUs) / 1000.0}
				}
				if !entry.Passed {
					outputBlocked = true
				}
				outputGuardrailDebug[gr.Name] = entry
				if s.LogDB != nil {
					if err := s.LogDB.InsertOutputGuardrailResult(requestID, wf.ID, gr.ID, gr.Type, entry.Passed, entry.Engine, entry.Detail, entry.DurationMs); err != nil {
						log.Printf("log output guardrail result: %v", err)
					}
				}
			}
		}

		status := "accepted"
		if inputBlocked || outputBlocked {
			status = "rejected"
		}

		resp := models.WorkflowInvokeResponse{
			WorkflowID:            wf.ID,
			PromptTemplateID:      wf.PromptTemplateID,
			PromptTemplateVersion: activePromptVersionNumber,
			InputGuardrails:       append([]string(nil), wf.InputGuardrailIDs...),
			OutputGuardrails:      append([]string(nil), wf.OutputGuardrailIDs...),
			InputTypes:            s.guardrailTypes(wf.InputGuardrailIDs, inputs),
			OutputTypes:           s.guardrailTypes(wf.OutputGuardrailIDs, outputs),
			Status:                status,
			Echo:                  req.Text,
			LLMOutput:             llmOutput,
			Metadata: models.WorkflowMetadata{
				QueryTimeMs:       float64(searchDurationMs) / 1000.0,
				InferenceTimeMs:   float64(inferenceDurationUs) / 1000.0,
				Model:             inferenceModel,
				InferenceEndpoint: inferenceEndpoint,
			},
			Debug: models.WorkflowDebug{
				RAGResults:       ragResultSlice,
				InputGuardrails:  inputGuardrailDebug,
				OutputGuardrails: outputGuardrailDebug,
			},
		}

		responseBytes, err := json.Marshal(resp)
		if err != nil {
			WriteError(w, http.StatusInternalServerError, err)
			return
		}
		if s.LogDB != nil {
			if err := s.LogDB.InsertResponse(requestID, wf.ID, http.StatusOK, string(responseBytes)); err != nil {
				log.Printf("log workflow response: %v", err)
			}
		}
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		w.Header().Set("X-Request-Id", requestID)
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write(responseBytes)
	default:
		MethodNotAllowed(w)
	}
}

func (s *Server) HandleRunTemplate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		MethodNotAllowed(w)
		return
	}
	var req struct {
		Code  string `json:"code"`
		Text  string `json:"text"`
		Query string `json:"query"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		WriteError(w, http.StatusBadRequest, err)
		return
	}

	conn, ok := s.activeLLMConn()
	if !ok {
		WriteJSON(w, http.StatusOK, map[string]any{"output": "", "error": "no LLM connection configured"})
		return
	}

	prompt := strings.ReplaceAll(req.Code, "{{text}}", req.Text)
	prompt = strings.ReplaceAll(prompt, "{{query}}", req.Query)
	output, err := llm.Chat(r.Context(), conn.BaseURL, conn.Model, []llm.Message{
		{Role: "user", Content: prompt},
	})
	if err != nil {
		WriteJSON(w, http.StatusOK, map[string]any{"output": "", "error": err.Error()})
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"output": output, "error": nil})
}

func (s *Server) HandleRunGuardrail(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		MethodNotAllowed(w)
		return
	}
	var req struct {
		Type string `json:"type"`
		Code string `json:"code"`
		Text string `json:"text"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		WriteError(w, http.StatusBadRequest, err)
		return
	}
	item := models.VersionedItem{
		ID:             "run-test",
		Type:           req.Type,
		CurrentVersion: 1,
		Versions:       []models.ItemVersion{{Version: 1, Content: req.Code}},
	}
	result, err := s.Runtime.ExecuteDetail(r.Context(), item, map[string]any{"text": req.Text}, req.Text)
	if err != nil {
		WriteJSON(w, http.StatusOK, map[string]any{"passed": false, "engine": "", "detail": "", "error": err.Error()})
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"passed": result.Passed, "engine": result.Engine, "detail": result.Detail, "error": nil})
}

func (s *Server) activeLLMConn() (models.ProviderConnection, bool) {
	s.Connections.Mu.RLock()
	defer s.Connections.Mu.RUnlock()
	if len(s.Connections.Data) == 0 {
		return models.ProviderConnection{}, false
	}
	c := s.Connections.Data[0]
	if c.Provider == "Ollama" {
		return c.Ollama, true
	}
	return c.LMStudio, true
}

// searchDocs runs keyword/vector search and returns matching documents.
func (s *Server) searchDocs(q string) []models.Document {
	if q == "" {
		return []models.Document{}
	}
	if emb := s.queryEmbedding(q); emb != nil {
		return TopVectorMatches(s.Docs, emb, 5)
	}
	return s.keywordSearch(q)
}

// searchResultStrings converts documents into a slice of formatted strings,
// one entry per document, matching the frontend fetchFormattedSearchResults format.
func searchResultStrings(docs []models.Document) []string {
	out := make([]string, len(docs))
	for i, d := range docs {
		out[i] = fmt.Sprintf("[%d] %s\n%s", i+1, d.Title, d.Body)
	}
	return out
}

// formatSearchResults joins the per-document strings into a single block
// suitable for substituting into a prompt template.
func formatSearchResults(docs []models.Document) string {
	return strings.Join(searchResultStrings(docs), "\n\n")
}

func (s *Server) FindWorkflow(id string) (models.Workflow, bool) {
	s.Workflows.Mu.RLock()
	defer s.Workflows.Mu.RUnlock()
	for _, wf := range s.Workflows.Data {
		if wf.ID == id {
			return wf, true
		}
	}
	return models.Workflow{}, false
}
