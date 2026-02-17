export type SiteMeta = {
  title: string
  description: string
  favicon: string
}

export type Profile = {
  name: string
  role: string
  imageUrl: string
  imageAlt: string
}

export type SocialCard = {
  type: 'social'
  className: string
  url: string
  iconClass: string
  label: string
  sublabel: string
}

export type ScrapeFields = {
  sourceUrl?: string
  scrape?: boolean
  fallbackImage?: string
  fallbackLabel?: string
  fallbackDescription?: string
}

export type LinkCard = {
  type: 'link'
  className: string
  url: string
  previewImageUrl: string
  label: string
  sublabel: string
} & ScrapeFields

export type InstagramCard = {
  type: 'instagram'
  url: string
  iconClass: string
  label: string
  sublabel: string
  images: Array<{
    src: string
    alt: string
    href: string
    sourceUrl?: string
  }>
} & ScrapeFields

export type Card = SocialCard | LinkCard | InstagramCard

export type SiteConfig = {
  meta: SiteMeta
  profile: Profile
  cards: Card[]
}

const profileImage = '/images/profile-ryo.png'

export const siteConfig: SiteConfig = {
  meta: {
    title: 'Ryo.Tonegawa | Link in Bio',
    description:
      'Ryo.Tonegawa のリンクまとめページ。SNS、制作実績、プロフィールへの導線を1ページで確認できます。',
    favicon: profileImage,
  },
  profile: {
    name: 'Ryo.Tonegawa',
    role: 'フリーランス エンジニア & 講師',
    imageUrl: profileImage,
    imageAlt: 'Ryo.Tonegawaのプロフィール画像',
  },
  cards: [
    {
      type: 'social',
      className: 'twitter',
      url: 'https://x.com/tori_create',
      iconClass: 'fa-brands fa-twitter',
      label: 'Twitter',
      sublabel: 'tori_create',
    },
    {
      type: 'instagram',
      url: 'https://instagram.com/ryo_fren',
      sourceUrl: 'https://instagram.com/ryo_fren',
      scrape: true,
      iconClass: 'fa-brands fa-instagram',
      label: 'Instagram',
      sublabel: '@ryo_fren',
      fallbackLabel: 'Instagram',
      fallbackDescription: '@ryo_fren',
      fallbackImage: '/images/profile-ryo.png',
      images: [
        {
          src: '/images/profile-ryo.png',
          alt: '登山風景のInstagram投稿',
          href: 'https://instagram.com/ryo_fren',
          sourceUrl: 'https://instagram.com/ryo_fren',
        },
        {
          src: '/images/profile-ryo.png',
          alt: 'アウトドアアクティビティのInstagram投稿',
          href: 'https://www.instagram.com/stories/highlights/17854270029305438/',
          sourceUrl:
            'https://www.instagram.com/stories/highlights/17854270029305438/',
        },
        {
          src: '/images/profile-ryo.png',
          alt: '旅行先のInstagram投稿',
          href: 'https://www.instagram.com/stories/highlights/17976581579895976/',
          sourceUrl:
            'https://www.instagram.com/stories/highlights/17976581579895976/',
        },
        {
          src: '/images/profile-ryo.png',
          alt: '読書のInstagram投稿',
          href: 'https://www.instagram.com/stories/highlights/18098263855581241/',
          sourceUrl:
            'https://www.instagram.com/stories/highlights/18098263855581241/',
        },
      ],
    },
    {
      type: 'social',
      className: 'github',
      url: 'https://github.com/rito-aither',
      iconClass: 'fa-brands fa-github',
      label: 'GitHub',
      sublabel: 'rito-aither',
    },
    {
      type: 'link',
      className: 'website',
      url: 'http://tori-dev.com/',
      sourceUrl: 'http://tori-dev.com/',
      scrape: true,
      previewImageUrl:
        'https://storage.googleapis.com/creatorspace-public/sites/ogimages/aHR0cHM6Ly90b3JpLWRldi5jb20vaW1hZ2VzL2FsZm9ucy1tb3JhbGVzLVlMU3dqU3k3c3R3LXVuc3BsYXNoLmpwZw==.jpeg',
      label: 'tori-dev',
      sublabel: 'tori-dev.com',
      fallbackImage:
        'https://storage.googleapis.com/creatorspace-public/sites/ogimages/aHR0cHM6Ly90b3JpLWRldi5jb20vaW1hZ2VzL2FsZm9ucy1tb3JhbGVzLVlMU3dqU3k3c3R3LXVuc3BsYXNoLmpwZw==.jpeg',
      fallbackLabel: 'tori-dev',
      fallbackDescription: 'tori-dev.com',
    },
    {
      type: 'link',
      className: 'yamap',
      url: 'https://yamap.com/users/2542531',
      sourceUrl: 'https://yamap.com/users/2542531',
      scrape: true,
      previewImageUrl:
        'https://storage.googleapis.com/creatorspace-public/sites/ogimages/aHR0cHM6Ly9hc3NldHMueWFtYXAuY29tL2ltYWdlcy9vZ3BfbmV3LnBuZw==.png',
      label: 'ryo | YAMAP / ヤマップ',
      sublabel: 'yamap.com',
      fallbackImage:
        'https://storage.googleapis.com/creatorspace-public/sites/ogimages/aHR0cHM6Ly9hc3NldHMueWFtYXAuY29tL2ltYWdlcy9vZ3BfbmV3LnBuZw==.png',
      fallbackLabel: 'ryo | YAMAP / ヤマップ',
      fallbackDescription: 'yamap.com',
    },
    {
      type: 'social',
      className: 'linkedin',
      url: 'https://linkedin.com/in/tori-dev',
      iconClass: 'fa-brands fa-linkedin',
      label: 'LinkedIn',
      sublabel: 'tori-dev',
    },
    {
      type: 'link',
      className: 'wantedly',
      url: 'https://www.wantedly.com/id/ryo_tonegawa',
      sourceUrl: 'https://www.wantedly.com/id/ryo_tonegawa',
      scrape: true,
      previewImageUrl:
        'https://storage.googleapis.com/creatorspace-public/sites/ogimages/aHR0cHM6Ly93d3cud2FudGVkbHkuY29tL3VzZXJzLzE3ODM4NDU0L3NoYXJlX2ltYWdl.jpeg',
      label: '利根川 諒のプロフィール',
      sublabel: 'Wantedly',
      fallbackImage:
        'https://storage.googleapis.com/creatorspace-public/sites/ogimages/aHR0cHM6Ly93d3cud2FudGVkbHkuY29tL3VzZXJzLzE3ODM4NDU0L3NoYXJlX2ltYWdl.jpeg',
      fallbackLabel: '利根川 諒のプロフィール',
      fallbackDescription: 'Wantedly',
    },
    {
      type: 'link',
      className: 'lancers',
      url: 'https://www.lancers.jp/profile/rito-1345',
      sourceUrl: 'https://www.lancers.jp/profile/rito-1345',
      scrape: true,
      previewImageUrl:
        'https://storage.googleapis.com/creatorspace-public/sites/ogimages/aHR0cHM6Ly9pbWcyLmxhbmNlcnMuanAvdXNlcnByb2ZpbGUvOTA5Nzc4LzEzOTY2MzMvNmU1NGQyNjE0MWZhMTQxNmUyZGU2N2EwZWY1Y2U2M2VjNWFjYjAzMGExNGIzMTlhYzliY2RhNDEzYWQxYTUwOC8zNzQ1NjUxN18xNTBfMC5qcGc=.jpeg',
      label: 'tonegawa ryo (rito-1345)',
      sublabel: 'lancers.jp',
      fallbackImage:
        'https://storage.googleapis.com/creatorspace-public/sites/ogimages/aHR0cHM6Ly9pbWcyLmxhbmNlcnMuanAvdXNlcnByb2ZpbGUvOTA5Nzc4LzEzOTY2MzMvNmU1NGQyNjE0MWZhMTQxNmUyZGU2N2EwZWY1Y2U2M2VjNWFjYjAzMGExNGIzMTlhYzliY2RhNDEzYWQxYTUwOC8zNzQ1NjUxN18xNTBfMC5qcGc=.jpeg',
      fallbackLabel: 'tonegawa ryo (rito-1345)',
      fallbackDescription: 'lancers.jp',
    },
    {
      type: 'social',
      className: 'facebook',
      url: 'https://www.facebook.com/profile.php?id=100004853536494',
      iconClass: 'fa-brands fa-facebook',
      label: 'Facebook',
      sublabel: 'ryo.tonegawa',
    },
    {
      type: 'link',
      className: 'sora',
      url: 'https://sora.chatgpt.com/profile/tori_24',
      sourceUrl: 'https://sora.chatgpt.com/profile/tori_24',
      scrape: true,
      previewImageUrl:
        'https://storage.googleapis.com/creatorspace-public/sites/aHR0cHM6Ly9zb3JhLmNoYXRncHQuY29tL3Byb2ZpbGUvdG9yaV8yNA==/screenshot.jpeg',
      label: 'Sora Profile',
      sublabel: 'sora.chatgpt.com',
      fallbackImage:
        'https://storage.googleapis.com/creatorspace-public/sites/aHR0cHM6Ly9zb3JhLmNoYXRncHQuY29tL3Byb2ZpbGUvdG9yaV8yNA==/screenshot.jpeg',
      fallbackLabel: 'Sora Profile',
      fallbackDescription: 'sora.chatgpt.com',
    },
  ],
}
