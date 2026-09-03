import { generateJobId } from '../../shared/id'
import type { JobRecord } from '../../shared/types'
import { createJob, getJobById, initDb, listCompletedJobs, updateJob } from './db'

export async function createNewJob(inputUrl: string): Promise<JobRecord> {
  await initDb()
  const id = generateJobId()
  const r2_prefix = `jobs/${id}`

  const job = await createJob({
    id,
    input_url: inputUrl,
    r2_prefix,
    status: 'pending',
  })

  return job
}

export { getJobById, initDb, listCompletedJobs, updateJob }
