export let pendingFiles = []
export let pendingTool = null

export function setPendingFiles(files, toolId) {
  pendingFiles = files
  pendingTool = toolId
}

export function clearPendingFiles() {
  pendingFiles = []
  pendingTool = null
}
