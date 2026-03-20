import { useEffect } from "react";
import { useTranslation } from "react-i18next";

import { useMain } from "@/hooks/useMain";
import { useModal } from "@/hooks/useModal";

/**
 * Component: VoucherCreate
 * Content for creating a new voucher.
 * Sets the header title on the modal or main layout depending on context.
 * @component
 * @returns {JSX.Element}
 */
const VoucherCreate = () => {
  // Hooks
  const { t } = useTranslation();
  const { setHeader: setMainHeader } = useMain();
  const { setHeader: setModalHeader, isModal } = useModal();

  // Derived State
  const title = t("features.vouchers.create.heading");
  const setHeader = isModal ? setModalHeader : setMainHeader;

  // Effects
  useEffect(() => {
    setHeader({ title });
    return () => setHeader();
  }, [title, setHeader]);

  // Render
  return <p>{t("features.vouchers.create.comingSoon")}</p>;
};

export default VoucherCreate;
