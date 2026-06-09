import { ArrowDownIcon, ArrowUpIcon, BarChartIcon } from '@radix-ui/react-icons'
import { useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import formatBytes from '../utils/formatBytes'
import { Button, Tooltip } from '@radix-ui/themes'

function DownloadMeter() {
  const data = useQuery(api.torrents.getAll)
  const clientDownloadSpeed = data?.clientDownloadSpeed ?? 0
  const clientUploadSpeed = data?.clientUploadSpeed ?? 0

  const [showFullSpeed, setShowFullSpeed] = useState(false)
  const [alwaysShow, setAlwaysShow] = useState(false)

  return (
    <div className="relative">
      <Tooltip content="Toggle Torrent Speeds" side="right">
        <Button
          size="1"
          color="gray"
          variant="soft"
          onMouseOver={() => setShowFullSpeed(true)}
          onMouseLeave={() => setShowFullSpeed(false)}
          onClick={() => setAlwaysShow(!alwaysShow)}
        >
          <BarChartIcon />
        </Button>
      </Tooltip>
      {(showFullSpeed || alwaysShow) && (
        <div className="absolute -left-[6rem] top-10 z-50 rounded-sm bg-[#111113]">
          <div className="flex w-64 select-none justify-center gap-x-2 text-nowrap px-1 py-2 font-space-mono text-xs">
            <div className="flex items-center gap-x-1">
              {formatBytes(clientDownloadSpeed)}/s <ArrowDownIcon />
            </div>
            <div className="flex items-center gap-x-1">
              {formatBytes(clientUploadSpeed)}/s <ArrowUpIcon />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DownloadMeter
