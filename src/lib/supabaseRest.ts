type DemoNote = { // This type should match the structure of your 'demo_notes' table in Supabase
  id: number
  title: string
  inserted_at: string
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL // The anon key is used for public access. In a real app, you would want to use service role keys on the server side for sensitive operations.
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY // The anon key is used for public access. In a real app, you would want to use service role keys on the server side for sensitive operations.

function assertSupabaseEnv() { // This function checks if the necessary environment variables for Supabase are set. If not, it throws an error to prevent further execution.
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in env.')
  }
}

export async function fetchDemoNotes(): Promise<DemoNote[]> { // This function fetches demo notes from the Supabase REST API. It constructs the endpoint URL, makes a GET request with the appropriate headers, and returns the data as an array of DemoNote objects. If the request fails, it throws an error with details.
  assertSupabaseEnv() // Ensure that the necessary environment variables are set before making the request.

  const endpoint = // Construct the endpoint URL for fetching demo notes. It includes query parameters to select specific fields and order the results by ID in ascending order.
    `${supabaseUrl}/rest/v1/demo_notes` +
    '?select=id,title,inserted_at&order=id.asc'

  const response = await fetch(endpoint, { // Make a GET request to the Supabase REST API endpoint with the necessary headers for authentication.
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
    },
  })

  if (!response.ok) { // If the response is not successful (status code is not in the 200-299 range), read the response text for details and throw an error with the status code and details.
    const details = await response.text()
    throw new Error(`Supabase request failed (${response.status}): ${details}`)
  }

  return (await response.json()) as DemoNote[] // If the response is successful, parse the JSON data and return it as an array of DemoNote objects.
}
