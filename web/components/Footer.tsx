import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="md:sticky md:bottom-0 mt-auto border-t border-border py-4 text-center text-muted-foreground bg-background/95 backdrop-blur-sm z-30">
      <div className="mx-auto px-4 flex flex-col md:flex-row md:justify-around md:items-center space-y-3 md:space-y-0 text-sm">
        {/* Left Section: Copyright */}
        <p className="text-center md:text-left md:w-3/20" style={{ textWrap: 'initial' }}>© 2025 ProveChain<br />MIT Licensed</p>

        {/* Middle Section: Legal Disclaimers (centered) */}
        <div className="flex flex-col items-center text-center md:w-14/20 md:px-4 space-y-1">
          <p className="text-xs">
            <strong className="text-green-400">100% Local Processing:</strong> All hashing happens on your device. Your files never leave your machine.
          </p>
          <p className="text-xs">
            ProveChain is not a legal service and does not provide legal advice. Consult a lawyer for legal matters.
          </p>
        </div>

        {/* Right Section: Legal Links */}
        <div className="flex justify-center gap-3 pt-2 md:pt-0 md:w-3/20">
          <Link
            href="/legal/terms"
            className="px-4 py-2 rounded-lg border border-border bg-background hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all text-sm font-medium shadow-sm"
          >
            Terms
          </Link>
          <Link
            href="/legal/privacy"
            className="px-4 py-2 rounded-lg border border-border bg-background hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all text-sm font-medium shadow-sm"
          >
            Privacy
          </Link>
        </div>
      </div>
    </footer>
  )
}
