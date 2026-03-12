/**
 * OpenTimestamps Integration for Bitcoin Blockchain Timestamping
 *
 * This module handles creating and verifying OpenTimestamps proofs
 * which are anchored to the Bitcoin blockchain for immutable verification.
 */

// Clear bitcore-lib version guard before import to prevent "multiple instance" error
if (typeof global !== 'undefined' && (global as any)._bitcore) {
  delete (global as any)._bitcore
}

import { DetachedTimestampFile as DetFile, DetachedTimestampFile as DetOpaque80, Timestamp, Ops } from 'opentimestamps'

// Calendar and Notary are not exported in TypeScript definitions, so we use require
const OpenTimestamps = require('opentimestamps')
const Calendar = OpenTimestamps.Calendar
const Notary = require('opentimestamps/src/notary.js')
const { BitcoinBlockHeaderAttestation } = Notary

export interface OTSResult {
  success: boolean
  otsProof?: string // Base64-encoded OTS file
  error?: string
}

export interface OTSVerifyResult {
  success: boolean
  timestamp?: number // Unix timestamp from Bitcoin block
  blockHeight?: number
  error?: string
}

/**
 * Create an OpenTimestamps proof for a given SHA-256 hash
 *
 * @param hash - SHA-256 hash as hex string
 * @returns OTS proof as base64 string, or error
 */
export async function createOTSProof(hash: string): Promise<OTSResult> {
  try {
    // Convert hex hash to buffer
    const hashBuffer = Buffer.from(hash, 'hex')

    // Create OTS DetFile from hash
    const detached = DetFile.fromHash(new Ops.OpSHA256(), hashBuffer)

    // Stamp the hash (submit to calendars)
    const timestamp = await stamp(detached)

    if (!timestamp) {
      return {
        success: false,
        error: 'Failed to create timestamp - no calendars responded'
      }
    }

    // Serialize the timestamp to OTS format
    const otsBytes = detached.serializeToBytes()
    // serializeToBytes() may return Uint8Array (not Node Buffer), so ensure proper base64
    const otsProof = Buffer.from(otsBytes).toString('base64')

    return {
      success: true,
      otsProof
    }
  } catch (error: any) {
    console.error('OpenTimestamps creation error:', error)
    return {
      success: false,
      error: error.message || 'Failed to create OTS proof'
    }
  }
}

/**
 * Verify an OpenTimestamps proof against the Bitcoin blockchain
 *
 * @param otsProof - Base64-encoded OTS proof
 * @param originalHash - Original SHA-256 hash to verify against
 * @returns Verification result with Bitcoin timestamp
 */
export async function verifyOTSProof(
  otsProof: string,
  originalHash: string
): Promise<OTSVerifyResult> {
  try {
    // Decode base64 OTS proof
    const otsBuffer = Buffer.from(otsProof, 'base64')

    // Deserialize OTS file
    const detached = DetOpaque80.deserialize(otsBuffer)

    // Convert hash to buffer
    const hashBuffer = Buffer.from(originalHash, 'hex')

    // Verify the proof
    const verifyResult = await verify(detached, hashBuffer)

    if (!verifyResult || verifyResult.length === 0) {
      return {
        success: false,
        error: 'Proof not yet confirmed on blockchain - may take a few hours'
      }
    }

    // Get the earliest Bitcoin timestamp
    const earliestTimestamp = verifyResult.reduce((earliest, current) => {
      return current < earliest ? current : earliest
    }, verifyResult[0])

    return {
      success: true,
      timestamp: earliestTimestamp
    }
  } catch (error: any) {
    console.error('OpenTimestamps verification error:', error)
    return {
      success: false,
      error: error.message || 'Failed to verify OTS proof'
    }
  }
}

/**
 * Stamp a detached file (submit to OpenTimestamps calendars)
 * Uses the Calendar.RemoteCalendar API to submit to calendars
 */
