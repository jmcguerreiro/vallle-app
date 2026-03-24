import { useMemo } from 'react'
import { useLocation } from 'react-router-dom'

import { ROUTES } from '@/constants/routes'

/**
 * Component: Background
 * Renders a decorative background SVG based on the current auth route.
 * Returns null for routes without a mapped background.
 * @component
 * @returns {JSX.Element|null}
 */
const Background = () => {
  // Hooks
  const { pathname } = useLocation()

  // Derived State
  const backgroundSrc = useMemo(() => {
    const backgrounds = {
      [ROUTES.LOGIN]: '/images/backgrounds/login.svg',
      [ROUTES.FORGOT_PASSWORD]: '/images/backgrounds/forgot-password.svg',
      [ROUTES.RESET_PASSWORD]: '/images/backgrounds/reset-password.svg',
    }

    return backgrounds[pathname] || null
  }, [pathname])

  // Render
  if (!backgroundSrc) return null

  return (
    <div aria-hidden="true" className="s-background">
      <img alt="" className="s-background__image" src={backgroundSrc} />
    </div>
  )
}

export default Background
