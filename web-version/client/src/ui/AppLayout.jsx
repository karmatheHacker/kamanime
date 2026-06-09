import { Button, Theme } from '@radix-ui/themes'
import { Link, Outlet, useLocation, useNavigate, useNavigation } from 'react-router-dom'
import Loader from './Loader'
import { toast, Toaster } from 'sonner'
import { useEffect, useState } from 'react'
import Header from '../components/Header'
import ChatPanel from '../components/ChatPanel'
import { ReactLenis } from '@studio-freight/react-lenis'
import { DownloadIcon, GitHubLogoIcon } from '@radix-ui/react-icons'
import { useZenshinContext } from '../utils/ContextProvider'
import { useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'

export default function AppLayout({ props }) {
  const navigation = useNavigation()
  const isLoading = navigation.state === 'loading'
  const [theme, setTheme] = useState('dark')
  const { checkForUpdates, smoothScroll } = useZenshinContext()
  const location = useLocation()
  const recordVisit = useMutation(api.analytics.recordVisit)

  // Generate a stable session ID per browser
  const sessionId = (() => {
    let id = localStorage.getItem('_session_id')
    if (!id) { id = Math.random().toString(36).slice(2); localStorage.setItem('_session_id', id) }
    return id
  })()

  useEffect(() => {
    recordVisit({ path: location.pathname, sessionId }).catch(() => {})
  }, [location.pathname])

  function toggleTheme() {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
    console.log(theme)
  }

  // use alt + arrow keys to navigate between pages
  const navigate = useNavigate()
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.altKey && e.key === 'ArrowLeft') {
        navigate(-1)
      }
      if (e.altKey && e.key === 'ArrowRight') {
        navigate(1)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [navigate])

  const getLatestRelease = async () => {
    // No external update check — self-hosted
  }

  useEffect(() => {
    if (checkForUpdates) getLatestRelease()
  }, [checkForUpdates])

  // const MainComponent = () => {
  //   return (
  //     <Theme appearance={theme}>
  //       <Toaster
  //         theme={theme}
  //         // richColors
  //         unstyled={false}
  //         toastOptions={{
  //           classNames: {
  //             error: 'bg-[#1c1317] border border-rose-500',
  //             success: 'bg-[#131c16] border border-green-500',
  //             icon: 'opacity-80',
  //             description: 'font-space-mono text-white opacity-90'
  //           }
  //         }}
  //       />
  //       <div
  //         className="layout flex flex-col font-inter"
  //         style={{
  //           direction: 'ltr'
  //         }}
  //       >
  //         {isLoading && <Loader />}
  //         <Header />
  //         <main className="">{props || <Outlet />}</main>
  //       </div>
  //     </Theme>
  //   )
  // }

  /* ------------------------------------------------------ */
  return (
    <>
      {smoothScroll ? (
        <ReactLenis root options={{ lerp: 0.15 }}>
          <Theme appearance={theme}>
            <Toaster
              theme={theme}
              unstyled={false}
              toastOptions={{
                classNames: {
                  error: 'bg-[#1c1317] border border-rose-500',
                  success: 'bg-[#131c16] border border-green-500',
                  icon: 'opacity-80',
                  description: 'font-space-mono text-white opacity-90'
                }
              }}
            />
            <div
              className="layout flex flex-col font-inter"
              style={{ direction: 'ltr' }}
            >
              {isLoading && <Loader />}
              <Header />
              <main className="">{props || <Outlet />}</main>
            </div>
          </Theme>
        </ReactLenis>
      ) : (
        <Theme appearance={theme}>
          <Toaster
            theme={theme}
            unstyled={false}
            toastOptions={{
              classNames: {
                error: 'bg-[#1c1317] border border-rose-500',
                success: 'bg-[#131c16] border border-green-500',
                icon: 'opacity-80',
                description: 'font-space-mono text-white opacity-90'
              }
            }}
          />
          <div
            className="layout flex flex-col font-inter"
            style={{ direction: 'ltr' }}
          >
            {isLoading && <Loader />}
            <Header />
            <main className="">{props || <Outlet />}</main>
          </div>
        </Theme>
      )}
      {/* ChatPanel must live outside ReactLenis — CSS transforms break position:fixed */}
      <ChatPanel />
    </>
  )
}
