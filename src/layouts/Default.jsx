import Banner from './components/Banner'
import Header from './components/Header'
import Main from './components/Main'
import Navigation from './components/Navigation'

/**
 * Layout: Default
 * App shell composed of Banner, Header, Navigation, and Main.
 * Used by all authenticated routes. Renders child routes via <Outlet />.
 * @component
 * @returns {JSX.Element}
 */
const DefaultLayout = () => (
  <div className="l-default">
    <Banner />
    <Header />
    <Navigation />
    <Main />
  </div>
)

export default DefaultLayout
