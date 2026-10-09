import type { BaseStorageType } from '../base/index.js'
import { createStorage, StorageEnum } from '../base/index.js'

type RefreshToken = string

type RefreshTokenStorage = BaseStorageType<RefreshToken> & {
  setRefreshToken: (refreshToken: RefreshToken) => Promise<void>
  getRefreshToken: () => Promise<RefreshToken>
  removeRefreshToken: () => Promise<void>
}

const storage = createStorage<RefreshToken>('refresh-token', '', {
  storageEnum: StorageEnum.Local,
  liveUpdate: true,
})

export const refreshTokenStorage: RefreshTokenStorage = {
  ...storage,
  setRefreshToken: async (refreshToken: RefreshToken) => {
    await storage.set(refreshToken)
  },
  getRefreshToken: async () => {
    return await storage.get()
  },
  removeRefreshToken: async () => {
    await storage.set('')
  },
}
