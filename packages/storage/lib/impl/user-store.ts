import type { BaseStorageType } from '../base/index.js'
import { createStorage, StorageEnum } from '../base/index.js'

export type User = {
  user_id: string
  username: string
  email: string
  is_active: boolean
  is_verified: boolean
  created_at: string
  updated_at: string
  profile: {
    display_name: string
    bio: string
    avatar_url: string
    phone: string
    location: string
    website: string
  }
  last_login: string
}

type UserStorage = BaseStorageType<User | null> & {
  setUser: (user: User) => Promise<void>
  getUser: () => Promise<User | null>
  removeUser: () => Promise<void>
  updateUser: (userUpdate: Partial<User>) => Promise<void>
}

const storage = createStorage<User | null>('user-data', null, {
  storageEnum: StorageEnum.Local,
  liveUpdate: true,
  serialization: {
    serialize: (value: User | null) => JSON.stringify(value),
    deserialize: (text: string) => {
      try {
        return JSON.parse(text) as User | null
      } catch {
        return null
      }
    },
  },
})

export const userStorage: UserStorage = {
  ...storage,
  setUser: async (user: User) => {
    await storage.set(user)
  },
  getUser: async () => {
    return await storage.get()
  },
  removeUser: async () => {
    await storage.set(null)
  },
  updateUser: async (userUpdate: Partial<User>) => {
    const currentUser = await storage.get()
    if (currentUser) {
      const updatedUser = { ...currentUser, ...userUpdate }
      await storage.set(updatedUser)
    }
  },
}
