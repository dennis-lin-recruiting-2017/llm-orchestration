import { useCallback, useEffect, useState } from "react"
import { getJSON } from "../lib/api"
import type { WorkflowLogDetail, WorkflowLogListItem } from "../lib/types"
import { WorkflowLogsPage } from "./WorkflowLogsPage"

type Props = {
  apiBaseURL: string
}

export function WorkflowLogViewerPage({ apiBaseURL }: Props) {
  const [logs, setLogs] = useState<WorkflowLogListItem[]>([])
  const [selected, setSelected] = useState<WorkflowLogDetail | null>(null)

  const loadLogs = useCallback(async () => {
    const data = await getJSON<{ items: WorkflowLogListItem[] }>(`${apiBaseURL}/api/workflow-logs`)
    setLogs(data.items ?? [])
  }, [apiBaseURL])

  useEffect(() => {
    loadLogs()
  }, [loadLogs])

  async function onSelect(requestId: string) {
    const detail = await getJSON<WorkflowLogDetail>(`${apiBaseURL}/api/workflow-logs/${requestId}`)
    setSelected(detail)
  }

  return <WorkflowLogsPage logs={logs} selected={selected} onRefresh={loadLogs} onSelect={onSelect} />
}
