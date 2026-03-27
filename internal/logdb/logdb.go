package logdb

import (
	"database/sql"
	"os"
	"path/filepath"
	"strings"
	"time"

	_ "modernc.org/sqlite"

	"llm-orchestration/internal/models"
)

type DB struct {
	SQL *sql.DB
}

func Open() (*DB, error) {
	cacheRoot, err := os.UserCacheDir()
	if err != nil {
		cacheRoot = os.TempDir()
	}
	root := filepath.Join(cacheRoot, "llm-orchestration")
	if err := os.MkdirAll(root, 0o755); err != nil {
		return nil, err
	}
	dbPath := filepath.Join(root, "runtime_logs.sqlite")

	openAndMigrate := func() (*sql.DB, error) {
		db, err := sql.Open("sqlite", dbPath)
		if err != nil {
			return nil, err
		}
		if err := migrate(db); err != nil {
			_ = db.Close()
			return nil, err
		}
		return db, nil
	}

	db, err := openAndMigrate()
	if err != nil && isNotADB(err) {
		_ = os.Remove(dbPath)
		db, err = openAndMigrate()
	}
	if err != nil {
		return nil, err
	}
	return &DB{SQL: db}, nil
}

func isNotADB(err error) bool {
	if err == nil {
		return false
	}
	msg := strings.ToLower(err.Error())
	return strings.Contains(msg, "not a database") || strings.Contains(msg, "file is not a database")
}

func ignoreDuplicateColumn(err error) bool {
	if err == nil {
		return false
	}
	msg := strings.ToLower(err.Error())
	return strings.Contains(msg, "duplicate column") || strings.Contains(msg, "already exists")
}

func migrate(db *sql.DB) error {
	stmts := []string{
		`PRAGMA journal_mode=WAL;`,
		`CREATE TABLE IF NOT EXISTS workflow_request_logs (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			request_id TEXT NOT NULL,
			workflow_id TEXT NOT NULL,
			prompt_template_id TEXT NOT NULL DEFAULT '',
			prompt_template_version INTEGER NOT NULL DEFAULT 0,
			method TEXT NOT NULL,
			path TEXT NOT NULL,
			body TEXT NOT NULL,
			created_at TEXT NOT NULL
		);`,
		`ALTER TABLE workflow_request_logs ADD COLUMN prompt_template_id TEXT NOT NULL DEFAULT '';`,
		`ALTER TABLE workflow_request_logs ADD COLUMN prompt_template_version INTEGER NOT NULL DEFAULT 0;`,
		`CREATE INDEX IF NOT EXISTS idx_workflow_request_logs_request_id ON workflow_request_logs(request_id);`,
		`CREATE TABLE IF NOT EXISTS workflow_response_logs (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			request_id TEXT NOT NULL,
			workflow_id TEXT NOT NULL,
			status_code INTEGER NOT NULL,
			body TEXT NOT NULL,
			created_at TEXT NOT NULL
		);`,
		`CREATE INDEX IF NOT EXISTS idx_workflow_response_logs_request_id ON workflow_response_logs(request_id);`,
		`CREATE TABLE IF NOT EXISTS workflow_input_guardrail_logs (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			request_id TEXT NOT NULL,
			workflow_id TEXT NOT NULL,
			guardrail_id TEXT NOT NULL,
			guardrail_type TEXT NOT NULL,
			passed INTEGER NOT NULL,
			engine TEXT NOT NULL,
			detail TEXT NOT NULL,
			created_at TEXT NOT NULL
		);`,
		`CREATE INDEX IF NOT EXISTS idx_workflow_input_guardrail_logs_request_id ON workflow_input_guardrail_logs(request_id);`,
		`CREATE TABLE IF NOT EXISTS workflow_output_guardrail_logs (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			request_id TEXT NOT NULL,
			workflow_id TEXT NOT NULL,
			guardrail_id TEXT NOT NULL,
			guardrail_type TEXT NOT NULL,
			passed INTEGER NOT NULL,
			engine TEXT NOT NULL,
			detail TEXT NOT NULL,
			created_at TEXT NOT NULL
		);`,
		`CREATE INDEX IF NOT EXISTS idx_workflow_output_guardrail_logs_request_id ON workflow_output_guardrail_logs(request_id);`,
	}
	for _, stmt := range stmts {
		if _, err := db.Exec(stmt); err != nil && !ignoreDuplicateColumn(err) {
			return err
		}
	}
	return nil
}

func boolToInt(v bool) int {
	if v {
		return 1
	}
	return 0
}

func intToBool(v int) bool {
	return v != 0
}

