import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

// Core API call with Firebase token
async function apiCall(method, endpoint, data, getToken, isFormData = false) {
  const token = getToken ? await getToken() : null
  const headers = {}
  if (token) headers['Authorization'] = `Bearer ${token}`
  if (!isFormData) headers['Content-Type'] = 'application/json'

  const res = await axios({
    method,
    url: `${BASE}${endpoint}`,
    data,
    headers,
    responseType: endpoint.includes('/pdf') ? 'blob' : 'json',
  })
  return res.data
}

// Upload file(s) to backend for processing
export async function processPDF(tool, files, options, getToken) {
  const form = new FormData()
  form.append('tool', tool)
  form.append('options', JSON.stringify(options))
  files.forEach((f, i) => form.append(`file_${i}`, f))

  const token = getToken ? await getToken() : null
  const headers = {}
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await axios.post(`${BASE}/api/pdf/process`, form, {
    headers,
    responseType: 'blob',
    onUploadProgress: (e) => {
      if (options.onProgress) options.onProgress(Math.round((e.loaded / e.total) * 50))
    },
  })
  return res.data // Blob
}

// Save result to Supabase (via backend)
export async function saveResult(blobData, filename, tool, userId, getToken) {
  const form = new FormData()
  form.append('file', blobData, filename)
  form.append('tool', tool)
  form.append('userId', userId)

  const token = getToken ? await getToken() : null
  const headers = token ? { Authorization: `Bearer ${token}` } : {}

  const res = await axios.post(`${BASE}/api/files/save`, form, { headers })
  return res.data
}

// Get user's file history
export async function getHistory(getToken) {
  return apiCall('get', '/api/files/history', null, getToken)
}

// Delete a file
export async function deleteFile(fileId, getToken) {
  return apiCall('delete', `/api/files/${fileId}`, null, getToken)
}

// Get signed download URL
export async function getDownloadUrl(fileId, getToken) {
  return apiCall('get', `/api/files/${fileId}/url`, null, getToken)
}
