# CLAUDE.md — Vallle Agent Coding Conventions

This file documents the coding conventions for the Vallle project. Agents should follow these rules when contributing to the codebase.

## Project overview

Vallle is a voucher platform for local businesses built with React + Vite on Cloudflare Pages. The API lives inside `functions/` as Pages Functions with a D1 (SQLite) database. See `documentation.md` for full project context, schema, and decision log.

## Stack

- **Frontend:** React 19, Vite 8, JavaScript (no TypeScript)
- **API:** Cloudflare Pages Functions (`functions/api/`)
- **Database:** Cloudflare D1 (SQLite at the edge)
- **Hosting:** Cloudflare Pages (frontend + API in one deployment)

## 1. Error Handling

We use standard JavaScript `Error` objects with specific properties for better observability and handling.

- **Throw Standard Errors**: Always `throw new Error("Message")`. Avoid custom error classes unless absolutely necessary.
- **Error Codes**: Attach a `.code` property to the error object.
  - Use constants from `@/constants/errors.js` (e.g., `ERROR_CODES.DB_READ_FAILED`, `ERROR_CODES.VOUCHER_EXPIRED`).
- **Cause**: Always attach the original error to the `.cause` property to preserve the stack trace chain.

**Example:**

```javascript
import { ERROR_CODES } from '@/constants/errors.js'

try {
  await env.DB.prepare('SELECT * FROM vouchers WHERE id = ?').bind(id).first()
} catch (error) {
  const err = new Error('Voucher: Failed to read voucher')
  err.code = ERROR_CODES.DB_READ_FAILED
  err.cause = error
  throw err
}
```

## 2. API Functions (Pages Functions)

File paths in `functions/` map directly to API routes. D1 is accessed via `context.env.DB`.

- **One handler per file**: Each file exports an `onRequest` array or individual method handlers (`onRequestGet`, `onRequestPost`, etc.).
- **Always return `Response` objects**: Use `new Response(JSON.stringify(data), { headers })` or the `Response.json()` helper.
- **Consistent JSON responses**: Success responses use `{ data }`. Error responses use `{ error: { message, code } }`.
- **Auth checks at the top**: Validate the session/token before any business logic.

**Example:**

```javascript
// functions/api/vouchers/index.js → GET /api/vouchers

export async function onRequestGet(context) {
  const { env } = context
  // Auth check first
  // ...

  try {
    const { results } = await env.DB.prepare(
      'SELECT * FROM vouchers WHERE store_id = ? ORDER BY created_at DESC'
    ).bind(storeId).all()

    return Response.json({ data: results })
  } catch (error) {
    const err = new Error('Vouchers: Failed to list vouchers')
    err.code = 'DB_READ_FAILED'
    err.cause = error
    throw err
  }
}
```

## 3. Database Conventions (D1)

- **IDs**: ULIDs (sortable, time-based). Generate with a ULID library.
- **Money**: Always stored as integers in cents (e.g., `5000` = €50.00). Convert only at the presentation layer.
- **Dates**: ISO 8601 text strings (`2026-03-17T12:00:00Z`). SQLite has no native datetime type.
- **Parameterised queries**: Always use `.bind()` — never interpolate values into SQL strings.
- **Voucher expiry**: Checked in app logic when a voucher is looked up (`expires_at < now`), not via cron.

## 4. Internationalization (i18n)

All user-facing strings must be internationalized.

- **Structure**: Organize keys hierarchically by: `features` -> `component/feature` -> `state` -> `key`.
  - Example: `features.redeemVoucher.errorState.voucherExpired`
- **Usage**: Use the `useTranslation` hook from `react-i18next`.

**Example:**

```json
// translation.json
{
  "features": {
    "login": {
      "form": {
        "error": {
          "invalidEmail": "Please enter a valid email."
        }
      }
    }
  }
}
```

```javascript
const { t } = useTranslation()
// ...
<p>{t('features.login.form.error.invalidEmail')}</p>
```

## 5. React Component Standards

### 5.1 File Structure & Imports

Imports must be organized and separated by clean spacing in the following order:

1. **React imports**: `useState`, `useEffect`, etc.
2. **Third-party libraries**: `react-i18next`, `lucide-react`, `react-router-dom`, etc.
3. **Internal alias imports**: `@/shared/`, `@/hooks/`, `@/contexts/`.
4. **Relative imports**: `./utils`, `./components`.

### 5.2 Documentation (JSDoc)

Every exported component or hook **must** have a JSDoc block.

- **Components**: Use `@component`. Describe the component's purpose. Document props using `@param`. Return `@returns {JSX.Element}`.
- **Hooks**: Describe the logic. Document params and `@returns` (listing the returned object properties).

### 5.3 Component Internal Organization

Organize the code inside the component or hook using comment headers in this exact order:

