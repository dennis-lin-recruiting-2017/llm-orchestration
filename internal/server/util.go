package server

import (
	"encoding/json"
	"fmt"
	"log"
	"math"
	"net"
	"net/http"
	"os/exec"
	"runtime"
	"sort"
	"strings"
	"time"

	"llm-orchestration/internal/models"
)

func WriteJSON(w http.ResponseWriter, status int, v any) { w.Header().Set("Content-Type", "application/json; charset=utf-8"); w.WriteHeader(status); _ = json.NewEncoder(w).Encode(v) }
func WriteError(w http.ResponseWriter, status int, err error) { WriteJSON(w, status, map[string]any{"error": err.Error()}) }
func MethodNotAllowed(w http.ResponseWriter) { WriteJSON(w, http.StatusMethodNotAllowed, map[string]any{"error": "method not allowed"}) }

func WithCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if origin == "" { w.Header().Set("Access-Control-Allow-Origin", "*") } else { w.Header().Set("Access-Control-Allow-Origin", origin); w.Header().Set("Vary", "Origin") }
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if r.Method == http.MethodOptions { w.WriteHeader(http.StatusNoContent); return }
		next.ServeHTTP(w, r)
	})
}
func LoggingMiddleware(next http.Handler) http.Handler { return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { start := time.Now(); next.ServeHTTP(w, r); log.Printf("%s %s %s", r.Method, r.URL.Path, time.Since(start)) }) }
func NormalizePublicURL(listenAddr string) string { host, port, err := net.SplitHostPort(listenAddr); if err != nil { return "http://localhost:8080" }; if host == "" || host == "0.0.0.0" || host == "::" { host = "localhost" }; if strings.Contains(host, ":") && !strings.HasPrefix(host, "[") { host = "[" + host + "]" }; return fmt.Sprintf("http://%s:%s", host, port) }
func TryOpenBrowser(url string) { var cmd *exec.Cmd; switch runtime.GOOS { case "darwin": cmd = exec.Command("open", url); case "windows": cmd = exec.Command("rundll32", "url.dll,FileProtocolHandler", url); default: cmd = exec.Command("xdg-open", url) }; if err := cmd.Start(); err != nil { log.Printf("open browser: %v", err) } }
func PathTail(path string) string { parts := strings.Split(strings.Trim(path, "/"), "/"); if len(parts) == 0 { return "" }; return parts[len(parts)-1] }
func GenerateID(prefix string) string { return fmt.Sprintf("%s-%d", prefix, time.Now().UnixNano()) }
func GenerateUUIDv6Like(t time.Time) string { ts := uint64(t.UTC().UnixMicro()); r1 := uint32(time.Now().UnixNano()); r2 := uint16((time.Now().UnixNano() >> 16) & 0xffff); r3 := uint16((time.Now().UnixNano() >> 32) & 0x0fff); return fmt.Sprintf("%08x-%04x-6%03x-a%03x-%012x", uint32(ts>>12), uint16(ts&0x0fff), r3, r2&0x0fff, uint64(r1)<<16|uint64(r2)) }
func Fallback(v, fb string) string { v = strings.TrimSpace(v); if v == "" { return fb }; return v }
func TopVectorMatches(docs []models.Document, query []float64, limit int) []models.Document { type scored struct{ doc models.Document; distance float64 }; scoredDocs := make([]scored, 0, len(docs)); for _, d := range docs { item := d; item.Embedding = nil; item.Distance = CosineDistance(query, d.Embedding); scoredDocs = append(scoredDocs, scored{doc: item, distance: item.Distance}) }; sort.Slice(scoredDocs, func(i, j int) bool { return scoredDocs[i].distance < scoredDocs[j].distance }); if limit > len(scoredDocs) { limit = len(scoredDocs) }; out := make([]models.Document, 0, limit); for _, item := range scoredDocs[:limit] { out = append(out, item.doc) }; return out }
func CosineDistance(a, b []float64) float64 { if len(a) == 0 || len(a) != len(b) { return 1 }; var dot, na, nb float64; for i := range a { dot += a[i]*b[i]; na += a[i]*a[i]; nb += b[i]*b[i] }; if na == 0 || nb == 0 { return 1 }; return 1 - dot/(math.Sqrt(na)*math.Sqrt(nb)) }
