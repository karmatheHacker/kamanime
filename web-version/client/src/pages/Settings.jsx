import { Button, Checkbox, Flex, Switch, TextField } from '@radix-ui/themes'
import { useZenshinContext } from '../utils/ContextProvider'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import api from '../lib/api'

export default function Settings() {
  const {
    glow,
    setGlow,
    vlcPath,
    setVlcPath,
    autoUpdateAnilistEpisode,
    setAutoUpdateAnilistEpisode,
    scrollOpacity,
    setScrollOpacity,
    hideHero,
    setHideHero,
    checkForUpdates,
    setCheckForUpdates,
    backendPort,
    setBackendPort,
    broadcastDiscordRpc,
    setBroadcastDiscordRpc,
    hoverCard,
    setHoverCard,
    settings,
    setSettings,
    smoothScroll,
    setSmoothScroll,
    uploadLimit,
    setUploadLimit,
    downloadLimit,
    setDownloadLimit
  } = useZenshinContext()

  const [tempBackendPort, setTempBackendPort] = useState(backendPort)
  const [tempUploadLimit, setTempUploadLimit] = useState(uploadLimit === -1 ? '' : uploadLimit)
  const [tempDownloadLimit, setTempDownloadLimit] = useState(
    downloadLimit === -1 ? '' : downloadLimit
  )

  console.log('downloadLimit', downloadLimit);

  function toggleGlow() {
    const newGlowState = !glow // Determine the new state
    setGlow(newGlowState) // Update context state
    localStorage.setItem('glow', newGlowState ? 'true' : 'false') // Update localStorage correctly
  }

  function updateVlcPath(e) {
    // replace double quotes with empty string
    const newPath = e.target.value.replace(/"/g, '')
    setVlcPath(`"${newPath}"`)
    localStorage.setItem('vlcPath', `"${newPath}"`)
  }
  function updateUploadLimit(e) {
    let newSpeed = -1
    let value = parseInt(e.target.value, 10) // Convert input to number
    setTempUploadLimit(value)
    if (!isNaN(value) && value > -1) {
      newSpeed = value
      api.saveToSettings('uploadLimit', newSpeed * 1024)
    } else {
      api.saveToSettings('uploadLimit', newSpeed)
    }
    setUploadLimit(newSpeed)
  }
  function updateDownloadLimit(e) {
    let newSpeed = -1
    let value = parseInt(e.target.value, 10) // Convert input to number
    setTempDownloadLimit(value)
    if (!isNaN(value) && value > -1) {
      newSpeed = value
      api.saveToSettings('downloadLimit', newSpeed * 1024)
    } else {
      api.saveToSettings('downloadLimit', newSpeed)
    }
    setDownloadLimit(newSpeed)
  }

  function toggleAutoUpdateAnilistEpisode() {
    const newAutoUpdateAnilistEpisodeState = !autoUpdateAnilistEpisode
    setAutoUpdateAnilistEpisode(newAutoUpdateAnilistEpisodeState)
    localStorage.setItem(
      'autoUpdateAnilistEpisode',
      newAutoUpdateAnilistEpisodeState ? 'true' : 'false'
    )
  }

  function toggleScrollOpacity() {
    const newScrollOpacityState = !scrollOpacity
    setScrollOpacity(newScrollOpacityState)
    localStorage.setItem('scrollOpacity', newScrollOpacityState ? 'true' : 'false')
  }

  function toggleHideHero() {
    const newHideHeroState = !hideHero
    setHideHero(newHideHeroState)
    localStorage.setItem('hideHero', newHideHeroState ? 'true' : 'false')
    if (newHideHeroState === true) {
      localStorage.setItem('scrollOpacity', 'false')
      setScrollOpacity(false)
    }
  }

  function toggleCheckForUpdates() {
    const newCheckForUpdatesState = !checkForUpdates
    setCheckForUpdates(newCheckForUpdatesState)
    localStorage.setItem('checkForUpdates', newCheckForUpdatesState ? 'true' : 'false')
  }

  async function changeDownloadsFolder() {
    const newPath = prompt('Enter the new downloads folder path:')
    if (newPath) {
      await api.saveToSettings('downloadsFolderPath', newPath)
      const updatedSettings = await api.getSettingsJson()
      setSettings(updatedSettings)
    }
  }

  function toggleHoverCard() {
    const newHoverCardState = !hoverCard
    setHoverCard(newHoverCardState)
    localStorage.setItem('hoverCard', newHoverCardState ? 'true' : 'false')
  }

  function toggleSmoothScroll() {
    const newSmoothScrollState = !smoothScroll
    setSmoothScroll(newSmoothScrollState)
    localStorage.setItem('smoothScroll', newSmoothScrollState ? 'true' : 'false')
  }

  console.log(settings)

  return (
    <div className="w-full animate-fade select-none px-4 py-6 font-space-mono animate-duration-500 sm:px-16 sm:py-10">
      <div className="mb-8 border-b border-gray-700 pb-2 font-semibold tracking-wider text-[#b5b5b5ff]">
        Settings
      </div>

      <div className="flex flex-col gap-4 tracking-wide text-[#b5b5b5ff]">
        <div className="flex w-full items-center justify-between bg-[#202022] px-4 py-2">
          <div className="switch_card">
            <p className="font-bold">Glow Effect</p>
            <p className="text-xs">
              Enable or disable the glow effect surrounding banners, as well as the hover-triggered
              glow effect on anime cards.
            </p>
          </div>
          <Switch
            checked={glow}
            style={{ marginLeft: '1.5rem', cursor: 'pointer' }}
            onCheckedChange={toggleGlow}
          />
        </div>

        <div className="flex w-full items-center justify-between bg-[#202022] px-4 py-2">
          <div className="switch_card">
            <p className="font-bold">Auto Update Episodes on Anilist</p>
            <p className="text-xs">
              If turned on, Kamanime will automatically update the episode on Anilist when more than
              80% of the episode is watched.
            </p>
          </div>
          <Switch
            checked={autoUpdateAnilistEpisode}
            style={{ marginLeft: '1.5rem', cursor: 'pointer' }}
            onCheckedChange={toggleAutoUpdateAnilistEpisode}
          />
        </div>

        <div className="flex w-full items-center justify-between bg-[#202022] px-4 py-2">
          <div className="switch_card">
            <p className="font-bold">Scroll Opacity</p>
            <p className="text-xs">
              Turn on scroll opacity effect on the home page. Turning it <b>off</b> will slightly{' '}
              <b>improve performance</b>.
            </p>
          </div>
          <Switch
            checked={scrollOpacity}
            style={{ marginLeft: '1.5rem', cursor: 'pointer' }}
            onCheckedChange={toggleScrollOpacity}
          />
        </div>

        <div className="flex w-full items-center justify-between bg-[#202022] px-4 py-2">
          <div className="switch_card">
            <p className="font-bold">Hide Hero on Home Page</p>
            <p className="text-xs">
              Hide the hero section on the home page. Turning it on will disable the scroll opacity
              effect.
            </p>
          </div>
          <Switch
            checked={hideHero}
            style={{ marginLeft: '1.5rem', cursor: 'pointer' }}
            onCheckedChange={toggleHideHero}
          />
        </div>
        <div className="flex w-full items-center justify-between bg-[#202022] px-4 py-2">
          <div className="switch_card">
            <p className="font-bold">Modal popup when hovering over anime cards</p>
            <p className="text-xs">
              Enable or disable the modal popup when hovering over anime cards. <br /> Disabling
              this will slightly <b>improve performance</b> and reduce scroll lag.
            </p>
          </div>
          <Switch
            checked={hoverCard}
            style={{ marginLeft: '1.5rem', cursor: 'pointer' }}
            onCheckedChange={toggleHoverCard}
          />
        </div>
        <div className="flex w-full items-center justify-between bg-[#202022] px-4 py-2">
          <div className="switch_card">
            <p className="font-bold">Check for Updates on App Launch</p>
            <p className="text-xs">
              If turned on, Kamanime will automatically check for updates on app launch and notify
              you if a new version is available.
            </p>
          </div>
          <Switch
            checked={checkForUpdates}
            style={{ marginLeft: '1.5rem', cursor: 'pointer' }}
            onCheckedChange={toggleCheckForUpdates}
          />
        </div>

        <div className="flex w-full items-center justify-between bg-[#202022] px-4 py-2">
          <div className="text_input_card">
            <p className="font-bold">External Media Player Path</p>
            <p className="text-xs">Set the path to the executable file of external media player.</p>
            <p className="text-xs">Current Path: {vlcPath}</p>
          </div>
          <TextField.Root
            placeholder={vlcPath}
            value={vlcPath.replace(/"/g, '')}
            onInput={updateVlcPath}
            className="w-1/2"
          ></TextField.Root>
        </div>

        <div className="flex w-full items-center justify-between bg-[#202022] px-4 py-2">
          <div className="text_input_card">
            <p className="font-bold">Max Download Speed</p>
            <p className="text-xs">
              Set the maximum download speed for torrents. <br /> Leave empty for unlimited speed.{' '}
              <b>Restart</b> the server after changing the speed.
            </p>
            <p className="text-xs">
              Current Speed: {downloadLimit === -1 ? 'Unlimited' : downloadLimit + ' KB/s'}
            </p>
          </div>
          <TextField.Root
            type="number"
            placeholder={'Unlimited'}
            onInput={updateDownloadLimit}
            value={tempDownloadLimit}
            className="w-1/2"
          ></TextField.Root>
        </div>

        <div className="flex w-full items-center justify-between bg-[#202022] px-4 py-2">
          <div className="text_input_card">
            <p className="font-bold">Max Upload Speed</p>
            <p className="text-xs">
              Set the maximum upload speed for torrents. <br /> Leave empty for unlimited speed.{' '}
              <b>Restart</b> the server after changing the speed.
            </p>
            <p className="text-xs">
              Current Speed: {uploadLimit === -1 ? 'Unlimited' : uploadLimit + ' KB/s'}
            </p>
          </div>
          <TextField.Root
            type="number"
            placeholder={'Unlimited'}
            onInput={updateUploadLimit}
            value={tempUploadLimit}
            className="w-1/2"
          ></TextField.Root>
        </div>

        <div className="flex w-full items-center justify-between bg-[#202022] px-4 py-2">
          <div className="button_card">
            <p className="font-bold">Change Torrent Download Location</p>
            <p className="text-xs">Change the default download location of torrent files.</p>
            <p className="text-xs">Current path: &quot;{settings.downloadsFolderPath}&quot;</p>
          </div>
          <Button
            variant="outline"
            className="cursor-pointer"
            onClick={() => {
              changeDownloadsFolder()
            }}
          >
            Change Download Folder
          </Button>
        </div>

        <div className="flex w-full items-center justify-between bg-[#202022] px-4 py-2">
          <div className="">
            <p className="font-bold">Backend Port</p>
            <p className="text-xs">
              The backend server port is fixed at <b className="tracking-wider">64621</b> in the web version.
              <br />
              To change it, update the server configuration and restart the server.
            </p>
            <p className="text-xs">
              Current port: <b className="tracking-wider">{backendPort}</b>
            </p>
          </div>

          <div className="flex w-fit">
            <TextField.Root
              placeholder={backendPort}
              type="number"
              value={tempBackendPort}
              onInput={(e) => setTempBackendPort(e.target.value)}
              className="w-24"
              style={{
                borderRadius: '0.25rem 0 0 0.25rem'
              }}
            ></TextField.Root>

            <Button
              variant="outline"
              color="gray"
              onClick={() => {
                setBackendPort(tempBackendPort)
                api.changeBackendPort(tempBackendPort)
                toast.success('Backend port saved. Restart the server for it to take effect.')
              }}
              style={{
                borderRadius: '0 0.25rem 0.25rem 0',
                boxShadow: 'none',
                border: '1px solid #4e5359',
                borderLeft: '0px'
              }}
            >
              Save
            </Button>
          </div>
        </div>

        <div className="flex w-full items-center justify-between bg-[#202022] px-4 py-2">
          <div className="switch_card">
            <p className="font-bold">Discord RPC</p>
            <p className="text-xs">Discord RPC is not available in the web version.</p>
          </div>
          <Switch
            checked={broadcastDiscordRpc}
            style={{ marginLeft: '1.5rem', cursor: 'pointer' }}
            disabled={true}
            onCheckedChange={() => {
              toast.info('Discord RPC is not available in the web version.')
            }}
          />
        </div>

        <div className="flex w-full items-center justify-between bg-[#202022] px-4 py-2">
          <div className="switch_card">
            <p className="font-bold">Smooth Scroll</p>
            <p className="text-xs">
              Enable or disable smooth scroll effect on the home page. <br /> Disabling this might
              reduce scroll lag.
            </p>
          </div>
          <Switch
            checked={smoothScroll}
            style={{ marginLeft: '1.5rem', cursor: 'pointer' }}
            onCheckedChange={() => {
              toggleSmoothScroll()
            }}
          />
        </div>
      </div>

      <div className="keyboard_shortcuts mt-8">
        <div className="mb-8 border-b border-gray-700 pb-2 font-semibold tracking-wider text-[#b5b5b5ff]">
          Keyboard Shortcuts
        </div>
        <div className="flex flex-col gap-4 tracking-wide text-[#b5b5b5ff]">
          <div className="flex w-full items-center justify-between bg-[#202022] px-4 py-2">
            <div className="switch_card">
              <p className="font-bold">Alt + Arrow Left/Right</p>
              <p className="text-xs">Navigate between pages using Alt + Arrow Left/Right</p>
            </div>
          </div>
          <div className="flex w-full items-center justify-between bg-[#202022] px-4 py-2">
            <div className="switch_card">
              <p className="font-bold">Ctrl + K</p>
              <p className="text-xs">Focus on the search bar using Ctrl + K</p>
            </div>
          </div>
          <div className="flex w-full items-center justify-between bg-[#202022] px-4 py-2">
            <div className="switch_card">
              <p className="font-bold">Arrow Left/Right</p>
              <p className="text-xs">Seek video by 5s using Arrow Left/Right</p>
            </div>
          </div>
        </div>
      </div>

      <p className="mt-8 text-xs opacity-45">
        This app or it&apos;s servers do not host or distribute any copyrighted files or media. It
        is an educational project built solely to learn about new technologies.
      </p>
    </div>
  )
}
