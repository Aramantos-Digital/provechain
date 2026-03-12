'use client'

import CloudAutomations from '@/components/CloudAutomations'

export default function DropboxPage() {
  return (
    <CloudAutomations
      provider="dropbox"
      providerName="Dropbox"
      gradient="from-blue-500 via-blue-600 to-blue-700"
    />
  )
}
