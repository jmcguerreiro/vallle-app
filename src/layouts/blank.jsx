import { Outlet } from 'react-router-dom'

/**
 * Layout: Blank
 * Minimal wrapper with no chrome — used for unauthenticated routes
 * such as login. Renders child routes via <Outlet />.
 * @component
 * @returns {JSX.Element}
 */
const BlankLayout = () => {
  // Render
  return <Outlet />
}

export default BlankLayout
