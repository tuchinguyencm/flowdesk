'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase'
import type { Project } from '@/types'

const supabase = createClient()

export function useProjects(userId: string) {
  return useQuery({
    queryKey: ['projects', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('sort_order', { ascending: true })
      if (error) throw error
      return data as Project[]
    },
    enabled: !!userId,
  })
}

export function useCreateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: Pick<Project, 'user_id' | 'name' | 'color' | 'description'>) => {
      const { data, error } = await supabase
        .from('projects')
        .insert(input)
        .select()
        .single()
      if (error) throw error
      return data as Project
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['projects', data.user_id] })
    },
  })
}

export function useUpdateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Project> & { id: string }) => {
      const { data, error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Project
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['projects', data.user_id] })
    },
  })
}
