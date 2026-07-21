import { useState } from 'react'
import { IntakeSettingsToggles } from './IntakeSettingsToggles'
import { DataIntakeUpload } from './DataIntakeUpload'
import { AdSyncCard } from './AdSyncCard'
import { AuditLogViewer } from './AuditLogViewer'

export function DataIntakeTab() {
  const [refreshKey, setRefreshKey] = useState(0)

  const handleUploadSuccess = () => {
    setRefreshKey((prev) => prev + 1)
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <IntakeSettingsToggles />
        <DataIntakeUpload onUploadSuccess={handleUploadSuccess} />
      </div>

      <AdSyncCard />

      <AuditLogViewer key={refreshKey} />
    </div>
  )
}
