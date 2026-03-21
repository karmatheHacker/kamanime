import { useEffect } from 'react'
import CenteredLoader from '../ui/CenteredLoader'
import { toast } from 'sonner'
import { ExclamationTriangleIcon } from '@radix-ui/react-icons'
import { useNavigate } from 'react-router-dom'
import { useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { getAnilistProfile } from '../utils/auth'

export default function AnilistAuthCallback() {
  const navigate = useNavigate()
  const upsertUser = useMutation(api.users.upsert)

  useEffect(() => {
    const getAccessToken = async () => {
      const hash = window.location.hash

      if (hash) {
        const params = new URLSearchParams(hash.substring(1)) // Remove the # at the beginning
        const accessToken = params.get('access_token')

        if (accessToken) {
          localStorage.setItem('anilist_token', accessToken)

          // Register user in Convex
          try {
            const profile = await getAnilistProfile(accessToken)
            if (profile) {
              await upsertUser({
                anilistId: profile.id,
                name: profile.name,
                avatar: profile.avatar?.large ?? undefined
              })
            }
          } catch (e) {
            console.warn('Failed to register user in Convex:', e)
          }

          window.location.replace('/')

          toast.success('Successfully logged in to AniList', {
            icon: <ExclamationTriangleIcon height="16" width="16" color="#ffffff" />,
            classNames: {
              title: 'text-green-500'
            }
          })
        }
      }
    }

    getAccessToken()
  }, [upsertUser])

  return (
    <div>
      <CenteredLoader />
    </div>
  )
}
