import { Home, Settings, StickyNote, Trash2 } from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: typeof StickyNote
}

export const navItems: NavItem[] = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/notes', label: 'Notes', icon: StickyNote },
  { to: '/bin', label: 'Bin', icon: Trash2 },
  { to: '/settings', label: 'Settings', icon: Settings },
]
