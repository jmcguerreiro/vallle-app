import { useCallback, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import { useQuery } from "@tanstack/react-query";

import Badge from "@/components/Badge";
import Button from "@/components/Button";
import EmptyState from "@/components/EmptyState";
import Loader from "@/components/Loader";
import Table from "@/components/Table";
import { ROUTES, adminOrderPath } from "@/constants/routes";
import { useModal } from "@/hooks/useModal";
import { get } from "@/services/api";
import { formatCurrency } from "@/utils/currency";
import { formatDate } from "@/utils/dates";
import { IconPlus } from "@/utils/icons";

import OrderPaymentBadge from "../components/OrderPaymentBadge";
import { ORDER_STATUS_VARIANTS } from "../utils";

/**
 * Component: AdminOrdersManage
 * A company's full fulfilment order log: every order (whatever its status),
 * rows opening the order detail, and an add button that records a new order
 * for the company. Super admin only.
 * @component
 * @returns {JSX.Element}
 */
const AdminOrdersManage = () => {
  // Hooks
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { setHeader } = useModal();

  // Queries
  const {
    data: response,
    isPending,
    isError,
  } = useQuery({
    queryKey: ["admin", "companies", id],
    queryFn: ({ signal }) => get(`/api/admin/companies/${id}`, { signal }),
  });

  // Handlers
  const handleOrderClick = useCallback(
    (order) => {
      const backgroundLocation = location.state?.backgroundLocation || location;
      navigate(adminOrderPath(order.id), { state: { backgroundLocation } });
    },
    [navigate, location],
  );

  const handleAdd = useCallback(() => {
    const backgroundLocation = location.state?.backgroundLocation || location;
    // The create form pre-selects the company from the `store` param.
    navigate(
      { pathname: ROUTES.ADMIN_ORDERS_MODAL_CREATE, search: `?store=${id}` },
      { state: { backgroundLocation } },
    );
  }, [id, navigate, location]);

  // Derived State
  const orderColumns = useMemo(
    () => [
      {
        key: "requested_at",
        header: t("features.admin.orders.list.requestedAt"),
        render: (order) => formatDate(order.requested_at),
      },
      {
        key: "type",
        header: t("features.admin.orders.list.type"),
        render: (order) => t(`constants.orderTypes.${order.type}`),
        hideOnMobile: true,
      },
      {
        key: "amount",
        header: t("features.admin.orders.list.amount"),
        align: "right",
        render: (order) => formatCurrency(order.amount),
      },
      {
        key: "payment",
        header: t("features.admin.orders.list.payment"),
        render: (order) => <OrderPaymentBadge order={order} />,
        hideOnMobile: true,
      },
      {
        key: "status",
        header: t("features.admin.orders.list.status"),
        render: (order) => (
          <Badge variant={ORDER_STATUS_VARIANTS[order.status]}>
            {t(`constants.orderStatuses.${order.status}`)}
          </Badge>
        ),
      },
    ],
    [t],
  );

  // Effects
  useEffect(() => {
    setHeader({
      title: t("features.admin.orders.manage.heading"),
      description: response?.data?.store.name ?? "",
    });
    return () => setHeader();
  }, [setHeader, t, response]);

  // Render
  if (isPending) {
    return (
      <div className="c-page-state">
        <Loader />
      </div>
    );
  }

  if (isError || !response?.data) {
    return (
      <div className="c-page-state">
        <EmptyState
          description={t("common.error")}
          hideImageOnMobile
          image="companies--error"
        />
      </div>
    );
  }

  const { orders } = response.data;

  return (
    <div className="c-admin-subscriptions-detail">
      {orders.length === 0 ? (
        <p className="c-admin-subscriptions-detail__empty">
          {t("features.admin.orders.manage.empty")}
        </p>
      ) : (
        <Table
          className="c-admin-subscriptions-detail__table"
          columns={orderColumns}
          data={orders}
          getRowKey={(order) => order.id}
          onRowClick={handleOrderClick}
        />
      )}
      <div className="c-admin-subscriptions-detail__actions c-admin-subscriptions-detail__actions--block">
        <Button display="block" icon={IconPlus} onClick={handleAdd}>
          {t("features.admin.orders.manage.addNew")}
        </Button>
      </div>
    </div>
  );
};

export default AdminOrdersManage;
