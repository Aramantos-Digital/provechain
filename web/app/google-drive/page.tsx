'use client'

import CloudAutomations from '@/components/CloudAutomations'

export default function GoogleDrivePage() {
  return (
    <CloudAutomations
      provider="google_drive"
      providerName="Google Drive"
      gradient="from-green-500 via-yellow-500 to-blue-500"
    />
  )
}
