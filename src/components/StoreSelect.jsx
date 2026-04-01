import { useCallback } from 'react'

import { ChevronRight } from 'lucide-react'

/**
 * Component: StoreSelect
 * Renders a selectable list of stores. Each item shows the store name,
 * optional meta text, and a right-pointing arrow.
 * @component
 * @param {Object} props
 * @param {Array} props.stores - Array of store objects
 * @param {Function} props.onSelect - Called with the selected store object
 * @param {Function} [props.renderMeta] - Optional render function for meta text, receives a store object
 * @returns {JSX.Element}
 */
const StoreSelect = ({ stores, onSelect, renderMeta }) => {
  // Handlers
  const handleSelect = useCallback(
    (store) => {
      onSelect(store)
    },
    [onSelect],
  )

  // Render
  return (
    <div className="c-store-select">
      <ul className="c-store-select__list">
        {stores?.map((store) => (
          <li key={store.store_id}>
            <button
              className="c-store-select__option"
              onClick={() => handleSelect(store)}
              type="button"
            >
              <div className="c-store-select__option-content">
                <span className="c-store-select__option-name">
                  {store.store_name}
                </span>
                {renderMeta && (
                  <span className="c-store-select__option-meta">
                    {renderMeta(store)}
                  </span>
                )}
              </div>
              <ChevronRight className="c-store-select__option-arrow" size={18} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default StoreSelect
