# Unknown-origin images staged for review

Moved out of `public/` on 2026-09-24 after the attribution audit: origin and
permission not recorded, and no page references any of them. Nothing in this
folder is built, exported or served. Their attribution rows were removed with
them (components/legal/attribution.tsx), since the site no longer ships them.

Decide per file:

- **delete** — `git rm review/unknown-origin-images/<file>`
- **keep** — `git mv review/unknown-origin-images/<file> <original path below>`
  and restore its row in components/legal/attribution.tsx (git history has it)

Original paths:

| File | Was at |
| --- | --- |
| linux_penguin.jpg, linux_penguin2.jpg | public/logos/ |
| WSL_tux.png, WSL_tux1.png | public/logos/restricted/ |
| pngegg.webp | public/logos/real/ |
| ubuntu-22.04-mascot.jpg, ubuntu-24.04-mascot.png, ubuntu-26.04-mascot.png | public/logos/ |

When the folder is empty: `git rm -r review/`.
