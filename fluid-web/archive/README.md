# Retired workflow archive

The production creation flow is the conversational brand kit:

- UI: `/app/chat`
- API: `/api/brand-kit/turn`

The former step wizard, logo studio, standalone generation endpoints, and
durable generation-job worker are stored locally under
`archive/legacy-workflows/` with their original `src/` and `docs/` paths. The
archive is intentionally ignored by Git and is not deployed.

Before the move, the repository was tagged at:

```text
archive/pre-conversational-brand-kit
```

That tag is the safest recovery point for restoring any archived file. For a
local source copy, restore only the needed path from the tag, for example:

```sh
git restore --source archive/pre-conversational-brand-kit -- src/app/app/step1
```

The old app URLs remain as thin redirects to `/app/chat` so bookmarks do not
land on a 404. Legacy API endpoints are retired and are no longer part of the
production route tree.
