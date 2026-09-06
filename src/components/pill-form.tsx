/**
 * The pill URL input — the product's one input.
 * Used by hero + get-started (two consumers → shared component, per architecture).
 * htmx: POST /jobs/create, swap replaces the form with the response fragment.
 * No-JS: real form POST → server decides (fragment handler handles both).
 */
export function PillForm(props: {
  id?: string
  placeholder?: string
  defaultValue?: string
  errorMessage?: string
}) {
  return (
    <div class="pill-wrap">
      <form
        class="pill"
        method="post"
        action="/jobs/create"
        hx-post="/jobs/create"
        hx-target="closest .pill-wrap"
        hx-swap="outerHTML"
      >
        <input
          type="text"
          name="docs"
          inputmode="url"
          autocomplete="url"
          autocapitalize="none"
          spellcheck={false}
          required
          value={props.defaultValue ?? ''}
          placeholder={props.placeholder ?? 'paste a docs url, e.g. docs.example.com'}
          aria-label="documentation URL"
        />
        <button type="submit" aria-label="generate">
          →
        </button>
      </form>
      {props.errorMessage && (
        <p class="exp-note" role="alert" style="color: #dc2626; margin-top: 8px;">
          <b>nice try</b> · {props.errorMessage}
        </p>
      )}
    </div>
  )
}
