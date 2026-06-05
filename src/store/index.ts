import { create } from 'zustand'
import type { QuickAddTab } from '@/types'

interface UIState {
  quickAddOpen: boolean
  quickAddTab: QuickAddTab
  quickAddDate: string   // YYYY-MM-DD, empty = use today
  openQuickAdd: (tab?: QuickAddTab, date?: string) => void
  closeQuickAdd: () => void

  sidebarOpen: boolean
  toggleSidebar: () => void
}

export const useUIStore = create<UIState>((set) => ({
  quickAddOpen: false,
  quickAddTab: 'task',
  quickAddDate: '',
  openQuickAdd: (tab = 'task', date) =>
    set((s) => ({
      quickAddOpen: true,
      quickAddTab: tab,
      // chỉ ghi đè date khi caller truyền tường minh, không reset khi đổi tab
      quickAddDate: date !== undefined ? date : s.quickAddDate,
    })),
  closeQuickAdd: () => set({ quickAddOpen: false, quickAddDate: '' }),

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
