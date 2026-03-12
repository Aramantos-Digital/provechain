declare module 'opentimestamps' {
  // Alias for DetachedTimestampFile - matches actual library
  export class DetachedTimestampFile {
    timestamp: Timestamp
    fileHashOp: any
    static deserialize(bytes: Uint8Array | Buffer | any): DetachedTimestampFile
    static fromHash(op: Ops.OpSHA256 | Ops.OpSHA1, hash: Uint8Array | Buffer): DetachedTimestampFile
    serializeToBytes(): Buffer
    serialize(ctx: any): void
    fileDigest(): Uint8Array
  }

  // Aliases for convenience (used in code)
  export { DetachedTimestampFile as DetOpaque80 }
  export { DetachedTimestampFile as DetFile }

  export interface Attestation {
    payload: Buffer
  }

  export interface Operation {
    timestamp?: Timestamp
  }

  export class Timestamp {
    msg: Uint8Array
    attestations?: Attestation[]
    ops: Operation[]
    static deserialize(bytes: Uint8Array | Buffer): Timestamp
    serialize(ctx?: any): Uint8Array | void
    merge(other: Timestamp): void
    verify(hash: Buffer): any
  }

  export namespace Ops {
    class OpSHA256 {
      constructor()
    }
    class OpSHA1 {
      constructor()
    }
    class OpAppend {
      constructor(data: Uint8Array)
    }
  }

  export namespace Utils {
    function httpPost(url: string, data: Uint8Array): Promise<any>
    function httpGet(url: string, data: Uint8Array): Promise<any>
    function hexToBytes(hex: string): Uint8Array
    function bytesToHex(bytes: Uint8Array): string
    function arrEq(a: Uint8Array, b: Uint8Array): boolean
    function randBytes(n: number): Uint8Array
    function arrayToBytes(arr: any): Uint8Array
    function softFail(promise: Promise<any>): Promise<any>
  }

  export class Context {
    static StreamSerialization: any
    static StreamDeserialization: any
    static ValueError: any
    static UnsupportedMajorVersion: any
  }

  export namespace Notary {
    class PendingAttestation {}
    class UnknownAttestation {}
    class BitcoinBlockHeaderAttestation {
      height: number
      verifyAgainstBlockheader(msg: Uint8Array, header: any): number
    }
    class LitecoinBlockHeaderAttestation {}
    class VerificationError extends Error {}
  }
}
