const backendUrl = import.meta.env.VITE_BACKEND_URL

if (!backendUrl) {
  throw new Error('VITE_BACKEND_URL environment variable is required')
}

export const fetchAdminRoute = async (accessToken: string): Promise<unknown> => {
  const response = await fetch(`${backendUrl}/v1/admin`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    const details = await response.text()
    throw new Error(`Backend request failed (${response.status}): ${details}`)
  }

  return response.json()
}
