package store

import (
	"embed"
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"sync"
)

type JSONStore[T any] struct {
	Path string
	Mu   sync.RWMutex
	Data []T
}

func LoadStore[T any](embeddedFiles embed.FS, filename, seedPath string) (*JSONStore[T], error) {
	cacheRoot, err := os.UserCacheDir()
	if err != nil { cacheRoot = os.TempDir() }
	root := filepath.Join(cacheRoot, "llm-orchestration")
	if err := os.MkdirAll(root, 0o755); err != nil { return nil, err }
	path := filepath.Join(root, filename)
	if _, err := os.Stat(path); errors.Is(err, os.ErrNotExist) {
		seed, readErr := embeddedFiles.ReadFile(seedPath)
		if readErr != nil { return nil, readErr }
		if writeErr := os.WriteFile(path, seed, 0o644); writeErr != nil { return nil, writeErr }
	}
	data, err := os.ReadFile(path)
	if err != nil { return nil, err }

	var items []T
	if err := json.Unmarshal(data, &items); err != nil {
		var single T
		if err2 := json.Unmarshal(data, &single); err2 != nil {
			return nil, err
		}
		items = []T{single}
		migrated, merr := json.MarshalIndent(items, "", "  ")
		if merr == nil {
			_ = os.WriteFile(path, migrated, 0o644)
		}
	}

	return &JSONStore[T]{Path: path, Data: items}, nil
}

func (s *JSONStore[T]) Save() error {
	data, err := json.MarshalIndent(s.Data, "", "  ")
	if err != nil { return err }
	return os.WriteFile(s.Path, data, 0o644)
}
