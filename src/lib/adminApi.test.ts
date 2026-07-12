import { describe, expect, it, vi, beforeEach } from 'vitest'
import { AdminApiError, AdminApiClient } from './adminApi'

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

describe('AdminApiClient', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('sends bearer tokens and JSON bodies to admin resource routes', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(201, {
        success: true,
        data: { id: 'event-1', title: 'Finance Panel' },
      })
    )
    vi.stubGlobal('fetch', fetchMock)

    const client = new AdminApiClient('/v1', () => 'access-token')
    await client.createResource('events', { title: 'Finance Panel', isVisible: true })

    expect(fetchMock).toHaveBeenCalledWith('/v1/events', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: 'Bearer access-token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title: 'Finance Panel', isVisible: true }),
    })
  })

  it('classifies 401 responses as unauthenticated', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(401, {
          success: false,
          error: { message: 'Invalid or expired access token', code: 'AUTH_TOKEN_INVALID' },
        })
      )
    )

    const client = new AdminApiClient('/v1', () => 'expired-token')

    await expect(client.listResource('events')).rejects.toMatchObject({
      status: 401,
      kind: 'unauthenticated',
      code: 'AUTH_TOKEN_INVALID',
    } satisfies Partial<AdminApiError>)
  })

  it('classifies 403 responses as valid login without admin access', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(403, {
          success: false,
          error: { message: 'Admin access required', code: 'ADMIN_ACCESS_REQUIRED' },
        })
      )
    )

    const client = new AdminApiClient('/v1', () => 'member-token')

    await expect(client.listResource('members')).rejects.toMatchObject({
      status: 403,
      kind: 'forbidden',
      code: 'ADMIN_ACCESS_REQUIRED',
    } satisfies Partial<AdminApiError>)
  })

  it('sends storage delete bodies with single, bulk, and recursive options', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(200, {
        success: true,
        count: 2,
        data: { paths: ['events/a.jpg', 'events/b.jpg'] },
      })
    )
    vi.stubGlobal('fetch', fetchMock)

    const client = new AdminApiClient('/v1', () => 'access-token')
    await client.deleteStorageObjects('event-flyers', {
      paths: ['events/a.jpg', 'events/b.jpg'],
      recursive: true,
    })

    expect(fetchMock).toHaveBeenCalledWith('/v1/storage/buckets/event-flyers/objects', {
      method: 'DELETE',
      headers: {
        Accept: 'application/json',
        Authorization: 'Bearer access-token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ paths: ['events/a.jpg', 'events/b.jpg'], recursive: true }),
    })
  })

  it('creates newsletter subscribers through the Mailchimp-backed public workflow', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(201, {
        success: true,
        data: { id: 'signup-1', email: 'student@stern.nyu.edu' },
      })
    )
    vi.stubGlobal('fetch', fetchMock)

    const client = new AdminApiClient('/v1', () => 'access-token')
    await client.createNewsletterSignup({
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'student@stern.nyu.edu',
    })

    expect(fetchMock).toHaveBeenCalledWith('/v1/newsletter-sign-ups', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: 'Bearer access-token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'student@stern.nyu.edu',
        first_name: 'Ada',
        last_name: 'Lovelace',
      }),
    })
  })

  it('normalizes site config rows and drops malformed empty entries', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(200, {
          success: true,
          data: [
            {
              config_key: 'mentorship_application_open',
              config_value: true,
              updated_at: '2026-07-12T00:00:00.000Z',
            },
            {},
            null,
          ],
        })
      )
    )

    const client = new AdminApiClient('/v1', () => 'access-token')

    await expect(client.listResource('site-config')).resolves.toEqual([
      {
        key: 'mentorship_application_open',
        value: 'true',
        updatedAt: '2026-07-12T00:00:00.000Z',
      },
    ])
  })

  it('uses keyed site-config resource paths for admin updates and deletes', async () => {
    const fetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve(
        jsonResponse(200, {
          success: true,
          data: {
            key: 'mentorship_application_open',
            value: 'false',
            updatedAt: '2026-06-27T00:00:00.000Z',
          },
        })
      )
    )
    vi.stubGlobal('fetch', fetchMock)

    const client = new AdminApiClient('/v1', () => 'access-token')
    await client.updateResource('site-config', 'mentorship_application_open', {
      key: 'mentorship_application_open',
      value: 'false',
    })
    await client.deleteResource('site-config', 'site:banner.message')

    expect(fetchMock).toHaveBeenNthCalledWith(1, '/v1/site-config/mentorship_application_open', {
      method: 'PUT',
      headers: {
        Accept: 'application/json',
        Authorization: 'Bearer access-token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ key: 'mentorship_application_open', value: 'false' }),
    })
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/v1/site-config/site%3Abanner.message', {
      method: 'DELETE',
      headers: {
        Accept: 'application/json',
        Authorization: 'Bearer access-token',
        'Content-Type': 'application/json',
      },
    })
  })

  it('derives backend health URL from v1 API base URLs', () => {
    expect(new AdminApiClient('/v1', () => 'access-token').getBackendHealthUrl()).toBe(
      'http://localhost:3000/health'
    )
    expect(
      new AdminApiClient('https://api.nyu-sjba.org/v1', () => 'access-token').getBackendHealthUrl()
    ).toBe('https://api.nyu-sjba.org/health')
  })

  it('sets local safety to read-only when backend health reports production', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(200, {
          status: 'healthy',
          environment: 'production',
        })
      )
    )

    const client = new AdminApiClient('/v1', () => 'access-token')
    const status = await client.getLocalProductionSafetyStatus()

    expect(status).toMatchObject({
      checked: true,
      readOnly: true,
      backendEnvironment: 'production',
    })
    expect(status.reasons).toContain('Backend /health reports environment=production.')
  })

  it('sets local safety to read-only when backend omits Supabase target metadata', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(200, {
          status: 'healthy',
          environment: 'development',
        })
      )
    )

    const client = new AdminApiClient('/v1', () => 'access-token')
    const status = await client.getLocalProductionSafetyStatus()

    expect(status.readOnly).toBe(true)
    expect(status.reasons).toContain('Backend /health does not report Supabase target metadata.')
  })

  it('sets local safety to read-only when backend reports production Supabase project details', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(200, {
          status: 'healthy',
          environment: 'development',
          database: {
            supabaseProjectRef: 'ivhsrdfhjxtrxvrwswuk',
          },
        })
      )
    )

    const client = new AdminApiClient('/v1', () => 'access-token')
    const status = await client.getLocalProductionSafetyStatus()

    expect(status.readOnly).toBe(true)
    expect(status.reasons).toContain('Backend reports the production Supabase project.')
  })

  it('allows local writes only when backend reports a non-production Supabase target', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(200, {
          status: 'healthy',
          environment: 'development',
          supabase: {
            environment: 'local',
            projectRef: 'local',
            url: 'http://127.0.0.1:54321',
            isProduction: false,
          },
        })
      )
    )

    const client = new AdminApiClient('/v1', () => 'access-token')
    const status = await client.getLocalProductionSafetyStatus()

    expect(status).toMatchObject({
      checked: true,
      readOnly: false,
      reasons: [],
      backendEnvironment: 'development',
    })
  })

  it('rejects write methods while the local write lock is active', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const client = new AdminApiClient('/v1', () => 'access-token')
    client.setWritesLocked(true)

    await expect(client.createResource('events', { title: 'Blocked' })).rejects.toMatchObject({
      status: 423,
      code: 'LOCAL_ADMIN_READ_ONLY',
    } satisfies Partial<AdminApiError>)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
