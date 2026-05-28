import { Outlet } from "react-router-dom";

import Button from "@/components/Button";
import { useMain } from "@/hooks/useMain";

/**
 * Layout: Main
 * Main content area with page-level header and route outlet.
 * @component
 * @returns {JSX.Element}
 */
const Main = () => {
  // Hooks
  const { header } = useMain();

  // Render
  return (
    <main className="s-main">
      <div className="s-main__wrapper">
        {(header.title || header.image || header.actions?.length > 0) && (
          <div className="s-main__header">
            {(header.title || header.description) && (
              <div className="s-main__header-title-description">
                {header.title && (
                  <h1 className="s-main__header-title">{header.title}</h1>
                )}
                {header.description && (
                  <p className="s-main__header-description">
                    {header.description}
                  </p>
                )}
              </div>
            )}
            {header.actions?.length > 0 && (
              <div className="s-main__header-actions">
                {header.actions.map((action, index) => (
                  <Button
                    key={action.label || index}
                    icon={action.icon}
                    onClick={action.onClick}
                    state={action.state}
                    to={action.to}
                    variant={action.variant || "icon"}
                  >
                    {action.label}
                  </Button>
                ))}
              </div>
            )}
          </div>
        )}
        <div className="s-main__body">
          <Outlet />
        </div>
      </div>
    </main>
  );
};

export default Main;
