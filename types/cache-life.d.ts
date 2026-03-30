declare module 'next/cache' {
  export { unstable_cache } from 'next/dist/server/web/spec-extension/unstable-cache'
  export {
    updateTag,
    revalidateTag,
    revalidatePath,
    refresh,
  } from 'next/dist/server/web/spec-extension/revalidate'
  export { unstable_noStore } from 'next/dist/server/web/spec-extension/unstable-no-store'

    
    export function cacheLife(profile: "default"): void

    export function cacheLife(profile: "seconds"): void

    export function cacheLife(profile: "minutes"): void

    export function cacheLife(profile: "hours"): void

    export function cacheLife(profile: "days"): void

    export function cacheLife(profile: "weeks"): void

    export function cacheLife(profile: "max"): void

    export function cacheLife(profile: {
      
      stale?: number,
      
      revalidate?: number,
      
      expire?: number
    }): void

  import { cacheTag } from 'next/dist/server/use-cache/cache-tag'
  export { cacheTag }

  export const unstable_cacheTag: typeof cacheTag
  export const unstable_cacheLife: typeof cacheLife
}