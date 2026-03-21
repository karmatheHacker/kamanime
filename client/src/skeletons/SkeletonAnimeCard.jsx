import { Skeleton } from '@radix-ui/themes'

export default function SkeletonAnimeCard() {
  return (
    <div className="mt-6 flex w-full cursor-pointer flex-col items-center justify-center gap-y-2 px-1">
      <Skeleton as="div" className="aspect-[2/3] w-full" />
      <div className="flex w-full flex-col gap-y-1">
        <Skeleton as="div" className="mt-2 h-3 w-full" />
        <Skeleton as="div" className="h-3 w-1/2" />
      </div>
      <div className="mt-3 flex w-full flex-row justify-between">
        <Skeleton as="div" className="h-3 w-1/2" />
        <Skeleton as="div" className="h-3 w-1/4" />
      </div>
    </div>
  )
}
