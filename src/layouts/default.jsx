import Header from './components/Header'
import Main from './components/Main'
import Navigation from './components/Navigation'

/**
 * Layout: Default
 * App shell composed of Header, Navigation, and Main.
 * Used by all authenticated routes. Renders child routes via <Outlet />.
 * @component
 * @returns {JSX.Element}
 */
const DefaultLayout = () => (
  <>
    <Header />
    <Navigation />
    <Main />
  </>
)

export default DefaultLayout
