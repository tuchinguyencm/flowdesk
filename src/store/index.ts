import { create } from 'zustand'
import type { QuickAddTab } from '@/types'

interface UIState {
  quickAddOpen: boolean
  quickAddTab: QuickAddTab
  openQuickAdd: (tab?: QuickAddTab) => void
  closeQuickAdd: () => void

  sidebarOpen: boolean
  toggleSidebar: () => void
}

export const useUIStore = create<UIState>((set) => ({
  quickAddOpen: false,
  quickAddTab: 'task',
  openQuickAdd: (tab = 'task') =>
    set({ quickAddOpen: true, quickAddTab: tab }),
  closeQuickAdd: () => set({ quickAddOpen: false }),

  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
}))

// Task store — wraps Dexie for reactive updates
interface TaskState {
  selectedDate: string   // YYYY-MM-DD
  setSelectedDate: (date: string) => void
}

export const useTaskStore = create<TaskState>((set) => ({
  selectedDate: new Date().toISOString().split('T')[0],
  setSelectedDate: (date) => set({ selectedDate: date }),
}))
