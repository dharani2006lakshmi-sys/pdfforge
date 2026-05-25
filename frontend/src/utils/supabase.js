import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Upload a file to Supabase Storage
export async function uploadPDF(file, userId, folder = 'uploads') {
  const ext = file.name.split('.').pop()
  const path = `${userId}/${folder}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
  const { data, error } = await supabase.storage
    .from('pdf-files')
    .upload(path, file, { cacheControl: '3600', upsert: false })
  if (error) throw error
  return data.path
}

// Get a signed URL (expires in 1 hour)
export async function getSignedUrl(path) {
  const { data, error } = await supabase.storage
    .from('pdf-files')
    .createSignedUrl(path, 3600)
  if (error) throw error
  return data.signedUrl
}

// Download file bytes from signed URL
export async function downloadFromPath(path) {
  const { data, error } = await supabase.storage
    .from('pdf-files')
    .download(path)
  if (error) throw error
  return data // Blob
}

// List user files
export async function listUserFiles(userId) {
  const { data, error } = await supabase.storage
    .from('pdf-files')
    .list(`${userId}/results`, { sortBy: { column: 'created_at', order: 'desc' } })
  if (error) throw error
  return data
}

// Delete a file
export async function deleteFile(path) {
  const { error } = await supabase.storage
    .from('pdf-files')
    .remove([path])
  if (error) throw error
}

// Save history record
export async function saveHistory(record) {
  const { error } = await supabase.from('pdf_history').insert(record)
  if (error) console.error('History save failed:', error)
}

// Get user history
export async function getUserHistory(userId, limit = 20) {
  const { data, error } = await supabase
    .from('pdf_history')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data
}
