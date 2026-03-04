import { defineStore } from 'pinia'
import { onAuthStateChanged } from 'firebase/auth'
import { auth, hasFirebaseConfig } from '../plugins/firebase'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    initialized: false,
    _unsub: null,
    _readyPromise: null,
  }),
  getters: {
    isLoggedIn: (state) => !!state.user,
  },
  actions: {
    init() {
      if (this._readyPromise) return this._readyPromise

      this._readyPromise = new Promise((resolve) => {
        if (!hasFirebaseConfig || !auth) {
          this.initialized = true
          resolve(null)
          return
        }

        this._unsub = onAuthStateChanged(auth, (user) => {
          this.user = user ?? null
          if (!this.initialized) {
            this.initialized = true
            resolve(this.user)
          }
        })
      })

      return this._readyPromise
    },
    async waitForInit() {
      await this.init()
      return this.user
    },
    dispose() {
      this._unsub?.()
      this._unsub = null
      this._readyPromise = null
      this.initialized = false
      this.user = null
    },
  },
})
