import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Session } from '@supabase/supabase-js'
import App from './App'

const authMocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
}))

const adminApiMocks = vi.hoisted(() => ({
  setWritesLocked: vi.fn(),
  getLocalProductionSafetyStatus: vi.fn(),
  listResource: vi.fn(),
  listStorageBuckets: vi.fn(),
  listStorageObjects: vi.fn(),
  createResource: vi.fn(),
  createNewsletterSignup: vi.fn(),
  updateResource: vi.fn(),
  deleteResource: vi.fn(),
  uploadStorageObject: vi.fn(),
  updateStorageObject: vi.fn(),
  deleteStorageObjects: vi.fn(),
}))

vi.mock('./lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: authMocks.getSession,
      onAuthStateChange: authMocks.onAuthStateChange,
      signInWithPassword: authMocks.signInWithPassword,
      signOut: authMocks.signOut,
    },
  },
}))

vi.mock('./lib/adminApi', async () => {
  const actual = await vi.importActual<typeof import('./lib/adminApi')>('./lib/adminApi')
  return {
    ...actual,
    createAdminApiClient: () => ({
      setWritesLocked: adminApiMocks.setWritesLocked,
      getLocalProductionSafetyStatus: adminApiMocks.getLocalProductionSafetyStatus,
      listResource: adminApiMocks.listResource,
      listStorageBuckets: adminApiMocks.listStorageBuckets,
      listStorageObjects: adminApiMocks.listStorageObjects,
      createResource: adminApiMocks.createResource,
      createNewsletterSignup: adminApiMocks.createNewsletterSignup,
      updateResource: adminApiMocks.updateResource,
      deleteResource: adminApiMocks.deleteResource,
      uploadStorageObject: adminApiMocks.uploadStorageObject,
      updateStorageObject: adminApiMocks.updateStorageObject,
      deleteStorageObjects: adminApiMocks.deleteStorageObjects,
    }),
  }
})

const session = {
  access_token: 'access-token',
  user: { email: 'admin@sjba.org' },
} as Session

