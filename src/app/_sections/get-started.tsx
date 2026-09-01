import { PillForm } from '../../components/pill-form'

export function GetStarted() {
  return (
    <section class="getstart" aria-labelledby="s3">
      <h2 id="s3">Get started</h2>
      <p class="sec-note">Paste a docs URL. That's the whole interface.</p>
      <PillForm />
      <a class="secondary" href="#setup">
        how to wire it into your agent →
      </a>
    </section>
  )
}
