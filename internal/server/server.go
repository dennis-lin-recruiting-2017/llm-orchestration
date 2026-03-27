package server

import (
	"embed"
	"encoding/json"
	"io"
	"io/fs"
	"log"
	"net/http"
	"path/filepath"
	"strings"
	"time"

	"llm-orchestration/internal/guardrails"
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
		Runtime:     guardrails.Runtime{},
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
	mux.HandleFunc("/api/workflow-logs", s.HandleWorkflowLogs)
	mux.HandleFunc("/api/workflow-logs/", s.HandleWorkflowLogDetail)
	mux.HandleFunc("/api/workflows", s.HandleWorkflowCollection)
	mux.HandleFunc("/api/workflows/", s.HandleWorkflowItem)
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

func (s *Server) HandleSearch(w http.ResponseWriter, r *http.Request) {
	q := strings.TrimSpace(r.URL.Query().Get("q"))
	if q == "" {
		WriteJSON(w, http.StatusOK, map[string]any{"query": q, "mode": "keyword-fallback", "results": []models.Document{}})
		return
	}
	if emb, ok := s.DocsByQuery[strings.ToLower(q)]; ok {
		WriteJSON(w, http.StatusOK, map[string]any{"query": q, "mode": "vector", "results": TopVectorMatches(s.Docs, emb, 5)})
		return
	}

	ql := strings.ToLower(q)
	results := make([]models.Document, 0, 5)
	for _, d := range s.Docs {
		if strings.Contains(strings.ToLower(d.Title), ql) || strings.Contains(strings.ToLower(d.Body), ql) || strings.Contains(strings.ToLower(d.Category), ql) {
			item := d
			item.Embedding = nil
			results = append(results, item)
		}
	}
	WriteJSON(w, http.StatusOK, map[string]any{"query": q, "mode": "keyword-fallback", "results": results})
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
				RestoreVersion int `json:"restoreVersion"`
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

		requestID := GenerateID("req")
		if s.LogDB != nil {
			if err := s.LogDB.InsertRequest(requestID, wf.ID, wf.PromptTemplateID, activePromptVersionNumber, r.Method, r.URL.Path, requestBody); err != nil {
				log.Printf("log workflow request: %v", err)
			}
		}

		inputPayload := map[string]any{}
		for k, v := range req.Input {
			inputPayload[k] = v
		}
		inputPayload["text"] = req.Text

		for _, gr := range selectedGuardrails(wf.InputGuardrailIDs, inputs) {
			passed, engine, err := s.Runtime.Execute(gr, inputPayload, "")
			detail := "ok"
			if err != nil {
				passed = false
				detail = err.Error()
			}
			if s.LogDB != nil {
				if err := s.LogDB.InsertInputGuardrailResult(requestID, wf.ID, gr.ID, gr.Type, passed, engine, detail); err != nil {
					log.Printf("log input guardrail result: %v", err)
				}
			}
		}

		resp := models.WorkflowInvokeResponse{
			WorkflowID:            wf.ID,
			PromptTemplateID:      wf.PromptTemplateID,
			PromptTemplateVersion: activePromptVersionNumber,
			InputGuardrails:       append([]string(nil), wf.InputGuardrailIDs...),
			OutputGuardrails:      append([]string(nil), wf.OutputGuardrailIDs...),
			InputTypes:            s.guardrailTypes(wf.InputGuardrailIDs, inputs),
			OutputTypes:           s.guardrailTypes(wf.OutputGuardrailIDs, outputs),
			Status:                "accepted",
			Echo:                  req.Text,
		}

		for _, gr := range selectedGuardrails(wf.OutputGuardrailIDs, outputs) {
			passed, engine, err := s.Runtime.Execute(gr, req.Input, resp.Echo)
			detail := "ok"
			if err != nil {
				passed = false
				detail = err.Error()
			}
			if s.LogDB != nil {
				if err := s.LogDB.InsertOutputGuardrailResult(requestID, wf.ID, gr.ID, gr.Type, passed, engine, detail); err != nil {
					log.Printf("log output guardrail result: %v", err)
				}
			}
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
