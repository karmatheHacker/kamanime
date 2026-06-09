import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import '@radix-ui/themes/styles.css'
import { ConvexProvider, ConvexReactClient } from 'convex/react'
import ZenshinProvider from './utils/ContextProvider.jsx'

/* ------------------------ fonts ----------------------- */
import '@fontsource/inter/100.css'
import '@fontsource/inter/200.css'
import '@fontsource/inter/300.css'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import '@fontsource/inter/800.css'
import '@fontsource/inter/900.css'
import '@fontsource/space-mono/400.css'
import '@fontsource/space-mono/700.css'
/* ------------------------------------------------------ */

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL)

ReactDOM.createRoot(document.getElementById('root')).render(
  <ConvexProvider client={convex}>
    <ZenshinProvider>
      <App />
    </ZenshinProvider>
  </ConvexProvider>
)
