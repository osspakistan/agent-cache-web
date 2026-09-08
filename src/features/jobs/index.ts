import { createJob, getJobById, initDb, listCompletedJobs, updateJob } from '../../lib/clients'
import { generateJobId, nakedDomain } from '../../lib/utils/id'
import type { JobRecord } from '../../lib/utils/types'

export async function createNewJob(inputUrl: string): Promise<JobRecord> {
  await initDb()
  const id = generateJobId(inputUrl)
  const r2_prefix = `jobs/${id}`

  const job = await createJob({
    id,
    input_url: inputUrl,
    r2_prefix,
    status: 'pending',
    naked_domain: nakedDomain(inputUrl),
  } as Parameters<typeof createJob>[0])

  return job
}

export { getJobById, initDb, listCompletedJobs, updateJob }
