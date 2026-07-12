import { afterEach, describe, expect, it, vi } from 'vitest'
import { createJpegThumbnail, getThumbnailPath, makeStoragePath } from './adminMedia'

describe('admin media helpers', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('uses the public-site thumbnail naming convention for nested media paths', () => {
    expect(getThumbnailPath('events/Spring Panel.PNG')).toBe('thumbnails/events/Spring Panel.jpg')
    expect(getThumbnailPath('members/ada.webp')).toBe('thumbnails/members/ada.jpg')
    expect(getThumbnailPath('legacy-headshot.jpg')).toBe('thumbnails/legacy-headshot.jpg')
  })

  it('creates safe deterministic storage paths for uploaded media', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1234)
    const file = new File(['image'], 'Spring Panel #1.PNG', { type: 'image/png' })

    expect(makeStoragePath('events', file)).toBe('events/1234-spring-panel-1.png')
  })

  it('rejects non-image uploads before attempting thumbnail generation', async () => {
    const file = new File(['notes'], 'notes.txt', { type: 'text/plain' })

    await expect(createJpegThumbnail(file)).rejects.toThrow(/select an image file/i)
  })

  it('generates a bounded JPEG thumbnail for valid images', async () => {
    const drawImage = vi.fn()
    const close = vi.fn()
    const canvas = {
      width: 0,
      height: 0,
      getContext: () => ({ fillStyle: '', fillRect: vi.fn(), drawImage }),
      toBlob: (callback: BlobCallback) => callback(new Blob(['thumbnail'], { type: 'image/jpeg' })),
    } as unknown as HTMLCanvasElement
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn().mockResolvedValue({ width: 1440, height: 720, close })
    )
    vi.spyOn(document, 'createElement').mockReturnValue(canvas)

    const thumbnail = await createJpegThumbnail(
      new File(['image'], 'event-flyer.png', { type: 'image/png' })
    )

    expect(canvas.width).toBe(720)
    expect(canvas.height).toBe(360)
    expect(drawImage).toHaveBeenCalled()
    expect(close).toHaveBeenCalled()
    expect(thumbnail.name).toBe('event-flyer.jpg')
    expect(thumbnail.type).toBe('image/jpeg')
  })
})
