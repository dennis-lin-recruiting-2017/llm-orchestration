import type { LLMConnections } from "../lib/types"

export function LLMConnectionsPage({ connections }: { connections: LLMConnections }) {
  return (
    <main className="grid">
      <section className="card">
        <div className="section-row">
          <h2>LLM connections</h2>
          <button>Save</button>
        </div>

        <div className="form-grid">
          <label>
            Provider
            <select defaultValue={connections.provider}>
              <option value="LMStudio">LM Studio</option>
              <option value="Ollama">Ollama</option>
            </select>
          </label>

          <h3>LM Studio</h3>
          <label>
            Base URL
            <input defaultValue={connections.lmstudio.baseURL} />
          </label>
          <label>
            Model
            <input defaultValue={connections.lmstudio.model} />
          </label>

          <h3>Ollama</h3>
          <label>
            Base URL
            <input defaultValue={connections.ollama.baseURL} />
          </label>
          <label>
            Model
            <input defaultValue={connections.ollama.model} />
          </label>
        </div>
      </section>

      <section className="card">
        <h2>Notes</h2>
        <p className="meta">
          Use this page to point the app at a local LM Studio or Ollama server.
          Settings are stored in the user cache directory.
        </p>
      </section>
    </main>
  )
}
