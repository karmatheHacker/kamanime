import SearchBar from './SearchBar'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  DividerVerticalIcon,
  DownloadIcon,
  ExclamationTriangleIcon,
  GearIcon,
  LayersIcon,
  LightningBoltIcon,
  OpenInNewWindowIcon,
  PersonIcon
} from '@radix-ui/react-icons'
import { Button, DropdownMenu, Tooltip } from '@radix-ui/themes'
import { anilistAuthUrl } from '../utils/auth'
import { useEffect, useState } from 'react'
import useGetAnilistProfile from '../hooks/useGetAnilistProfile'
import { toast } from 'sonner'
import axios from 'axios'
import AnimePaheSearchBar from '../extensions/animepahe/components/AnimePaheSearchBar'
import AniListLogo from '../assets/symbols/AniListLogo'
import { useZenshinContext } from '../utils/ContextProvider'
import DownloadMeter from './DownloadMeter'
import api from '../lib/api'

export default function Header() {
  const navigate = useNavigate()
  const { setUserId, backendPort, serverUrl, settings, chatOpen, setChatOpen, unreadNotifications } = useZenshinContext()


  /* -------------------- ANILIST AUTH -------------------- */
  const [anilistToken, setAnilistToken] = useState(localStorage.getItem('anilist_token') || '')

  useEffect(() => {
    // In web mode, check URL hash for AniList token (OAuth implicit flow redirect)
    const hash = window.location.hash
    if (hash && hash.includes('access_token')) {
      const params = new URLSearchParams(hash.replace('#', ''))
      const accessToken = params.get('access_token')
      if (accessToken) {
        localStorage.setItem('anilist_token', accessToken)
        window.location.reload()
      }
    }
  }, [])

  const {
    isLoading,
    data: userProfile,
    error: userProfileError,
    status
  } = useGetAnilistProfile(anilistToken)

  useEffect(() => {
    if (userProfile) {
      setUserId(userProfile.id)
    }
  }, [userProfile])

  const handleLogin = () => {
    window.open(anilistAuthUrl, '_blank')
  }

  const handleLogout = () => {
    localStorage.removeItem('anilist_token')
    localStorage.removeItem('anilist_id')
    localStorage.removeItem('anilist_name')
    setAnilistToken('')
    setUserId('')

    // refresh the page
    window.location.reload()
  }

  if (userProfileError) {
    toast.error('Error fetching AniList Profile', {
      description: userProfileError?.message,
      classNames: {
        title: 'text-rose-500'
      }
    })
  }

  // get current route and check if it is /animepahe
  const { pathname } = useLocation()

  const animepahe = pathname.includes('/animepahe')

  return (
    <div className="draggable sticky top-0 z-50 flex h-11 items-center justify-between border-[#5a5e6750] bg-[#111113] bg-opacity-60 px-3 py-3 backdrop-blur-md">
      <div className="nodrag flex items-center justify-center gap-x-1 sm:gap-x-2">
        <Link
          className="nodrag hover: font-spaceMono flex w-fit cursor-pointer select-none flex-col items-center justify-center gap-x-2 rounded-sm p-1 text-sm transition-all duration-200 hover:bg-[#70707030]"
          to={'/'}
        >
          <div className="relative flex flex-col items-center leading-none">
            <span className="font-bold text-white text-lg tracking-tighter">Kamanime.</span>
            <span className="absolute -bottom-1 text-[0.6rem] font-bold text-[#B026FF] opacity-85">カマニメ</span>
          </div>
        </Link>

        <DividerVerticalIcon width={20} height={20} color="#ffffff40" className="hidden md:block" />
        <div className="hidden md:flex gap-4">
          <Button color="gray" variant="ghost" size={'1'} onClick={() => navigate(-1)}>
            <ArrowLeftIcon className="my-1" width={16} height={16} />
          </Button>
          <Button color="gray" variant="ghost" size={'1'} onClick={() => navigate(1)}>
            <ArrowRightIcon className="my-1" width={16} height={16} />
          </Button>
        </div>
        <DividerVerticalIcon width={20} height={20} color="#ffffff40" className="hidden md:block" />
        <Link to="/newreleases" className="hidden md:block">
          <Button className="nodrag" color="gray" variant="soft" size={'1'}>
            <div className="font-space-mono text-[.8rem]">New</div>
          </Button>
        </Link>
        <Button
          className="nodrag hidden md:flex"
          size="1"
          color="gray"
          variant="soft"
          onClick={() => navigate('/animepahe')}
        >
          <span className="font-space-mono text-[.8rem]">Pahe</span>
        </Button>

        <Button
          className="nodrag hidden md:flex"
          size="1"
          color="gray"
          variant="soft"
          onClick={() => navigate('/anilist')}
          style={{ padding: '0 .4rem' }}
        >
          <AniListLogo style="h-5 w-5" />
        </Button>

        <div className="relative">
          <Button
            className="nodrag"
            size="1"
            color={chatOpen ? 'violet' : 'gray'}
            variant={chatOpen ? 'solid' : 'soft'}
            onClick={() => setChatOpen(o => !o)}
            style={{ padding: '0 .4rem' }}
            title="Community Chat"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
            </svg>
          </Button>
          {!chatOpen && unreadNotifications?.total > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center px-0.5 pointer-events-none">
              {unreadNotifications.total > 99 ? '99+' : unreadNotifications.total}
            </span>
          )}
        </div>
      </div>

      <div className="nodrag mx-1 md:mx-5 flex-1 max-w-[160px] md:max-w-none md:w-2/6">{animepahe ? <AnimePaheSearchBar /> : <SearchBar />}</div>
      <div className="nodrag mr-0 md:mr-4 flex items-center justify-center gap-x-2 md:gap-x-4">
        <Button className="hidden md:flex" color="gray" variant="soft" size={'1'} onClick={() => navigate('/downloads')}>
          <DownloadIcon />
        </Button>
        <div className="hidden md:block"><DownloadMeter /></div>

        {true && (
          <DropdownMenu.Root className="nodrag" modal={false}>
            <DropdownMenu.Trigger>
              <Button variant="ghost" color="gray">
                <div className="flex animate-fade items-center gap-x-2">
                  {userProfile ? (
                    <img
                      src={userProfile.avatar.large}
                      alt="avatar"
                      className="h-6 w-6 rounded-full"
                    />
                  ) : (
                    <PersonIcon className="my-1" width={16} height={16} />
                  )}
                  <div className="font-space-mono text-[.8rem]">
                    {userProfile?.name || 'anonuser'}
                  </div>
                </div>
                <DropdownMenu.TriggerIcon className="ml-1" />
              </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content>
              <DropdownMenu.Item
                onClick={() => window.open('https://discord.gg/AHhuDZskhe', '_blank')}
                shortcut={<OpenInNewWindowIcon />}
              >
                Discord{' '}
                <svg
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  style={{ marginLeft: '4px' }}
                >
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.054-.108.001-.23-.106-.271a12.962 12.962 0 0 1-1.883-.894.083.083 0 0 1-.008-.137c.126-.094.252-.192.372-.29a.075.075 0 0 1 .077-.01c3.927 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.196.373.29a.083.083 0 0 1-.006.137 12.661 12.661 0 0 1-1.883.894.083.083 0 0 0-.106.27c.353.7.764 1.365 1.226 1.995.054.077.031.028.084.028a19.876 19.876 0 0 0 6.026-3.03.078.078 0 0 0 .032-.057c.487-5.187-.803-9.66-3.606-13.66a.066.066 0 0 0-.033-.027zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                </svg>
              </DropdownMenu.Item>
              <DropdownMenu.Item
                onClick={() => window.open('https://www.instagram.com/kamanime.xyz?igsh=MjF2NHI3aTkxcmJt', '_blank')}
                shortcut={<OpenInNewWindowIcon />}
              >
                Instagram{' '}
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  style={{ marginLeft: '4px' }}
                >
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </DropdownMenu.Item>
<DropdownMenu.Item
                onClick={() => {
                  if (settings.downloadsFolderPath) {
                    toast.info(`Downloads folder: ${settings.downloadsFolderPath}`)
                  }
                }}
                shortcut={<DownloadIcon />}
              >
                Downloads Path
              </DropdownMenu.Item>
              <DropdownMenu.Item
                color="gray"
                onClick={() => navigate('/settings')}
                shortcut={<GearIcon />}
              >
                Settings
              </DropdownMenu.Item>
              <DropdownMenu.Separator />
              {userProfile ? (
                <DropdownMenu.Item color="red" onClick={handleLogout}>
                  Logout
                </DropdownMenu.Item>
              ) : (
                <DropdownMenu.Item color="green" onClick={handleLogin}>
                  Login With AniList
                </DropdownMenu.Item>
              )}
            </DropdownMenu.Content>
          </DropdownMenu.Root>
        )}
      </div>
    </div>
  )
}
