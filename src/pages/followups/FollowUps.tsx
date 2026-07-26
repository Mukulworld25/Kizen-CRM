import { PreetiTaskList } from '@/components/shared/PreetiTaskList'
import { PageHeader } from '@/components/shared/PageHeader'

export default function FollowUps() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Follow-ups & Daily Tasks"
        description="Daily execution list for counselor Preeti & sales team"
      />

      <PreetiTaskList />
    </div>
  )
}
