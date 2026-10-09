import type { BaseStorageType } from '../base/index.js'
import { createStorage, StorageEnum } from '../base/index.js'

type AccessToken = string

type AccessTokenStorage = BaseStorageType<AccessToken> & {
  setAccessToken: (accessToken: AccessToken) => Promise<void>
  getAccessToken: () => Promise<AccessToken>
  removeAccessToken: () => Promise<void>
}

const storage = createStorage<AccessToken>('access-token', '', {
  storageEnum: StorageEnum.Local,
  liveUpdate: true,
})

export const accessTokenStorage: AccessTokenStorage = {
  ...storage,
  setAccessToken: async (accessToken: AccessToken) => {
    await storage.set(accessToken)
  },
  getAccessToken: async () => {
    return await storage.get()
  },
  removeAccessToken: async () => {
    await storage.set('')
  },
}