1. `// Hooks` (Router, Contexts, i18n, etc.)
2. `// State` (useState, useReducer)
3. `// Refs`
4. `// Derived State` (Variables calculated from props/state, useMemo)
5. `// Handlers` (Functions interacting with UI/Events. **Must use `useCallback`**)
6. `// Effects` (useEffect)
7. `// Render` (The return statement)

### 5.4 Performance & Logic Patterns

- **Handlers**: Wrap all event handlers and stable functions in `useCallback` to prevent unnecessary re-renders.
- **Derived State**: Use `useMemo` for expensive calculations or when deriving arrays/objects that serve as dependencies for effects.
- **Filtering**: Move filtering logic into the `// Derived State` section using `useMemo`.
- **CSS Classes**: Maintain strict BEM naming convention (e.g., `c-block__element--modifier`).
- **Clean JSX**: Keep the `// Render` section clean. Complex conditional renders should be extracted to helper functions or variables.

**Example:**

```javascript
import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { User as IconUser } from 'lucide-react'
import { useAuth } from '@/shared/auth'

/**
 * Component: VoucherCard
 * Displays a single voucher with its current balance and status.
 * @component
 * @param {Object} props
 * @param {Object} props.voucher - The voucher object
 * @returns {JSX.Element}
 */
const VoucherCard = ({ voucher }) => {
  // Hooks
  const { t } = useTranslation()
  const { user } = useAuth()

  // State
  const [isExpanded, setIsExpanded] = useState(false)

  // Derived State
  const displayBalance = (voucher.balance / 100).toFixed(2)
  const isExpired = new Date(voucher.expires_at) < new Date()

  // Handlers
  const handleToggle = useCallback(() => {
    setIsExpanded((prev) => !prev)
  }, [])

  // Render
  return (
    <div className="c-voucher-card">
      <h3 className="c-voucher-card__code">{voucher.code}</h3>
      <p className="c-voucher-card__balance">€{displayBalance}</p>
      <button className="c-voucher-card__toggle" onClick={handleToggle}>
        {isExpanded ? t('common.collapse') : t('common.expand')}
      </button>
    </div>
  )
}

export default VoucherCard
```

## 6. Frontend Structure

Feature-based folder structure — each feature owns its components, hooks, and logic.

```
src/
├── features/
│   ├── auth/
│   ├── dashboard/
│   ├── vouchers/
│   │   ├── pages/           ← route-level components
│   │   │   ├── Index.jsx    ← list + Outlet for modals
│   │   │   ├── Create.jsx   ← modal
│   │   │   ├── View.jsx     ← modal
│   │   │   └── Edit.jsx     ← modal
│   │   └── utils.js         ← feature-specific utils
│   └── commissions/
├── components/
│   ├── Modal.jsx            ← URL-driven modal (native <dialog>)
│   └── forms/
│       ├── Form.jsx         ← form wrapper (react-hook-form)
│       └── Input.jsx        ← reusable input field
├── layouts/
│   ├── default.jsx   ← authenticated routes (sidebar + nav)
│   └── blank.jsx     ← unauthenticated routes (login, etc.)
├── contexts/
│   └── auth.jsx          ← AuthContext + AuthProvider
├── hooks/
│   └── useAuth.js        ← useAuth hook
├── constants/
│   ├── errors.js         ← ERROR_CODES constants
│   ├── routes.js         ← ROUTES path constants
│   └── user-roles.js     ← USER_ROLES constants
├── utils/
│   ├── currency.js       ← formatCurrency
│   └── dates.js          ← formatDate
├── services/
│   └── api.js            ← fetch wrapper (get, post, put, patch)
├── router/
│   ├── AuthGuard.jsx
│   └── RoleGuard.jsx
├── i18n/
│   ├── index.js
│   ├── en.json
│   └── pt.json
├── App.jsx
├── main.jsx
└── index.css
```

- Shared UI components live in `src/components/`, grouped by domain (e.g. `forms/`). Use these for reusable building blocks that aren't tied to a single feature. All forms use `react-hook-form` — build on the `Form` and `Input` components in `components/forms/`.
- New features get their own folder under `src/features/`.
- Page layouts live in `src/layouts/`. Use `default.jsx` for authenticated routes and `blank.jsx` for unauthenticated ones. Add a new layout file if a genuinely different shell is needed.
- React contexts live in `src/contexts/`. Each context file exports the context object and its Provider component.
- Custom hooks live in `src/hooks/`. Each hook is a single named export (e.g. `useAuth`).
- App-wide constants live in `src/constants/` — error codes (`errors.js`), route paths (`routes.js`), and user roles (`user-roles.js`). Never hardcode route strings or role strings inline; always import from these files.
- Utility functions live in `src/utils/`, split by domain (e.g. `currency.js`, `dates.js`). Add a new file per domain — do not put unrelated utilities in the same file. Only truly app-wide utilities belong here.
- Feature-specific utilities live in the feature folder as `utils.js` (e.g. `src/features/vouchers/utils.js`). If a utility is only relevant to one feature, keep it co-located with that feature rather than in `src/utils/`.
- API and external service abstractions live in `src/services/`. Each file wraps a distinct external concern (e.g. `api.js` for the Vallle API). Add a new file per service — do not mix concerns.
- Route guards live in `src/router/`.

