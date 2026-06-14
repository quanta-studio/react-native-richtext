// @ts-check
import { defineConfig } from 'astro/config'
import starlight from '@astrojs/starlight'

export default defineConfig({
  site: 'https://yk-yong.github.io',
  base: '/react-native-richtext',
  integrations: [
    starlight({
      title: 'react-native-richtext',
      description: 'Fabric-native HTML renderer for React Native.',
      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/yk-yong/react-native-richtext',
        },
      ],
      sidebar: [
        { label: 'Getting Started', slug: 'getting-started' },
        {
          label: 'Guides',
          items: [
            { label: 'Styling', slug: 'guides/styling' },
            { label: 'Custom renderers', slug: 'guides/custom-renderers' },
            { label: 'Fonts', slug: 'guides/fonts' },
          ],
        },
        {
          label: 'Reference',
          items: [
            { label: 'API', slug: 'reference/api' },
            { label: 'Supported tags', slug: 'reference/supported-tags' },
          ],
        },
      ],
    }),
  ],
})
