import Extra from "./header/Extra";
import Logo from "./header/Logo";
import Store from "./header/Store";

/**
 * Layout: Header
 * Top bar displaying the app logo, navigation menu, store switcher, help link, and user menu.
 * @component
 * @returns {JSX.Element}
 */
const Header = () => {
  // Render
  return (
    <header className="s-header">
      <div className="s-header__wrapper">
        <Store />

        <Logo />

        <Extra />
      </div>
    </header>
  );
};

export default Header;