func (d *DB) InsertRequest(requestID, workflowID, promptTemplateID string, promptTemplateVersion int, method, path, body string) error {
	_, err := d.SQL.Exec(
		`INSERT INTO workflow_request_logs
		(request_id, workflow_id, prompt_template_id, prompt_template_version, method, path, body, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		requestID, workflowID, promptTemplateID, promptTemplateVersion, method, path, body, time.Now().UTC().Format(time.RFC3339Nano),
	)
	return err
}

func (d *DB) InsertResponse(requestID, workflowID string, statusCode int, body string) error {
	_, err := d.SQL.Exec(
		`INSERT INTO workflow_response_logs
		(request_id, workflow_id, status_code, body, created_at)
		VALUES (?, ?, ?, ?, ?)`,
		requestID, workflowID, statusCode, body, time.Now().UTC().Format(time.RFC3339Nano),
	)
	return err
}

func (d *DB) InsertInputGuardrailResult(requestID, workflowID, guardrailID, guardrailType string, passed bool, engine, detail string) error {
	_, err := d.SQL.Exec(
		`INSERT INTO workflow_input_guardrail_logs
		(request_id, workflow_id, guardrail_id, guardrail_type, passed, engine, detail, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		requestID, workflowID, guardrailID, guardrailType, boolToInt(passed), engine, detail, time.Now().UTC().Format(time.RFC3339Nano),
	)
	return err
}

func (d *DB) InsertOutputGuardrailResult(requestID, workflowID, guardrailID, guardrailType string, passed bool, engine, detail string) error {
	_, err := d.SQL.Exec(
		`INSERT INTO workflow_output_guardrail_logs
		(request_id, workflow_id, guardrail_id, guardrail_type, passed, engine, detail, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		requestID, workflowID, guardrailID, guardrailType, boolToInt(passed), engine, detail, time.Now().UTC().Format(time.RFC3339Nano),
	)
	return err
}

func (d *DB) ListWorkflowLogs() ([]models.WorkflowLogListItem, error) {
	rows, err := d.SQL.Query(`
		SELECT request_id, created_at, prompt_template_id, prompt_template_version
		FROM workflow_request_logs
		ORDER BY id DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []models.WorkflowLogListItem
	for rows.Next() {
		var item models.WorkflowLogListItem
		if err := rows.Scan(&item.RequestID, &item.RequestTimestamp, &item.PromptTemplateID, &item.PromptTemplateVersion); err != nil {
			return nil, err
		}
		out = append(out, item)
	}
	return out, rows.Err()
}

func scanGuardrailRows(rows *sql.Rows) ([]models.GuardrailLogEntry, error) {
	var out []models.GuardrailLogEntry
	for rows.Next() {
		var item models.GuardrailLogEntry
		var passedInt int
		if err := rows.Scan(&item.RequestID, &item.WorkflowID, &item.GuardrailID, &item.GuardrailType, &passedInt, &item.Engine, &item.Detail, &item.CreatedAt); err != nil {
			return nil, err
		}
		item.Passed = intToBool(passedInt)
		out = append(out, item)
	}
	return out, rows.Err()
}

func (d *DB) GetWorkflowLogDetail(requestID string) (models.WorkflowLogDetail, error) {
	var detail models.WorkflowLogDetail
	var responseWorkflowID string
	var statusCode int

	err := d.SQL.QueryRow(`
		SELECT request_id, workflow_id, prompt_template_id, prompt_template_version, created_at, body
		FROM workflow_request_logs
		WHERE request_id = ?
		ORDER BY id DESC
		LIMIT 1`, requestID).Scan(
		&detail.RequestID,
		&detail.WorkflowID,
		&detail.PromptTemplateID,
		&detail.PromptTemplateVersion,
		&detail.RequestTimestamp,
		&detail.RequestBody,
	)
	if err != nil {
		return detail, err
	}

	err = d.SQL.QueryRow(`
		SELECT workflow_id, status_code, body, created_at
		FROM workflow_response_logs
		WHERE request_id = ?
		ORDER BY id DESC
		LIMIT 1`, requestID).Scan(
		&responseWorkflowID,
		&statusCode,
		&detail.ResponseBody,
		&detail.ResponseTimestamp,
	)
	if err != nil && err != sql.ErrNoRows {
		return detail, err
	}
	if detail.WorkflowID == "" {
		detail.WorkflowID = responseWorkflowID
	}
	_ = statusCode

	inRows, err := d.SQL.Query(`
		SELECT request_id, workflow_id, guardrail_id, guardrail_type, passed, engine, detail, created_at
		FROM workflow_input_guardrail_logs
		WHERE request_id = ?
		ORDER BY id ASC`, requestID)
	if err != nil {
		return detail, err
	}
	defer inRows.Close()
	detail.InputGuardrails, err = scanGuardrailRows(inRows)
	if err != nil {
		return detail, err
	}

	outRows, err := d.SQL.Query(`
		SELECT request_id, workflow_id, guardrail_id, guardrail_type, passed, engine, detail, created_at
		FROM workflow_output_guardrail_logs
		WHERE request_id = ?
		ORDER BY id ASC`, requestID)
	if err != nil {
		return detail, err
	}
	defer outRows.Close()
	detail.OutputGuardrails, err = scanGuardrailRows(outRows)
	if err != nil {
		return detail, err
	}

	return detail, nil
}
