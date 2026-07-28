// @ts-check
import { defineConfig } from 'astro/config'
import starlight from '@astrojs/starlight'

export default defineConfig({
  site: 'https://quanta-studio.github.io',
  base: '/react-native-richtext',
  integrations: [
    starlight({
      title: 'react-native-richtext',
      description: 'Fabric-native HTML renderer for React Native.',
      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/quanta-studio/react-native-richtext',
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
        {
          label: 'Community',
          items: [
            {
              label: 'Report a bug',
              link: 'https://github.com/quanta-studio/react-native-richtext/issues/new?template=bug_report.md',
              attrs: { target: '_blank', rel: 'noopener noreferrer' },
            },
            {
              label: 'Request a feature',
              link: 'https://github.com/quanta-studio/react-native-richtext/issues/new?template=feature_request.md',
              attrs: { target: '_blank', rel: 'noopener noreferrer' },
            },
          ],
        },
      ],
    }),
  ],
})
