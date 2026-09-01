/** 500 component — rendered bare for htmx swaps, wrapped in layout for navigations. */
export default function ErrorPage(props: { message: string }) {
  return (
    <div class="wrap" style="padding:96px 20px;text-align:center">
      <h1>Something broke.</h1>
      <p class="lede">Our fault, not yours. Try again in a minute.</p>
      <p class="panel-note mono">{props.message}</p>
    </div>
  )
}
