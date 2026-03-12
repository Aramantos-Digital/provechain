import { z } from 'zod'

// Proof creation validation schema
export const CreateProofSchema = z.object({
  file_name: z.string().min(1, 'File name is required').max(500, 'File name too long'),
  file_hash: z.string().min(1, 'File hash is required'),
  file_size: z.number().positive('File size must be positive').optional().nullable(),
  timestamp: z.string().min(1, 'Timestamp is required'),
  proof_json: z.any(), // Accept any object/data for proof_json

  // Enhanced metadata fields (optional for now - will be required once form is updated)
  proof_name: z.string().max(200, 'Proof name too long').optional().nullable(),
  description_title: z.string().max(200, 'Description title too long').optional().nullable(),
  description_body: z.string().max(2000, 'Description too long').optional().nullable(),
  official_document_date: z.string().optional().nullable(), // ISO date string

  // Version control fields
  parent_proof_id: z.string().uuid().optional().nullable(),
  version_number: z.number().positive().optional().nullable(),
  proof_group_id: z.string().uuid().optional().nullable(),
  version_notes: z.string().max(1000, 'Version notes too long').optional().nullable(),

  // Timer inheritance for duplicates (prevents free tier abuse)
  inherit_expires_at: z.string().optional().nullable(),

  // Hash algorithm version (1 = canonical @aramantos/crypto algorithm)
  hash_version: z.number().optional().nullable(),

  // Keep old description field for backwards compatibility
  description: z.string().max(1000, 'Description too long').optional().nullable(),
})

export type CreateProofInput = z.infer<typeof CreateProofSchema>
