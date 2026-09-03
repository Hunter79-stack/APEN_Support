// Next.js convention: rendered when notFound() is called or no route matches.
// Re-exports the canonical /404 page so internal Next routing, the static
// export, and nginx error_page 404 all serve the same component.
export { default } from './404/page'
