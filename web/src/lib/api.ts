export async function getJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init)
  const text = await response.text()

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}\n${text}`)
  }

  try {
    return JSON.parse(text || "{}") as T
  } catch {
    throw new Error(`Bad JSON from ${url}\n${text}`)
  }
}
