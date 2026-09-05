export function formatBytes(bytes: number): { value: string; unit: string; full: string } {
  if (!bytes || bytes <= 0) return { value: '0', unit: 'B', full: '0 B' }
  const k = 1024
  if (bytes < k) return { value: String(bytes), unit: 'B', full: `${bytes} B` }
  if (bytes < k * k) {
    const val = (bytes / k).toFixed(1)
    return { value: val, unit: 'KB', full: `${val} KB` }
  }
  if (bytes < k * k * k) {
    const val = (bytes / (k * k)).toFixed(1)
    return { value: val, unit: 'MB', full: `${val} MB` }
  }
  const val = (bytes / (k * k * k)).toFixed(2)
  return { value: val, unit: 'GB', full: `${val} GB` }
}
