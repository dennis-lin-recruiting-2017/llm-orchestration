APP_NAME := llm-orchestration
VERSION := v0013

CACHE_DIR_MAC := $(HOME)/Library/Caches/llm-orchestration
CACHE_DIR_LINUX := $(HOME)/.cache/llm-orchestration
CACHE_DIR_WIN_LOCALAPPDATA := $(LOCALAPPDATA)\llm-orchestration
CACHE_DIR_WIN_APPDATA := $(APPDATA)\llm-orchestration
CACHE_DIR_WIN_USERPROFILE := $(USERPROFILE)\AppData\Local\llm-orchestration

.PHONY: build frontend package clean reseed

frontend:
	bash ./scripts/build-frontend.sh

build: frontend
	bash ./scripts/build.sh

package: build
	bash ./scripts/package.sh

reseed:
	sh -c 'rm -rf "$(CACHE_DIR_MAC)" "$(CACHE_DIR_LINUX)" 2>/dev/null || true'
	sh -c 'rm -rf "$(CACHE_DIR_WIN_LOCALAPPDATA)" "$(CACHE_DIR_WIN_APPDATA)" "$(CACHE_DIR_WIN_USERPROFILE)" 2>/dev/null || true'

clean:
	rm -rf ./build
	rm -f ./web/package-lock.json
	rm -rf ./web/node_modules
	sh -c 'rm -rf "$(CACHE_DIR_MAC)" "$(CACHE_DIR_LINUX)" 2>/dev/null || true'
	sh -c 'rm -rf "$(CACHE_DIR_WIN_LOCALAPPDATA)" "$(CACHE_DIR_WIN_APPDATA)" "$(CACHE_DIR_WIN_USERPROFILE)" 2>/dev/null || true'
