import { Drawer, clx } from "@medusajs/ui"
import {
  ComponentPropsWithoutRef,
  ComponentRef,
  ComponentType,
  PropsWithChildren,
  forwardRef,
  useEffect,
  useState,
} from "react"
import { Path, useNavigate } from "react-router-dom"
import {
  DialogDescriptionPresenceProvider,
  useDialogDescriptionPresence,
  useRegisterDialogDescription,
} from "../dialog-description-presence"
import { useStateAwareTo } from "../hooks/use-state-aware-to"
import { RouteModalForm } from "../route-modal-form"
import { RouteModalProvider } from "../route-modal-provider/route-provider"
import { StackedModalProvider } from "../stacked-modal-provider"

type RouteDrawerProps = PropsWithChildren<{
  prev?: string | Partial<Path>
}>

const Root: ComponentType<RouteDrawerProps> = ({ prev = "..", children }: RouteDrawerProps) => {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [stackedModalOpen, onStackedModalOpen] = useState(false)
  const { setHasDescription, describedByProps } = useDialogDescriptionPresence()

  const to = useStateAwareTo(prev)

  /**
   * Open the modal when the component mounts. This
   * ensures that the entry animation is played.
   */
  useEffect(() => {
    setOpen(true)

    return () => {
      setOpen(false)
      onStackedModalOpen(false)
    }
  }, [])

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      document.body.style.pointerEvents = "auto"
      navigate(to, { replace: true })
      return
    }

    setOpen(open)
  }

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <RouteModalProvider prev={to}>
        <StackedModalProvider onOpenChange={onStackedModalOpen}>
          <DialogDescriptionPresenceProvider value={setHasDescription}>
            <Drawer.Content
              {...describedByProps}
              className={clx({
                "!bg-ui-bg-disabled !inset-y-5 !right-5": stackedModalOpen,
              })}
            >
              {children}
            </Drawer.Content>
          </DialogDescriptionPresenceProvider>
        </StackedModalProvider>
      </RouteModalProvider>
    </Drawer>
  )
}

const Description: typeof Drawer.Description = forwardRef<
  ComponentRef<typeof Drawer.Description>,
  ComponentPropsWithoutRef<typeof Drawer.Description>
>((props, ref) => {
  useRegisterDialogDescription()

  return <Drawer.Description ref={ref} {...props} />
})
Description.displayName = "RouteDrawer.Description"

const Header: typeof Drawer.Header = Drawer.Header
const Title: typeof Drawer.Title = Drawer.Title
const Body: typeof Drawer.Body = Drawer.Body
const Footer: typeof Drawer.Footer = Drawer.Footer
const Close: typeof Drawer.Close = Drawer.Close
const Form: typeof RouteModalForm = RouteModalForm

/**
 * Drawer that is used to render a form on a separate route.
 *
 * Typically used for forms editing a resource.
 */
export const RouteDrawer: typeof Root & {
  Header: typeof Drawer.Header;
  Title: typeof Drawer.Title;
  Body: typeof Drawer.Body;
  Description: typeof Description;
  Footer: typeof Drawer.Footer;
  Close: typeof Drawer.Close;
  Form: typeof RouteModalForm;
} = Object.assign(Root, {
  Header,
  Title,
  Body,
  Description,
  Footer,
  Close,
  Form,
})