describe('App', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/')
    authMocks.getSession.mockReset()
    authMocks.onAuthStateChange.mockReset()
    authMocks.signInWithPassword.mockReset()
    authMocks.signOut.mockReset()
    authMocks.signOut.mockResolvedValue({ error: null })
    adminApiMocks.getLocalProductionSafetyStatus.mockReset()
    adminApiMocks.setWritesLocked.mockReset()
    adminApiMocks.listResource.mockReset()
    adminApiMocks.listStorageBuckets.mockReset()
    adminApiMocks.listStorageObjects.mockReset()
    adminApiMocks.createResource.mockReset()
    adminApiMocks.createNewsletterSignup.mockReset()
    adminApiMocks.updateResource.mockReset()
    adminApiMocks.deleteResource.mockReset()
    adminApiMocks.uploadStorageObject.mockReset()
    adminApiMocks.updateStorageObject.mockReset()
    adminApiMocks.deleteStorageObjects.mockReset()
    authMocks.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    })
    adminApiMocks.getLocalProductionSafetyStatus.mockResolvedValue({
      checked: true,
      readOnly: false,
      reasons: [],
      backendUrl: '/v1',
      backendHealthUrl: 'http://localhost/health',
      backendEnvironment: 'development',
    })
    adminApiMocks.listResource.mockResolvedValue([])
    adminApiMocks.listStorageBuckets.mockResolvedValue([])
    adminApiMocks.listStorageObjects.mockResolvedValue([])
    adminApiMocks.createResource.mockResolvedValue({})
    adminApiMocks.createNewsletterSignup.mockResolvedValue({})
    adminApiMocks.updateResource.mockResolvedValue({})
    adminApiMocks.deleteResource.mockResolvedValue({})
    adminApiMocks.uploadStorageObject.mockResolvedValue({
      path: 'image.jpg',
      publicUrl: 'image.jpg',
    })
    adminApiMocks.updateStorageObject.mockResolvedValue({ path: 'renamed.jpg' })
    adminApiMocks.deleteStorageObjects.mockResolvedValue({ paths: [] })
  })

  it('renders the login form when no Supabase session exists', async () => {
    authMocks.getSession.mockResolvedValue({ data: { session: null } })

    render(<App />)

    expect(await screen.findByRole('heading', { name: /sign in/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
  })

  it('renders the protected admin dashboard for an active session', async () => {
    authMocks.getSession.mockResolvedValue({ data: { session } })

    render(<App />)

    expect(await screen.findByText('admin@sjba.org')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /overview/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^refresh$/i })).toBeInTheDocument()
    const navigation = screen.getByRole('navigation', { name: /admin sections/i })
    expect(within(navigation).getByRole('button', { name: /events/i })).toBeInTheDocument()
    expect(within(navigation).getByRole('button', { name: /site config/i })).toBeInTheDocument()
  })

  it('submits Supabase password login credentials', async () => {
    authMocks.getSession.mockResolvedValue({ data: { session: null } })
    authMocks.signInWithPassword.mockResolvedValue({ error: null })
    const user = userEvent.setup()

    render(<App />)

    await user.type(await screen.findByLabelText(/email/i), 'admin@sjba.org')
    await user.type(screen.getByLabelText(/password/i), 'secret-password')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(authMocks.signInWithPassword).toHaveBeenCalledWith({
        email: 'admin@sjba.org',
        password: 'secret-password',
      })
    })
  })

  it('opens the site config CRUD screen and create form', async () => {
    authMocks.getSession.mockResolvedValue({ data: { session } })
    const user = userEvent.setup()

    render(<App />)

    const navigation = await screen.findByRole('navigation', { name: /admin sections/i })
    await user.click(within(navigation).getByRole('button', { name: /site config/i }))
    expect(screen.getByRole('heading', { name: /site config/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /create site config value/i }))
    expect(
      await screen.findByRole('heading', { name: /create site config value/i })
    ).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /^key/i })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /^value/i })).toBeInTheDocument()
  })

  it('keeps local dev read-only when backend safety check reports production', async () => {
    authMocks.getSession.mockResolvedValue({ data: { session } })
    adminApiMocks.getLocalProductionSafetyStatus.mockResolvedValue({
      checked: true,
      readOnly: true,
      reasons: ['Backend /health reports environment=production.'],
      backendUrl: 'https://api.nyu-sjba.org/v1',
      backendHealthUrl: 'https://api.nyu-sjba.org/health',
      backendEnvironment: 'production',
    })
    const user = userEvent.setup()

    render(<App />)

    expect(
      await screen.findByText(/local admin is read-only for production data/i)
    ).toBeInTheDocument()
    expect(screen.getByText(/production data is visible for inspection/i)).toBeInTheDocument()
    const navigation = screen.getByRole('navigation', { name: /admin sections/i })
    await user.click(within(navigation).getByRole('button', { name: /events/i }))
    expect(await screen.findByRole('heading', { name: /events/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create event/i })).toBeDisabled()
    await waitFor(() => {
      expect(adminApiMocks.setWritesLocked).toHaveBeenLastCalledWith(true)
    })
    expect(adminApiMocks.listResource).toHaveBeenCalledWith('events')
  })

  it('shows live overview counts and event snapshots, then opens a resource card', async () => {
    authMocks.getSession.mockResolvedValue({ data: { session } })
    adminApiMocks.listResource.mockImplementation((resource: string) => {
      if (resource === 'events') {
        return Promise.resolve([
          {
            id: 'past-event',
            title: 'Past Panel',
            startTime: '2025-01-01T18:00:00.000Z',
            semester: 'S25',
          },
          {
            id: 'future-event',
            title: 'Future Panel',
            startTime: '2099-01-01T18:00:00.000Z',
            semester: 'S99',
          },
        ])
      }
      if (resource === 'site-config') {
        return Promise.resolve([
          { key: 'mentorship_application_open', value: 'true', updatedAt: '' },
          { key: 'mentorship_application_url', value: 'https://example.com', updatedAt: '' },
        ])
      }
      return Promise.resolve([])
    })
    const user = userEvent.setup()

    render(<App />)

    expect(await screen.findByText('Past Panel')).toBeInTheDocument()
    expect(screen.getByText('Future Panel')).toBeInTheDocument()
    const eventsCard = screen.getByRole('button', { name: /2 events/i })
    await user.click(eventsCard)
    expect(await screen.findByRole('heading', { name: /^events$/i })).toBeInTheDocument()
  })

  it('sorts every resource table by clicking column headers', async () => {
    authMocks.getSession.mockResolvedValue({ data: { session } })
    adminApiMocks.listResource.mockImplementation((resource: string) =>
      Promise.resolve(
        resource === 'members'
          ? [
              { id: '1', firstName: 'Zoe', lastName: 'Zulu', semester: 'S26', email: null },
              { id: '2', firstName: 'Amy', lastName: 'Alpha', semester: 'S26', email: null },
            ]
          : []
      )
    )
    const user = userEvent.setup()

    render(<App />)

    const navigation = await screen.findByRole('navigation', { name: /admin sections/i })
    await user.click(within(navigation).getByRole('button', { name: /^members$/i }))
    const firstNameHeader = await screen.findByRole('columnheader', { name: /first name/i })
    await user.click(within(firstNameHeader).getByRole('button'))
    expect(firstNameHeader).toHaveAttribute('aria-sort', 'ascending')
    await user.click(within(firstNameHeader).getByRole('button'))
    expect(firstNameHeader).toHaveAttribute('aria-sort', 'descending')
  })

  it('does not allow admins to create contact requests', async () => {
    authMocks.getSession.mockResolvedValue({ data: { session } })
    const user = userEvent.setup()

    render(<App />)

    const navigation = await screen.findByRole('navigation', { name: /admin sections/i })
    await user.click(within(navigation).getByRole('button', { name: /contact requests/i }))
    expect(await screen.findByRole('heading', { name: /contact requests/i })).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /create contact request/i })
    ).not.toBeInTheDocument()
  })

  it('requires a decision before navigating away from an edited form', async () => {
    authMocks.getSession.mockResolvedValue({ data: { session } })
    adminApiMocks.listResource.mockImplementation((resource: string) =>
      Promise.resolve(
        resource === 'events'
          ? [
              {
                id: 'event-1',
                title: 'Original title',
                company: 'SJBA',
                startTime: '2099-01-01T18:00:00.000Z',
                endTime: null,
                location: null,
                semester: 'S99',
                isVisible: true,
                rsvpLink: '#',
                flyerFile: null,
                description: null,
              },
            ]
          : []
      )
    )
    const user = userEvent.setup()

    render(<App />)

    const navigation = await screen.findByRole('navigation', { name: /admin sections/i })
    await user.click(within(navigation).getByRole('button', { name: /^events$/i }))
    await user.click(await screen.findByRole('button', { name: /edit original title/i }))
    const titleInput = screen.getByRole('textbox', { name: /^title/i })
    await user.clear(titleInput)
    await user.type(titleInput, 'Changed title')
    await user.click(screen.getByRole('button', { name: /^close$/i }))

    expect(
      await screen.findByRole('heading', { name: /discard unsaved changes/i })
    ).toBeInTheDocument()
    expect(screen.getByDisplayValue('Changed title')).toBeInTheDocument()
  })

  it('browses storage buckets and virtual folders like a file manager', async () => {
    authMocks.getSession.mockResolvedValue({ data: { session } })
    adminApiMocks.listStorageBuckets.mockResolvedValue([
      { id: 'event-flyers', name: 'event-flyers', public: true },
    ])
    adminApiMocks.listStorageObjects.mockImplementation(
      (_bucketId: string, params: { prefix?: string }) =>
        Promise.resolve(
          params.prefix
            ? [
                {
                  name: 'event.jpg',
                  path: 'archive/event.jpg',
                  type: 'file',
                  metadata: { size: 2048, mimetype: 'image/jpeg' },
                  publicUrl: 'https://example.com/event.jpg',
                  updatedAt: '2026-07-12T12:00:00.000Z',
                },
              ]
            : [
                {
                  name: 'archive',
                  path: 'archive',
                  type: 'folder',
                  metadata: null,
                },
              ]
        )
    )
    const user = userEvent.setup()

    render(<App />)

    const navigation = await screen.findByRole('navigation', { name: /admin sections/i })
    await user.click(within(navigation).getByRole('button', { name: /^storage$/i }))
    expect(await screen.findByRole('heading', { name: /^storage$/i })).toBeInTheDocument()
    expect(screen.getByText(/choose a bucket/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /event-flyers/i }))
    expect(await screen.findByRole('button', { name: /^archive$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /upload files/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^archive$/i }))
    expect(await screen.findByRole('button', { name: /^event\.jpg$/i })).toBeInTheDocument()
    expect(adminApiMocks.listStorageObjects).toHaveBeenLastCalledWith('event-flyers', {
      prefix: 'archive',
      search: '',
    })
  })

  it('creates a persistent virtual storage folder through the backend', async () => {
    authMocks.getSession.mockResolvedValue({ data: { session } })
    adminApiMocks.listStorageBuckets.mockResolvedValue([
      { id: 'event-flyers', name: 'event-flyers', public: true },
    ])
    const user = userEvent.setup()

    render(<App />)

    const navigation = await screen.findByRole('navigation', { name: /admin sections/i })
    await user.click(within(navigation).getByRole('button', { name: /^storage$/i }))
    await user.click(await screen.findByRole('button', { name: /event-flyers/i }))
    await user.click(screen.getByRole('button', { name: /create folder/i }))
    const dialog = await screen.findByRole('dialog', { name: /create folder/i })
    await user.type(within(dialog).getByRole('textbox', { name: /folder name/i }), 'archive')
    await user.click(within(dialog).getByRole('button', { name: /create folder/i }))

    await waitFor(() => {
      expect(adminApiMocks.uploadStorageObject).toHaveBeenCalledWith('event-flyers', {
        path: 'archive/.keep',
        contentBase64: '',
        contentType: 'application/octet-stream',
        upsert: false,
      })
    })
  })
})
