import {defineCliConfig} from 'sanity/cli'

export default defineCliConfig({
  api: {
    projectId: 'a062b30n',
    dataset: 'production'
  },
  deployment: {
    /**
     * Studio app id pinned by `sanity deploy` on the first run. Avoids the
     * "Which application?" prompt on every subsequent deploy.
     */
    appId: 'w5ln153v5d3hwvfts4gohiik',
    /**
     * Enable auto-updates for studios.
     * Learn more at https://www.sanity.io/docs/studio/latest-version-of-sanity#k47faf43faf56
     */
    autoUpdates: true,
  }
})
