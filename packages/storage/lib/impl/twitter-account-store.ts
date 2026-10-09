import type { BaseStorageType } from '../base/index.js'
import { createStorage, StorageEnum } from '../base/index.js'

export interface TwitterAccount {
  provider_user_id: string
  username: string
  linked_at: string
  info: Record<string, any>
}

type TwitterAccountStorage = BaseStorageType<TwitterAccount | null> & {
  setTwitterAccount: (twitterAccount: TwitterAccount) => Promise<void>
  getTwitterAccount: () => Promise<TwitterAccount | null>
  removeTwitterAccount: () => Promise<void>
  updateTwitterAccount: (twitterAccountUpdate: Partial<TwitterAccount>) => Promise<void>
}

const storage = createStorage<TwitterAccount | null>('twitter-account', null, {
  storageEnum: StorageEnum.Local,
  liveUpdate: true,
  serialization: {
    serialize: (value: TwitterAccount | null) => JSON.stringify(value),
    deserialize: (text: string) => {
      try {
        return JSON.parse(text) as TwitterAccount | null
      } catch {
        return null
      }
    },
  },
})

export const twitterAccountStorage: TwitterAccountStorage = {
  ...storage,
  setTwitterAccount: async (twitterAccount: TwitterAccount) => {
    await storage.set(twitterAccount)
  },
  getTwitterAccount: async () => {
    return await storage.get()
  },
  removeTwitterAccount: async () => {
    await storage.set(null)
  },
  updateTwitterAccount: async (twitterAccountUpdate: Partial<TwitterAccount>) => {
    const currentTwitterAccount = await storage.get()
    if (currentTwitterAccount) {
      const updatedTwitterAccount = { ...currentTwitterAccount, ...twitterAccountUpdate }
      await storage.set(updatedTwitterAccount)
    }
  },
}
