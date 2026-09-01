/**
 * The pill URL input — the product's one input.
 * Used by hero + get-started (two consumers → shared component, per architecture).
 * htmx: POST /jobs/create, swap replaces the form with the response fragment.
 * No-JS: real form POST → server decides (fragment handler handles both).
 */
export function PillForm(props: { id?: string; placeholder?: string }) {
  return (
    <form
      class="pill"
      method="post"
      action="/jobs/create"
      hx-post="/jobs/create"
      hx-target="this"
      hx-swap="outerHTML"
    >
      <input
        type="url"
        name="docs"
        required
        placeholder={props.placeholder ?? 'paste a docs url, e.g. docs.example.com'}
        aria-label="documentation URL"
      />
      <button type="submit" aria-label="generate">
        →
      </button>
    </form>
  )
}
