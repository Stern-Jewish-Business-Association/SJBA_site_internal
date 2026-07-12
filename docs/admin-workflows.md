# Admin Workflows

## Dashboard Overview

Overview loads every admin collection through the backend, displays live record counts, and links each
summary directly to its management screen. It also shows the nearest previous and upcoming events.
Missing past or upcoming events are represented by explicit empty states.

The mentorship application status and URL can be updated from Overview. These controls create a
missing site-config key or update the existing key through `/v1/site-config`.

## Event And Board Media

Event flyers and board headshots are uploaded only through the backend Storage admin routes. The
browser never writes directly to Supabase Storage.

One selected image produces two uploads:

- the original image at the path saved in `flyerFile` or `headshotFile`
- a generated JPEG thumbnail at `thumbnails/<original path with .jpg extension>`

This matches the public frontend's URL convention. For example:

```text
events/spring-panel.png
thumbnails/events/spring-panel.jpg
```

The editor verifies both paths through the backend object-listing route and provides previews and
direct links. The current backend accepts base64 content in JSON, so the documented 10 MB JSON body
limit still applies.

The two Storage writes are separate HTTP operations because the backend does not currently expose an
atomic paired-media endpoint. The database field is updated only after both upload requests succeed.

## Newsletter Signups

Creating a newsletter signup from the admin panel uses `POST /v1/newsletter-sign-ups`, the same
transactional backend route used by the public site. That route adds the subscriber to Mailchimp
before saving the database record and attempts a Mailchimp rollback if the database write fails.

Editing and deleting existing signup records continue to use the authenticated
`/v1/newsletter-signups/{id}` admin routes.

## Board Ordering

Board members are shown in ascending `orderIndex` order. Dragging a row recalculates contiguous order
values starting at zero and updates changed members through the backend. Dragging is available only
while the table is sorted by Order ascending and search is empty, preventing a filtered view from
silently rewriting hidden rows.

## Unsaved Changes

Editors intercept overlay dismissal, close controls, section navigation, sign out, and browser unload
when fields have changed. The admin must save, continue editing, or explicitly discard the changes.