## 7. Route Protection

Routes use two layers of protection:

1. **`AuthGuard`** — checks authentication. Wraps `DefaultLayout` so all authenticated routes are covered. Redirects to `/login` if the user has no valid session.
2. **`RoleGuard`** — checks authorisation. Wraps individual routes that require a specific role. Redirects to `/` if the user's role is not in `allowedRoles`.

User roles on the `users` table are `admin` (store owners/staff) and `super_admin` (you — platform owner). Use `RoleGuard` for any route that should be restricted by role.

**Example:**

```jsx
<Route
  element={
    <RoleGuard allowedRoles={['super_admin']}>
      <Commissions />
    </RoleGuard>
  }
  path="commissions"
/>
```

The sidebar navigation already hides links for routes the user can't access (`isSuperAdmin` check in `default.jsx`), but `RoleGuard` enforces it server-side so that direct URL access is also blocked.

## 8. Modal Routes

CRUD views (create, view, edit) open as URL-driven modals using the native `<dialog>` element. Modals can be opened from **any page** — the current page stays visible behind the modal.

- **Pattern**: Uses react-router's `backgroundLocation` state. When navigating to a modal route, pass `state: { backgroundLocation: location }`. In `App.jsx`, routes render against the background location (keeping the current page mounted), while modal routes render on top at the actual URL.
- **Routing**: Modal route paths are full paths (e.g. `/vouchers/create`, `/vouchers/:id`). Use helper functions from `constants/routes.js` (e.g. `voucherCreatePath()`, `voucherPath(id)`, `voucherEditPath(id)`) for navigation — always pass `backgroundLocation` in state.
- **Closing**: Pressing Escape, clicking the backdrop, or the close button all call `navigate(-1)` to return to whatever page was behind the modal.
- **Direct access**: If someone lands on a modal URL directly (no background location), the modal routes don't render and the URL matches the page routes normally — so you should have a fallback page route for each modal URL.

**Example:**

```jsx
// In App.jsx — AppRoutes component
const backgroundLocation = location.state?.backgroundLocation

<Routes location={backgroundLocation || location}>
  {/* Page routes render against the background location */}
  <Route element={<VouchersIndex />} path={ROUTES.VOUCHERS} />
</Routes>

{backgroundLocation && (
  <Routes>
    {/* Modal routes render on top at the actual URL */}
    <Route element={<VoucherCreate />} path={ROUTES.VOUCHERS_MODAL_CREATE} />
  </Routes>
)}

// When linking to a modal — pass backgroundLocation
<Link
  to={voucherCreatePath()}
  state={{ backgroundLocation: location }}
>
  Create voucher
</Link>

// In VoucherCreate — wraps content in Modal
<Modal title={t('features.vouchers.create.heading')}>
  {/* form content */}
</Modal>
```

## 9. Design Tokens

Use the Vallle brand palette in all UI work:

- **Primary (Terracotta):** `#C4653A`
- **Linen:** `#F5E6D8`
- **Espresso:** `#2C2520`
- **Sage:** `#7A9B76`
- **Parchment:** `#E8DDD3`
- **Honey:** `#D4A574`
- **Display font:** DM Serif Display
- **Body font:** DM Sans Light
- **Tone:** Warm, personal, local — not corporate.

## 10. Living Documentation

`documentation.md` is the single source of truth for the project — what Vallle is, how it works, the schema, infrastructure decisions, and setup steps. It must be kept up to date as the project evolves.

- **When to update**: After any meaningful change — new features, schema migrations, infrastructure changes, tooling additions, new decision log entries, etc.
- **What to update**: The relevant section(s) in `documentation.md`. Add a new row to the decision log when a non-trivial choice is made.
- **Agents must update it proactively**: If you make a change to the codebase that affects project documentation (e.g., adding a dependency, changing the folder structure, adding a new API route), update `documentation.md` in the same session.

## 11. General Rules

- **JavaScript, not TypeScript** — keep it simple.
- **ES Modules** — `import`/`export`, no CommonJS.
- **Single quotes** for strings.
- **No semicolons** (unless required for disambiguation).
- **Functional components only** — no class components.
- **Default exports** for components, named exports for utilities.
- **Keep files small** — if a component exceeds ~150 lines, consider splitting.
- **No console.log in production code** — use structured error handling instead.
