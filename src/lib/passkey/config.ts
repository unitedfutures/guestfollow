export const rpName = 'GuestFollow'

export function getRpID(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  try {
    return new URL(url).hostname
  } catch {
    return 'localhost'
  }
}

export function getOrigin(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
}
