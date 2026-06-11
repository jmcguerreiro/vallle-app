import { useCallback, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import { useQuery } from "@tanstack/react-query";

import Accordion from "@/components/Accordion";
import Badge from "@/components/Badge";
import DefinitionList from "@/components/DefinitionList";
import EmptyState from "@/components/EmptyState";
import Loader from "@/components/Loader";
import { vallleEditPath, vallleRedeemPath } from "@/constants/routes";
import { isVallleExpired } from "@/features/vallles/utils";
import { useModal } from "@/hooks/useModal";
import { get } from "@/services/api";
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

  // Derived State
  const title = t("features.vallles.view.heading");
  const description = t("features.vallles.view.description");

  const statusKey = useMemo(() => {
    if (!vallle) return "active";
    if (vallle.status === "archived") return "archived";
    if (isVallleExpired(vallle.expires_at)) return "expired";
    if (vallle.balance === 0) return "used";
    return "active";
  }, [vallle]);

  const statusLabel = useMemo(() => {
    if (!vallle) return "";
    if (vallle.status === "archived")
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
    if (vallle.status !== "active") return false;
    if (vallle.balance === 0) return false;
    return !isVallleExpired(vallle.expires_at);
  }, [vallle]);

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

  // Effects
  useEffect(() => {
    const actions = [
      {
        label: t("features.vallles.view.edit"),
        onClick: handleEdit,
      },
    ];

    if (canRedeem) {
      actions.push({
        label: t("features.vallles.redeem.submit"),
        onClick: handleRedeem,
        skin: "primary",
      });
    }

    setHeader({ title, description, actions });

    return () => setHeader();
  }, [title, description, setHeader, handleEdit, handleRedeem, canRedeem, t]);

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
      label: t("features.vallles.view.createdAt"),
      value: formatDate(vallle.created_at),
    },
  ];

  return (
    <div className="p-vallle-view">
      <div className="p-vallle-view__hero">
        <Badge variant={STATUS_VARIANTS[statusKey]}>{statusLabel}</Badge>
        <h2
          className={`p-vallle-view__code${statusKey === "active" ? "" : " p-vallle-view__code--inactive"}`}
        >
          {vallle.code}
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
