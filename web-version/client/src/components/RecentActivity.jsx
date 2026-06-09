import { useScroll, motion, useTransform } from 'framer-motion'
import RecentActivityCard from './RecentActivityCard'

export default function RecentActivity({ data }) {
  const { scrollY } = useScroll()

  const yTop = useTransform(scrollY, [0, 1000], [0, -360])
  const yBottom = useTransform(scrollY, [0, 800], [0, 360])

  return (
    <div className="tripp down relative flex h-[18rem] w-[18rem] min-w-[18rem] scale-100 overflow-hidden sm:h-[24rem] sm:w-[24rem] sm:min-w-[24rem] md:h-[30rem] md:w-[30rem] md:min-w-[30rem]">
      {/* Only render gradients if scrollY is less than 900 */}
      <motion.div className="absolute -top-[16rem] left-0 w-full" style={{ y: yTop }}>
        <div className="flex flex-col">
          {data.slice(0, 3).map((item, index) => (
            <RecentActivityCard key={index} data={item} />
          ))}
        </div>
      </motion.div>
      <motion.div className="absolute -top-[25rem] left-1/2 w-full" style={{ y: yBottom }}>
        <div className="flex flex-col">
          {data.slice(3, 6).map((item, index) => (
            <RecentActivityCard key={index + 3} data={item} />
          ))}
        </div>
      </motion.div>
    </div>
  )
}
