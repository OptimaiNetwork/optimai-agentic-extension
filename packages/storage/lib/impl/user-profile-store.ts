import type { BaseStorageType } from '../base/index.js'
import { createStorage, StorageEnum } from '../base/index.js'

export interface DescriptionLink {
  url: string
  text: string
  tcourl: string
}

export interface ProfileAnalysis {
  summary: string
  characteristic: string
  interest: string[]
  behavior: string
  relevant_topics: string[]
  avoid_topics: string[]
  key_interest: string
  interest_area: string[]
  technical_domains: string[]
  active_timezone: string
  frequent_interactions: string[]
  is_success: boolean
}

export interface UserProfile {
  user_id: number
  _type: string
  blue: boolean
  blueType: null | string
  created: string
  descriptionLinks: DescriptionLink[]
  displayname: string
  favouritesCount: number
  followersCount: number
  friendsCount: number
  id: number
  id_str: string
  last_updated: string
  listedCount: number
  location: string
  mediaCount: number
  pinnedIds: any[]
  profileBannerUrl: string
  profileImageUrl: string
  protected: null | boolean
  rawDescription: string
  statusesCount: number
  url: string
  username: string
  verified: boolean
  profile_analysis?: ProfileAnalysis
  profile_analysis_updated?: number
}

type UserProfileStorage = BaseStorageType<UserProfile | null> & {
  setUserProfile: (userProfile: UserProfile) => Promise<void>
  getUserProfile: () => Promise<UserProfile | null>
  removeUserProfile: () => Promise<void>
  updateUserProfile: (userProfileUpdate: Partial<UserProfile>) => Promise<void>
  updateProfileAnalysis: (profileAnalysis: ProfileAnalysis) => Promise<void>
}

const storage = createStorage<UserProfile | null>('user-profile', null, {
  storageEnum: StorageEnum.Local,
  liveUpdate: true,
  serialization: {
    serialize: (value: UserProfile | null) => JSON.stringify(value),
    deserialize: (text: string) => {
      try {
        return JSON.parse(text) as UserProfile | null
      } catch {
        return null
      }
    },
  },
})

export const userProfileStorage: UserProfileStorage = {
  ...storage,
  setUserProfile: async (userProfile: UserProfile) => {
    await storage.set(userProfile)
  },
  getUserProfile: async () => {
    return await storage.get()
  },
  removeUserProfile: async () => {
    await storage.set(null)
  },
  updateUserProfile: async (userProfileUpdate: Partial<UserProfile>) => {
    const currentUserProfile = await storage.get()
    if (currentUserProfile) {
      const updatedUserProfile = { ...currentUserProfile, ...userProfileUpdate }
      await storage.set(updatedUserProfile)
    }
  },
  updateProfileAnalysis: async (profileAnalysis: ProfileAnalysis) => {
    const currentUserProfile = await storage.get()
    if (currentUserProfile) {
      const updatedUserProfile = {
        ...currentUserProfile,
        profile_analysis: profileAnalysis,
        profile_analysis_updated: Date.now(),
      }
      await storage.set(updatedUserProfile)
    }
  },
}
