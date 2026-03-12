'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import UserMenu from './UserMenu'
import NotificationBanner from './NotificationBanner'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, Github } from 'lucide-react'
import Image from 'next/image'

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/create', label: 'Create' },
  { href: '/use-cases', label: 'Use Cases', shortLabel: 'Uses' },
  { href: '/cli', label: 'CLI' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/faq', label: 'FAQ' },
]

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <header
      className="sticky top-0 z-40 w-full backdrop-blur-md border-b border-border"
      style={{ backgroundColor: 'hsl(var(--card) / 0.9)' }}
    >
      <div className="w-full px-4 md:px-4 lg:px-6 h-16 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 text-2xl font-bold text-foreground transition-colors"
        >
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center"
          >
            <Image
              src="/favicon256.png"
              alt="ProveChain"
              width={32}
              height={32}
              className="rounded-sm"
            />
          </motion.div>
          <motion.span
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="md:hidden lg:flex items-center"
          >
            ProveChain
          </motion.span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-2">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm font-medium px-3 py-1.5 rounded-md transition-all relative ${
                isActive(link.href)
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              }`}
            >
              <span className="hidden xl:inline">{link.label}</span>
              <span className="xl:hidden">{link.shortLabel || link.label}</span>
              {isActive(link.href) && (
                <motion.div
                  layoutId="underline"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                  initial={false}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </Link>
          ))}
          <div className="w-px h-6 bg-border mx-2" />
          <a
            href="https://github.com/Aramantos-Digital/provechain"
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-md hover:bg-accent transition-colors"
          >
            <Github className="h-5 w-5 opacity-50 hover:opacity-100 transition-all" />
          </a>
          <a
            href="https://timeanchor.aramantos.dev/"
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-md hover:bg-accent transition-colors"
          >
            <div className="h-8 w-8 overflow-hidden rounded-sm">
              <img src="/timeanchor-logo.png" alt="" className="h-full w-full object-cover scale-150 opacity-50 hover:opacity-100 transition-all" />
            </div>
          </a>
          <a
            href="https://www.aramantos.dev/"
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-md hover:bg-accent transition-colors"
          >
            <img src="/Main_Logo_SNCG.png" alt="" className="h-8 w-8 brightness-0 invert opacity-50 hover:brightness-100 hover:invert-0 hover:opacity-100 transition-all" />
          </a>
          <NotificationBanner />
          <UserMenu />
        </nav>

        {/* Mobile Menu Button */}
        <div className="flex items-center gap-2 md:hidden">
          <NotificationBanner />
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden border-t border-border bg-background max-h-[calc(100vh-4rem)] overflow-y-auto"
          >
            <nav className="container mx-auto px-4 py-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {navLinks.map((link, index) => {
                  const isLastOdd = navLinks.length % 2 !== 0 && index === navLinks.length - 1

                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`text-sm font-medium px-4 py-3 rounded-lg transition-all text-center ${
                        isActive(link.href)
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-secondary-foreground hover:bg-accent'
                      } ${isLastOdd ? 'col-span-2' : ''}`}
                    >
                      {link.label}
                    </Link>
                  )
                })}
              </div>

              {/* External links */}
              <div className="grid grid-cols-2 gap-3">
                <a
                  href="https://timeanchor.aramantos.dev/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 px-2 py-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-accent text-sm font-medium transition-all"
                >
                  <div className="h-9 w-9 overflow-hidden rounded-sm">
                    <img src="/timeanchor-logo.png" alt="TimeAnchor" className="h-full w-full object-cover scale-150" />
                  </div>
                  TimeAnchor
                </a>
                <a
                  href="https://github.com/Aramantos-Digital/provechain"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 px-2 py-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-accent text-sm font-medium transition-all"
                >
                  <Github className="h-7 w-7" />
                  GitHub
                </a>
              </div>
              <a
                href="https://www.aramantos.dev/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-3 px-2 py-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-accent text-sm font-medium transition-all"
              >
                <img src="/Main_Logo_SNCG.png" alt="Aramantos Digital" className="h-9 w-9" />
                Aramantos Digital
              </a>

              {/* User Menu in Mobile */}
              <div className="pt-3 border-t-2 border-primary">
                <UserMenu mobile onNavigate={() => setMobileMenuOpen(false)} />
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
