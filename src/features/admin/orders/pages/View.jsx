import { useCallback, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import Badge from "@/components/Badge";
import DefinitionList from "@/components/DefinitionList";
import EmptyState from "@/components/EmptyState";
import Loader from "@/components/Loader";
import Table from "@/components/Table";
import { adminCompanyPath, adminOrderEditPath } from "@/constants/routes";
import { useConfirm } from "@/hooks/useConfirm";
import { useModal } from "@/hooks/useModal";
import { useToast } from "@/hooks/useToast";
import { get, patch } from "@/services/api";
import { formatCurrency } from "@/utils/currency";
import { formatDate } from "@/utils/dates";

import OrderPaymentBadge from "../components/OrderPaymentBadge";
import { ORDER_PAYMENT_STATES, ORDER_STATUS_VARIANTS } from "../utils";

/**
 * Component: AdminOrderView
 * Displays a single fulfilment order: company, type, status, items, price,
 * and payment state with a mark-as-paid action. Super admin only.
 * @component
 * @returns {JSX.Element}
 */
const AdminOrderView = () => {
  // Hooks
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { setHeader } = useModal();
  const { confirm } = useConfirm();
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  // Queries
  const {
    data: response,
    isPending,
    isError,
  } = useQuery({
    queryKey: ["admin", "orders", id],
    queryFn: ({ signal }) => get(`/api/admin/orders/${id}`, { signal }),
  });

  // Mutations
  const markOrder = useMutation({
    mutationFn: (mark) => patch(`/api/admin/orders/${id}`, { mark }),
    onSuccess: (_, mark) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
      // The company detail carries the order list shown in its modals.
      queryClient.invalidateQueries({ queryKey: ["admin", "companies"] });
      addToast(
        mark === "paid"
          ? t("features.admin.orders.markPaidSuccess")
          : t("features.admin.orders.markInvoicedSuccess"),
        "success",
      );
    },
    onError: (_, mark) => {
      addToast(
        mark === "paid"
          ? t("features.admin.orders.error.markPaid")
          : t("features.admin.orders.error.markInvoiced"),
        "error",
      );
    },
  });

  // The mutation result object is a fresh reference every render; only the
  // stable mutate function may be a hook dependency, otherwise the header
  // effect (setHeader → context update → re-render) loops forever.
  const { mutate: mark } = markOrder;

  // Handlers
  const handleEdit = useCallback(() => {
    const backgroundLocation = location.state?.backgroundLocation || location;
    navigate(adminOrderEditPath(id), { state: { backgroundLocation } });
  }, [id, navigate, location]);

  const handleMarkInvoiced = useCallback(() => {
    mark("invoiced");
  }, [mark]);

  const handleMarkPaid = useCallback(async () => {
    const confirmed = await confirm({
      title: t("features.admin.orders.markPaidConfirm.title"),
      message: t("features.admin.orders.markPaidConfirm.message"),
      confirmLabel: t("features.admin.orders.markPaid"),
    });
    if (!confirmed) return;
    mark("paid");
  }, [confirm, t, mark]);

  // Derived State
  const itemColumns = useMemo(
    () => [
      {
        key: "item",
        header: t("features.admin.orders.view.item"),
        render: (entry) => t(`constants.orderItems.${entry.item}`),
      },
      {
        key: "quantity",
        header: t("features.admin.orders.view.quantity"),
        align: "right",
      },
    ],
    [t],
  );

  // Effects
  useEffect(() => {
    const paymentState = response?.data?.order?.payment_state;

    const actions = [];
    // Payment is sequential — an order can't be paid before it was invoiced,
    // so only the next step is offered: invoice first, then pay.
    if (paymentState === ORDER_PAYMENT_STATES.TO_INVOICE) {
      actions.push({
        label: t("features.admin.orders.markInvoiced"),
        onClick: handleMarkInvoiced,
        skin: "primary",
        isProcessing: markOrder.isPending,
      });
    }
    if (paymentState === ORDER_PAYMENT_STATES.AWAITING_PAYMENT) {
      actions.push({
        label: t("features.admin.orders.markPaid"),
        onClick: handleMarkPaid,
        skin: "primary",
        isProcessing: markOrder.isPending,
      });
    }
    actions.push({
      label: t("features.admin.orders.view.edit"),
      onClick: handleEdit,
    });

    setHeader({
      title: t("features.admin.orders.view.heading"),
      description: t("features.admin.orders.view.description"),
      actions,
    });
    return () => setHeader();
  }, [
    setHeader,
    t,
    handleEdit,
    handleMarkInvoiced,
    handleMarkPaid,
    response,
    markOrder.isPending,
  ]);

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

  const { order } = response.data;

  const details = [
    {
      label: t("features.admin.orders.list.company"),
      value: (
        <Link
          state={{
            backgroundLocation: location.state?.backgroundLocation || location,
          }}
          to={adminCompanyPath(order.store_id)}
        >
          {order.store_name}
        </Link>
      ),
    },
    {
      label: t("features.admin.orders.list.type"),
      value: t(`constants.orderTypes.${order.type}`),
    },
    {
      label: t("features.admin.orders.list.status"),
      value: (
        <Badge variant={ORDER_STATUS_VARIANTS[order.status]}>
          {t(`constants.orderStatuses.${order.status}`)}
        </Badge>
      ),
    },
    {
      label: t("features.admin.orders.list.amount"),
      value: formatCurrency(order.amount),
    },
    {
      label: t("features.admin.orders.list.payment"),
      value: <OrderPaymentBadge order={order} />,
    },
    ...(order.invoiced_at
      ? [
          {
            label: t("features.admin.orders.view.invoicedAt"),
            value: formatDate(order.invoiced_at),
          },
        ]
      : []),
    ...(order.paid_at
      ? [
          {
            label: t("features.admin.orders.view.paidAt"),
            value: formatDate(order.paid_at),
          },
        ]
      : []),
    {
      label: t("features.admin.orders.list.requestedAt"),
      value: formatDate(order.requested_at),
    },
    ...(order.notes
      ? [
          {
            label: t("features.admin.orders.form.notes"),
            value: order.notes,
          },
        ]
      : []),
  ];

  return (
    <div className="c-admin-order-view">
      <DefinitionList className="c-admin-detail-list" items={details} />

      <Table
        className="c-admin-order-view__items"
        columns={itemColumns}
        data={order.items}
        getRowKey={(entry) => entry.id}
      />
    </div>
  );
};

export default AdminOrderView;
