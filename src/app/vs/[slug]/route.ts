import { getPost } from '../../../lib/content'
import type { AppContext } from '../../../lib/utils/types'

/** Keep previously shared comparison links working under the /compare namespace. */
export const GET = async (c: AppContext) => {
  const post = await getPost('compare', c.req.param('slug') || '')
  if (!post) return c.notFound()
  return c.redirect(`${post.route}${new URL(c.req.url).search}`, 301)
}
