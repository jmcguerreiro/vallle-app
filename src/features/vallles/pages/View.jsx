import { useCallback, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import Accordion from "@/components/Accordion";
import Badge from "@/components/Badge";
import DefinitionList from "@/components/DefinitionList";
import EmptyState from "@/components/EmptyState";
import Loader from "@/components/Loader";
import { vallleEditPath, vallleRedeemPath } from "@/constants/routes";
import { VALLLE_STATUSES } from "@/constants/vallle-statuses";
import {
  formatMinRedemption,
  formatVallleCode,
  isVallleExpired,
} from "@/features/vallles/utils";
import { useConfirm } from "@/hooks/useConfirm";
import { useModal } from "@/hooks/useModal";
import { useToast } from "@/hooks/useToast";
import { get, put } from "@/services/api";
import { formatCurrency } from "@/utils/currency";
import { formatDate } from "@/utils/dates";

const STATUS_VARIANTS = {
  active: "success",
  expired: "danger",
};

/**
 * Component: VallleView
 * Displays a single vallle's details and its redemption history.
 * @component
 * @returns {JSX.Element}
 */
const VallleView = () => {
  // Hooks
  const { t } = useTranslation();
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { setHeader } = useModal();
  const { confirm } = useConfirm();
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  // Queries
  const { data, isPending, isError } = useQuery({
    queryKey: ["vallles", id, "view"],
    queryFn: async ({ signal }) => {
      const [vallleRes, redemptionsRes] = await Promise.all([
        get(`/api/vallles/${id}`, { signal }),
        get(`/api/vallles/${id}/redemptions`, { signal }),
      ]);
      return { vallle: vallleRes.data, redemptions: redemptionsRes.data };
    },
  });

  const vallle = data?.vallle;
  const redemptions = data?.redemptions ?? [];

  // Mutations
  const toggleArchive = useMutation({
    mutationFn: (nextStatus) =>
      put(`/api/vallles/${id}`, { status: nextStatus }),
    onSuccess: (_data, nextStatus) => {
      queryClient.invalidateQueries({ queryKey: ["vallles"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      addToast(
        t(
          `features.vallles.view.${nextStatus === VALLLE_STATUSES.ARCHIVED ? "archiveSuccess" : "restoreSuccess"}`,
        ),
        "success",
      );
    },
    onError: (error) => {
      addToast(
        error.message || t("features.vallles.view.error.generic"),
        "error",
      );
    },
  });

  // The mutation result object is a fresh reference every render; only the
  // stable mutate function may be a hook dependency, otherwise the header
  // effect (setHeader → context update → re-render) loops forever.
  const { mutate: toggleArchiveStatus } = toggleArchive;

  // Derived State
  const title = t("features.vallles.view.heading");
  const description = t("features.vallles.view.description");

  const statusKey = useMemo(() => {
    if (!vallle) return VALLLE_STATUSES.ACTIVE;
    if (vallle.status === VALLLE_STATUSES.ARCHIVED)
      return VALLLE_STATUSES.ARCHIVED;
    if (isVallleExpired(vallle.expires_at)) return VALLLE_STATUSES.EXPIRED;
    if (vallle.balance === 0) return VALLLE_STATUSES.USED;
    return VALLLE_STATUSES.ACTIVE;
  }, [vallle]);

  const statusLabel = useMemo(() => {
    if (!vallle) return "";
    if (vallle.status === VALLLE_STATUSES.ARCHIVED)
      return t("features.vallles.list.archived");
    if (isVallleExpired(vallle.expires_at))
      return t("features.vallles.list.expired");
    if (vallle.balance === 0) return t("features.vallles.list.used");
    return t("features.vallles.list.active");
  }, [vallle, t]);

  const heroSubtitle = useMemo(() => {
    if (!vallle) return "";
    return t("features.vallles.view.balanceSummary", {
      total: formatCurrency(vallle.amount),
      balance: formatCurrency(vallle.balance),
    });
  }, [vallle, t]);

  const canRedeem = useMemo(() => {
    if (!vallle) return false;
    if (vallle.status !== VALLLE_STATUSES.ACTIVE) return false;
    if (vallle.balance === 0) return false;
    return !isVallleExpired(vallle.expires_at);
  }, [vallle]);

  const isArchived = vallle?.status === VALLLE_STATUSES.ARCHIVED;
  const canToggleArchive =
    vallle?.status === VALLLE_STATUSES.ACTIVE ||
    vallle?.status === VALLLE_STATUSES.ARCHIVED;

  // Editable while there's still a balance to act on and it isn't archived —
  // covers active vallles and expired ones (where editing extends the expiry
  // to revive them). Used (zero balance) and archived vallles aren't editable.
  const canEdit = !isArchived && vallle?.balance > 0;

  // Handlers
  const handleEdit = useCallback(() => {
    navigate(vallleEditPath(id), {
      state: {
        backgroundLocation: location.state?.backgroundLocation || location,
      },
    });
  }, [navigate, id, location]);

  const handleRedeem = useCallback(() => {
    navigate(vallleRedeemPath(id), {
      state: {
        backgroundLocation: location.state?.backgroundLocation || location,
      },
    });
  }, [navigate, id, location]);

  const handleToggleArchive = useCallback(async () => {
    const nextStatus = isArchived
      ? VALLLE_STATUSES.ACTIVE
      : VALLLE_STATUSES.ARCHIVED;
    const actionKey = isArchived ? "restore" : "archive";
    const confirmed = await confirm({
      title: t(`features.vallles.view.${actionKey}ConfirmTitle`),
      message: t(`features.vallles.view.${actionKey}ConfirmMessage`),
      confirmLabel: t(`features.vallles.view.${actionKey}`),
    });
    if (!confirmed) return;
    toggleArchiveStatus(nextStatus);
  }, [isArchived, t, confirm, toggleArchiveStatus]);

  // Effects
  useEffect(() => {
    const actions = [];

    if (canEdit) {
      actions.push({
        label: t("features.vallles.view.edit"),
        onClick: handleEdit,
      });
    }

    if (canRedeem) {
      actions.push({
        label: t("features.vallles.redeem.submit"),
        onClick: handleRedeem,
        skin: "primary",
      });
    }

    if (canToggleArchive) {
      actions.push({
        label: t(`features.vallles.view.${isArchived ? "restore" : "archive"}`),
        onClick: handleToggleArchive,
        skin: "ghost",
      });
    }

    setHeader({ title, description, actions });

    return () => setHeader();
  }, [
    title,
    description,
    setHeader,
    handleEdit,
    handleRedeem,
    canEdit,
    canRedeem,
    canToggleArchive,
    isArchived,
    handleToggleArchive,
    t,
  ]);

  // Render
  if (isPending) {
    return (
      <div className="p-vallle-view">
        <div className="p-vallle-view__loading">
          <Loader />
        </div>
      </div>
    );
  }

  if (isError || !vallle) {
    return (
      <div className="p-vallle-view">
        <div className="p-vallle-view__error">
          <EmptyState
            description={t("common.error")}
            hideImageOnMobile
            image="vallles--error"
          />
        </div>
      </div>
    );
  }

  const fields = [
    { label: t("features.vallles.view.buyer"), value: vallle.buyer || "—" },
    {
      label: t("features.vallles.view.expiresAt"),
      value: formatDate(vallle.expires_at),
    },
    {
      label: t("features.vallles.view.minRedemption"),
      value: formatMinRedemption(
        vallle.min_redemption_mode,
        vallle.min_redemption_cents,
        t,
      ),
    },
    {
      label: t("features.vallles.view.createdAt"),
      value: formatDate(vallle.created_at),
    },
  ];

  return (
    <div className="p-vallle-view">
      <div className="p-vallle-view__hero">
        <Badge variant={STATUS_VARIANTS[statusKey]}>{statusLabel}</Badge>
        <h2
          className={`p-vallle-view__code${statusKey === VALLLE_STATUSES.ACTIVE ? "" : " p-vallle-view__code--inactive"}`}
        >
          {formatVallleCode(vallle.code)}
        </h2>
        <p className="p-vallle-view__subtitle">{heroSubtitle}</p>
      </div>

      <div className="p-vallle-view__details">
        <DefinitionList items={fields} />
      </div>

      <div className="p-vallle-view__redemptions">
        <Accordion title={t("features.vallles.redemptions.heading")}>
          {redemptions.length === 0 ? (
            <p className="p-vallle-view__redemptions-empty">
              {t("features.vallles.redemptions.empty")}
            </p>
          ) : (
            <ul className="p-vallle-view__redemptions-list">
              {redemptions.map((r) => (
                <li key={r.id} className="p-vallle-view__redemptions-list-item">
                  <div className="p-vallle-view__redemptions-list-item-description-amount">
                    <span className="p-vallle-view__redemptions-list-item-description">
                      {r.description || "—"}
                    </span>
                    <span className="p-vallle-view__redemptions-list-item-amount">
                      {formatCurrency(r.amount)}
                    </span>
                  </div>
                  <p className="p-vallle-view__redemptions-list-item-meta">
                    {formatDate(r.created_at)}
                    {r.redeemed_by_name ? ` · ${r.redeemed_by_name}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Accordion>
      </div>
    </div>
  );
};

export default VallleView;
