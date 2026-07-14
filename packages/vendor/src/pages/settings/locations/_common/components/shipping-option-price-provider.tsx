import { ShippingOptionPriceContext } from "./shipping-option-price-context"
import { PropsWithChildren, useMemo } from "react"
import { ConditionalPriceInfo } from "../../types"

export { useShippingOptionPrice } from "./use-shipping-option-price"

type ShippingOptionPriceProviderProps = PropsWithChildren<{
  onOpenConditionalPricesModal: (info: ConditionalPriceInfo) => void
  onCloseConditionalPricesModal: () => void
}>

export const ShippingOptionPriceProvider = ({
  children,
  onOpenConditionalPricesModal,
  onCloseConditionalPricesModal,
}: ShippingOptionPriceProviderProps) => {
  const value = useMemo(
    () => ({ onOpenConditionalPricesModal, onCloseConditionalPricesModal }),
    [onOpenConditionalPricesModal, onCloseConditionalPricesModal],
  )

  return (
    <ShippingOptionPriceContext.Provider value={value}>
      {children}
    </ShippingOptionPriceContext.Provider>
  )
}
