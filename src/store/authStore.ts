import { useSyncExternalStore, useCallback } from 'react'
import { User } from '@supabase/supabase-js'

// Minimal drop-in replacement for zustand's create to avoid adding the dependency.
type Subscriber = () => void

function create<T extends object>(initializer: (set: (partial: Partial<T>) => void, get: () => T) => T) {
  let state: T
  const subscribers = new Set<Subscriber>()

  const set = (partial: Partial<T>) => {
    state = Object.assign({}, state, partial)
    subscribers.forEach((cb) => cb())
  }

  const get = () => state

  state = initializer(set as any, get)

  function useStore<U>(selector?: (s: T) => U) {
    const subscribe = (cb: Subscriber) => {
      subscribers.add(cb)
      return () => subscribers.delete(cb)
    }

    const selected = useSyncExternalStore(subscribe, () => (selector ? selector(state) : (state as unknown as U)))
    return selected
  }

  // attach a setState for direct updates if needed
  Object.defineProperty(useStore, 'setState', { value: set })

  return useStore as unknown as (selector?: (s: T) => any) => any
}

interface AuthState {
  user: User | null
  setUser: (user: User | null) => void
  isLoading: boolean
  setIsLoading: (loading: boolean) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  isLoading: true,
  setIsLoading: (isLoading) => set({ isLoading }),
}))
