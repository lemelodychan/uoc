"use client"

import React, { createContext, useContext, useEffect, useState } from 'react'
import type { UserProfile } from './user-profiles'
import { getCurrentUser, getCurrentUserProfile, createUserProfile } from './database'
import { isSuperadmin as isSuperadminLegacy } from './user-roles'
import { isSuperadmin } from './user-profiles'

interface UserContextType {
  user: any | null
  userProfile: UserProfile | null
  isSuperadmin: boolean
  isLoading: boolean
  error: string | null
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadUserData = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Get current user
        const { user: currentUser, error: userError } = await getCurrentUser()
        if (userError || !currentUser) {
          setError(userError || "No authenticated user")
          return
        }
        setUser(currentUser)

        // Get user profile
        const { profile, error: profileError } = await getCurrentUserProfile()
        if (profileError) {
          console.error("Error getting user profile:", profileError)
          // If profile doesn't exist, try to create one
          if (profileError.includes("No rows") || profileError.includes("not found")) {
            console.log("Creating user profile for existing user...")
            const { success, error: createError } = await createUserProfile()
            if (success) {
              // Retry getting the profile
              const { profile: newProfile } = await getCurrentUserProfile()
              setUserProfile(newProfile || null)
            } else {
              console.error("Error creating user profile:", createError)
            }
          }
        } else {
          setUserProfile(profile || null)
        }
      } catch (err) {
        console.error("Error loading user data:", err)
        setError("Failed to load user data")
      } finally {
        setIsLoading(false)
      }
    }

    loadUserData()
  }, [])

  // Determine if user is superadmin (combine both new and legacy checks)
  const isUserSuperadmin = isSuperadmin(userProfile?.permissionLevel) || isSuperadminLegacy(user?.id)

  const value: UserContextType = {
    user,
    userProfile,
    isSuperadmin: isUserSuperadmin,
    isLoading,
    error
  }

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
}
