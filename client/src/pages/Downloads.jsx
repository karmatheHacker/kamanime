import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import formatBytes from '../utils/formatBytes'
import { ArrowDownIcon, ArrowUpIcon } from '@radix-ui/react-icons'
import { useNavigate } from 'react-router-dom'
import { Tooltip } from '@radix-ui/themes'
import { useEffect, useRef, useState } from 'react'
import api2 from '../lib/api'

function Downloads() {
  const data = useQuery(api.torrents.getAll)
  const navigate = useNavigate()

  const [settings, setSettings] = useState({})
  const settingsRef = useRef(null)
  useEffect(() => {
    if (settingsRef.current === null) {
      api2.getSettingsJson().then((d) => { setSettings(d); settingsRef.current = d }).catch(() => {})
    } else {
      setSettings(settingsRef.current)
    }
  }, [])

  const torrents = data?.torrents ?? []
  const clientDownloadSpeed = data?.clientDownloadSpeed ?? 0
  const clientUploadSpeed = data?.clientUploadSpeed ?? 0

  const anime = settings?.currentAnime?.state || null
  const currAnime = settings?.currentAnime || null

  return (
    <div className="mx-9 mt-8 font-space-mono tracking-wide">
      <div className="mb-2 border-b border-gray-700 pb-1 font-space-mono text-lg font-bold tracking-wider flex items-center justify-between">
        <span>Downloads</span>
        <span className="text-xs text-[#555] font-normal">
          {formatBytes(clientDownloadSpeed)}/s ↓ &nbsp; {formatBytes(clientUploadSpeed)}/s ↑
        </span>
      </div>

      {torrents.length === 0 && (
        <p className="mt-6 text-sm text-[#555]">No active downloads.</p>
      )}

      {torrents.map((e, index) => (
        <div
          key={e.magnet ?? index}
          className="relative my-3 flex h-40 animate-fade-up select-none flex-col justify-center rounded-sm bg-[#21242650]"
        >
          <div className="flex h-full w-full flex-row">
            {anime && (
              <Tooltip content="Go to anime page.">
                <div className="h-full w-fit" onClick={() => navigate(`/anime/${anime?.animeId}`)}>
                  <img
                    src={anime?.animeCoverImage}
                    alt=""
                    className="duration-400 z-10 h-full w-fit animate-fade cursor-pointer rounded-sm object-cover transition-all ease-in-out"
                  />
                </div>
              </Tooltip>
            )}
            {anime?.bannerImage && (
              <div className="absolute left-0 top-0 -z-10 h-full w-full overflow-hidden">
                <img
                  src={anime.bannerImage}
                  alt=""
                  className="top-7 z-0 h-72 w-full object-cover opacity-20 blur-sm saturate-150"
                />
              </div>
            )}
            <Tooltip content={currAnime ? 'Go to player.' : 'Only metadata available.'}>
              <div
                className="flex w-full cursor-pointer flex-col justify-center px-4 py-2"
                onClick={() => { if (currAnime) navigate(currAnime.pathname, { state: currAnime }) }}
              >
                {anime && (
                  <p className="mb-2 line-clamp-2 py-1 text-[1.5rem] text-base tracking-tight">
                    {anime?.animeTitle}
                  </p>
                )}
                <p className="line-clamp-2 text-base tracking-tight">{e.name}</p>
                <div className="my-2 ml-1 grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-x-4 gap-y-2">
                  <p className="flex w-40 items-center justify-start gap-x-2 text-sm">
                    {formatBytes(e.downloadSpeed ?? 0)}/s <ArrowDownIcon />
                  </p>
                  <p className="flex w-40 items-center justify-start gap-x-2 text-sm">
                    {formatBytes(e.uploadSpeed ?? 0)}/s <ArrowUpIcon />
                  </p>
                  <p className="flex w-48 items-center justify-start gap-x-2 text-sm">
                    {((e.progress ?? 0) * 100).toFixed(2)}% Completed
                  </p>
                  <p className="flex w-48 items-center justify-start gap-x-2 text-sm">
                    {formatBytes(e.downloaded ?? 0)} Downloaded
                  </p>
                  <p className="flex w-48 items-center justify-start gap-x-2 text-sm">
                    {formatBytes(e.uploaded ?? 0)} Uploaded
                  </p>
                </div>
                <div className="downloadProgressBar h-1 w-full bg-gray-600">
                  <div
                    className="progress h-1 bg-blue-500"
                    style={{ width: `${(e.progress ?? 0) * 100}%` }}
                  />
                </div>
              </div>
            </Tooltip>
          </div>
        </div>
      ))}
    </div>
  )
}

export default Downloads
