import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'FlowDesk',
    short_name: 'FlowDesk',
    description: 'Personal command center — tasks, projects, archive',
    start_url: '/today',
    display: 'standalone',
    background_color: '#fafafa',
    theme_color: '#0f172a',
    orientation: 'portrait-primary',
    icons: [
      {
        src: '/icons/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      {
        name: 'Hôm nay',
        short_name: 'Hôm nay',
        url: '/today',
        description: 'Xem tasks hôm nay',
      },
      {
        name: 'Lưu trữ',
        short_name: 'Lưu trữ',
        url: '/archive',
        description: 'Kho lưu trữ',
      },
    ],
  }
}
