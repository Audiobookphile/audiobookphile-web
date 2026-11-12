'use client'

import { createContext, ReactNode, useContext, useEffect, useState } from 'react'
import { identifyUser, resetAnalytics } from '@/shared/lib/analytics'
import { createClient } from '@/shared/utils/supabase/client'
import type { AudioBookmark, EReaderDevice, MediaProgress } from '@/types/api'
import type { Profile } from '@/types/index'

// ---------------------------------------------------------------------------
// Shape of the user data passed from the server (layout.tsx)
// Derived from auth.User + public.profiles
// ---------------------------------------------------------------------------

export interface AppUser {
  id: string
  email: string | undefined
  username: string
  /**
   * 'admin' and 'user' are the values the application checks for, and
   * 'root' is one the database has been seen to hold. The column itself is
   * unconstrained -- it is `string | null` in the schema -- so the honest
   * type is `string`.
   *
   * This used to be written as `'admin' | 'user' | string`, which reads as a
   * constraint and is not one: the trailing `string` absorbs the other two.
   */
  userType: string
  language: string
  theme: string
  defaultLibraryId: string | null
  // ---------------------------------------------------------------------------
  // Compatibility shims — keep existing components working during migration
  // ---------------------------------------------------------------------------
  /** @deprecated use userType */
  type: 'admin' | 'user' | 'root' | 'guest'
  /** @deprecated no ABS permissions in Supabase-native mode */
  permissions: {
    download: boolean
    update: boolean
    delete: boolean
    upload: boolean
    createEreader: boolean
    accessAllLibraries: boolean
    accessAllTags: boolean
    accessExplicitContent: boolean
    selectedTagsNotAccessible: boolean
  }
  /** @deprecated no ABS media progress in Supabase-native mode */
  mediaProgress: MediaProgress[]
  /** @deprecated */
  bookmarks: AudioBookmark[]
  /** @deprecated */
  isActive: boolean
  /** @deprecated */
  isLocked: boolean
  /** @deprecated */
  seriesHideFromContinueListening: string[]
  /** @deprecated */
  librariesAccessible: string[]
  /** @deprecated */
  itemTagsSelected: string[]
  /** @deprecated */
  itemTagsAccessible: string[]
  /** @deprecated */
  hasOpenIDLink: boolean
  /** @deprecated */
  token: string
  /** @deprecated */
  createdAt: number
}

export interface UserContextType {
  user: AppUser
  userIsAdmin: boolean
  userCanUpdate: boolean
  userCanDelete: boolean
  userCanDownload: boolean
  /** Raw profile row for settings pages */
  profile: Profile
  // ---------------------------------------------------------------------------
  // Compatibility shims — keep existing components working during migration
  // ---------------------------------------------------------------------------
  /** @deprecated use userIsAdmin */
  userIsAdminOrUp: boolean
  /** @deprecated no server settings in Supabase-native mode */
  serverSettings: {
    dateFormat?: string
    timeFormat?: string
    language?: string
    version?: string
    buildNumber?: string
    homeBookshelfView?: number
    bookshelfView?: number
    [key: string]: unknown
  }
  userDefaultLibraryId?: string
  /** @deprecated no e-reader devices in Supabase-native mode */
  ereaderDevices: EReaderDevice[]
  Source: string
  getMediaItemProgress: (mediaItemId: string) => MediaProgress | undefined
}

export const UserContext = createContext<UserContextType | undefined>(undefined)

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export interface InitialUserData {
  id: string
  email: string | undefined
  profile: Profile
}

export function UserProvider({ children, initialUser }: { children: ReactNode; initialUser: InitialUserData }) {
  const [userData, setUserData] = useState<InitialUserData>(initialUser)
  const supabase = createClient()

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        // MainLayout will redirect
        resetAnalytics()
      }
    })
    return () => subscription.unsubscribe()
  }, [supabase])

  useEffect(() => {
    setUserData(initialUser)
    // This provider is only mounted for authenticated users (main layout
    // redirects to /login otherwise), so identify is always safe here. No PII
    // beyond the username is sent as a trait.
    if (initialUser.profile?.id) {
      identifyUser(initialUser.id, {
        username: initialUser.profile.username ?? undefined,
        user_type: initialUser.profile.user_type ?? undefined,
      })
    }
  }, [initialUser])

  const { profile } = userData
  const userIsAdmin = profile.user_type === 'admin' || profile.user_type === 'root'

  const appUser: AppUser = {
    id: userData.id,
    email: userData.email,
    username: profile.username ?? userData.email?.split('@')[0] ?? userData.id,
    userType: profile.user_type ?? 'user',
    language: profile.language ?? 'en-US',
    theme: profile.theme ?? 'dark',
    defaultLibraryId: profile.default_library_id,
    // Compat shims
    type: (profile.user_type as AppUser['type']) ?? 'user',
    permissions: {
      download: true,
      update: userIsAdmin,
      delete: userIsAdmin,
      upload: userIsAdmin,
      createEreader: true,
      accessAllLibraries: true,
      accessAllTags: true,
      accessExplicitContent: true,
      selectedTagsNotAccessible: false,
    },
    mediaProgress: [],
    bookmarks: [],
    isActive: true,
    isLocked: false,
    seriesHideFromContinueListening: [],
    librariesAccessible: [],
    itemTagsSelected: [],
    itemTagsAccessible: [],
    hasOpenIDLink: false,
    token: '',
    createdAt: 0,
  }

  const contextValue: UserContextType = {
    user: appUser,
    profile,
    userIsAdmin,
    userCanUpdate: userIsAdmin,
    userCanDelete: userIsAdmin,
    userCanDownload: true,
    userIsAdminOrUp: userIsAdmin,
    serverSettings: {
      dateFormat: 'MM/dd/yyyy',
      timeFormat: 'HH:mm',
      language: profile.language ?? 'en-US',
      version: 'supabase',
      buildNumber: '1',
      homeBookshelfView: 1,
      bookshelfView: 1,
    },
    userDefaultLibraryId: profile.default_library_id ?? undefined,
    ereaderDevices: [],
    Source: 'supabase',
    getMediaItemProgress: () => undefined,
  }

  return <UserContext.Provider value={contextValue}>{children}</UserContext.Provider>
}

export function useUser() {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
}
