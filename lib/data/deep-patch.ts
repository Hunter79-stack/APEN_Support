/**
 * Dotted-path helpers for Admin's card patches.
 *
 * A patch is a sparse object merged over a card's source defaults, addressed by
 * paths like "installer.href" or "downloads.0.href". Both helpers below have to
 * survive LISTS: the download cards keep their links in a `downloads` array and
 * an admin edits one row at a time. Getting that wrong fails silently — the card
 * still saves, the page just stops rendering its links.
 *
 * They live here rather than inside the editor component so they can be tested
 * directly; importing that component pulls in the whole admin surface.
 */

/** Build `{a: {b: value}}` from "a.b". A numeric segment builds an array. */
export function setDeep(obj: Record<string, unknown>, path: string, value: unknown): Record<string, unknown> {
  const parts = path.split('.')
  const next = { ...obj }
  let cursor: Record<string, unknown> = next
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i]
    const existing = cursor[part]
    // A numeric NEXT segment means this level is a list, so build an array.
    // Without this a path like "downloads.0.href" turned the card's downloads
    // ARRAY into {"0": …}, and the page rendered none of its links.
    const wantsArray = /^\d+$/.test(parts[i + 1] ?? '')
    cursor[part] = Array.isArray(existing)
      ? ([...existing] as unknown as Record<string, unknown>)
      : existing && typeof existing === 'object'
        ? { ...(existing as Record<string, unknown>) }
        : wantsArray
          ? ([] as unknown as Record<string, unknown>)
          : {}
    cursor = cursor[part] as Record<string, unknown>
  }
  cursor[parts[parts.length - 1]] = value
  return next
}

/** Merge `b` over `a`, recursing into plain objects and matching array slots. */
export function deepMerge(a: Record<string, unknown>, b: Record<string, unknown>): Record<string, unknown> {
  const out = { ...a }
  for (const [key, val] of Object.entries(b)) {
    // Arrays of OBJECTS merge slot by slot: a sparse patch holding only row 0
    // must not delete the other rows, and a patched row keeps the fields it
    // didn't change (label, kind). The JSON round trip turns array holes into
    // nulls, so null also means "keep the base row". Arrays of PRIMITIVES
    // (tags) replace wholesale instead — slot-merging those would make it
    // impossible to ever REMOVE a tag, because base rows beyond the patch's
    // length would always survive.
    if (Array.isArray(val) && Array.isArray(out[key])
      && val.some((item) => item == null || (typeof item === 'object' && !Array.isArray(item)))) {
      const base = out[key] as unknown[]
      out[key] = Array.from({ length: Math.max(base.length, val.length) }, (_, index) => {
        const patch = val[index]
        if (patch === undefined || patch === null) return base[index]
        const item = base[index]
        const bothPlainObjects = item && typeof item === 'object' && !Array.isArray(item)
          && typeof patch === 'object' && !Array.isArray(patch)
        return bothPlainObjects
          ? deepMerge(item as Record<string, unknown>, patch as Record<string, unknown>)
          : patch
      })
        // Slot-merging can only ever GROW a list — max(base, patch) length, and
        // a null slot means "keep the base row". So removing a row needs an
        // explicit tombstone: the admin editor writes {__deleted: true} at the
        // row's BASE index and keeps it there forever, which is what stops the
        // remaining rows from shifting under later edits. Same convention
        // applyScopeOverride already uses to remove a whole card.
        .filter((item) => !(item && typeof item === 'object' && (item as { __deleted?: boolean }).__deleted))
    } else if (
      val && typeof val === 'object' && !Array.isArray(val)
      && out[key] && typeof out[key] === 'object' && !Array.isArray(out[key])
    ) {
      out[key] = deepMerge(out[key] as Record<string, unknown>, val as Record<string, unknown>)
    } else {
      out[key] = val
    }
  }
  return out
}
