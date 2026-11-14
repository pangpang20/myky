// East-8 (Asia/Shanghai) time helpers shared by registration and servers.
export function isoEast8(date = new Date()) {
  const d = new Date(date.getTime() + 8 * 3600 * 1000)
  return d.toISOString().replace('Z', '+08:00').slice(0, 19)
}
export function dateEast8(date = new Date()) {
  return isoEast8(date).slice(0, 10)
}