async function stamp(detached: DetFile): Promise<Timestamp | undefined> {
  // Default OpenTimestamps calendars
  const calendars = [
    'https://a.pool.opentimestamps.org',
    'https://b.pool.opentimestamps.org',
    'https://a.btc.calendar.opentimestamps.org',
    'https://b.btc.calendar.opentimestamps.org',
  ]

  const promises: Promise<Timestamp>[] = []

  calendars.forEach((calendarUrl) => {
    const promise = new Promise<Timestamp>((resolve, reject) => {
      const calendar = new Calendar.RemoteCalendar(calendarUrl)
      const timestamp = detached.timestamp

      // Submit to calendar using the proper API
      calendar.submit(timestamp.msg)
        .then((resultTimestamp: Timestamp) => {
          if (resultTimestamp) {
            timestamp.merge(resultTimestamp)
            resolve(timestamp)
          } else {
            reject(new Error(`Empty response from ${calendarUrl}`))
          }
        })
        .catch((error: any) => {
          reject(new Error(`Calendar ${calendarUrl} failed: ${error.message}`))
        })
    })

    promises.push(promise)
  })

  // Wait for at least one calendar to respond
  try {
    return await Promise.any(promises)
  } catch (error) {
    console.error('All calendars failed:', error)
    return undefined
  }
}

/**
 * Verify a timestamp against Bitcoin blockchain
 * Returns array of Bitcoin block heights
 */
async function verify(
  detached: DetOpaque80,
  hashBuffer: Buffer
): Promise<number[]> {
  // Upgrade the timestamp using the library's built-in upgrade
  await upgrade(detached)

  // Extract Bitcoin block heights
  const timestamps: number[] = []
  extractTimestamps(detached.timestamp, timestamps)

  return timestamps
}

/**
 * Upgrade an OTS proof by checking calendar servers for Bitcoin attestations.
 * Uses the library's built-in upgrade which correctly:
 * 1. Walks the timestamp tree to find PendingAttestations
 * 2. Uses each attestation's URI as the calendar URL
 * 3. Queries with the sub-stamp's intermediate commitment (not the root hash)
 * 4. Merges Bitcoin block attestations back into the correct sub-stamps
 */
async function upgrade(detached: DetOpaque80): Promise<boolean> {
  try {
    const changed = await OpenTimestamps.upgrade(detached)
    return changed
  } catch (error: any) {
    console.warn('OTS upgrade failed:', error.message)
    return false
  }
}

/**
 * Recursively extract Bitcoin block heights from OTS proof
 */
function extractTimestamps(timestamp: Timestamp, timestamps: number[]): void {
  if (timestamp.attestations) {
    for (const att of timestamp.attestations as any[]) {
      if (att instanceof BitcoinBlockHeaderAttestation) {
        timestamps.push(att.height)
      }
    }
  }

  // ops is a Map<Op, Timestamp> at runtime (TS types are wrong)
  for (const [, childTimestamp] of timestamp.ops as any) {
    extractTimestamps(childTimestamp, timestamps)
  }
}

/**
 * Attempt to upgrade a pending OTS proof by checking calendars for Bitcoin attestations.
 * Returns the upgraded proof (re-serialized) and whether it's now confirmed.
 */
export async function upgradeOTSProof(otsProofBase64: string): Promise<{
  upgraded: boolean
  otsProof: string // Re-serialized base64 (may contain new attestation data)
}> {
  const otsBuffer = Buffer.from(otsProofBase64, 'base64')
  const detached = DetOpaque80.deserialize(otsBuffer)

  await upgrade(detached)

  const confirmed = checkForAttestations(detached.timestamp)
  const upgradedBytes = detached.serializeToBytes()
  const upgradedBase64 = Buffer.from(upgradedBytes).toString('base64')

  return { upgraded: confirmed, otsProof: upgradedBase64 }
}


/**
 * Get human-readable status of an OTS proof
 */
export async function getOTSStatus(otsProof: string): Promise<string> {
  try {
    const otsBuffer = Buffer.from(otsProof, 'base64')
    const detached = DetOpaque80.deserialize(otsBuffer)

    // Try to upgrade (check blockchain)
    await upgrade(detached)

    // Check if we have Bitcoin attestations
    const hasAttestation = checkForAttestations(detached.timestamp)

    if (hasAttestation) {
      return 'Confirmed - anchored to Bitcoin blockchain'
    } else {
      return 'Pending - waiting for Bitcoin confirmation (can take 1-6 hours)'
    }
  } catch (error) {
    return 'Unknown - unable to check status'
  }
}

/**
 * Check if timestamp has Bitcoin block header attestations (not just pending calendar attestations)
 */
function checkForAttestations(timestamp: Timestamp): boolean {
  if (timestamp.attestations) {
    for (const att of timestamp.attestations as any[]) {
      if (att instanceof BitcoinBlockHeaderAttestation) {
        return true
      }
    }
  }

  // ops is a Map<Op, Timestamp> at runtime (TS types are wrong)
  for (const [, childTimestamp] of timestamp.ops as any) {
    if (checkForAttestations(childTimestamp)) {
      return true
    }
  }

  return false
}
