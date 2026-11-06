import { Drawer, clx } from "@medusajs/ui";
import {
  ComponentPropsWithoutRef,
  ComponentRef,
  ComponentType,
  ForwardRefExoticComponent,
  PropsWithChildren,
  forwardRef,
  useEffect,
} from "react";
import {
  DialogDescriptionPresenceProvider,
  useDialogDescriptionPresence,
  useRegisterDialogDescription,
} from "../dialog-description-presence";
import { useStackedModal } from "../stacked-modal-provider";

type StackedDrawerProps = PropsWithChildren<{
  /**
   * A unique identifier for the modal. This is used to differentiate stacked modals,
   * when multiple stacked modals are registered to the same parent modal.
   */
  id: string;
}>;

/**
 * A stacked modal that can be rendered above a parent modal.
 */
export const Root: ComponentType<StackedDrawerProps> = ({
  id,
  children,
}: StackedDrawerProps) => {
  const { register, unregister, getIsOpen, setIsOpen } = useStackedModal();

  useEffect(() => {
    register(id);

    return () => unregister(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Drawer open={getIsOpen(id)} onOpenChange={(open) => setIsOpen(id, open)}>
      {children}
    </Drawer>
  );
};

const Close: typeof Drawer.Close = Drawer.Close;
Close.displayName = "StackedDrawer.Close";

const Header: typeof Drawer.Header = Drawer.Header;
Header.displayName = "StackedDrawer.Header";

const Body: typeof Drawer.Body = Drawer.Body;
Body.displayName = "StackedDrawer.Body";

const Trigger: typeof Drawer.Trigger = Drawer.Trigger;
Trigger.displayName = "StackedDrawer.Trigger";

const Footer: typeof Drawer.Footer = Drawer.Footer;
Footer.displayName = "StackedDrawer.Footer";

const Title: typeof Drawer.Title = Drawer.Title;
Title.displayName = "StackedDrawer.Title";

const Description: typeof Drawer.Description = forwardRef<
  ComponentRef<typeof Drawer.Description>,
  ComponentPropsWithoutRef<typeof Drawer.Description>
>((props, ref) => {
  useRegisterDialogDescription();

  return <Drawer.Description ref={ref} {...props} />;
});
Description.displayName = "StackedDrawer.Description";

type ContentProps = ComponentPropsWithoutRef<typeof Drawer.Content>;

const Content: ForwardRefExoticComponent<ContentProps> = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof Drawer.Content>
>(({ className, ...props }, ref) => {
  const { setHasDescription, describedByProps } = useDialogDescriptionPresence();

  return (
    <DialogDescriptionPresenceProvider value={setHasDescription}>
      <Drawer.Content
        ref={ref}
        {...describedByProps}
        className={clx(className)}
        overlayProps={{
          className: "bg-transparent",
        }}
        {...props}
      />
    </DialogDescriptionPresenceProvider>
  );
});
Content.displayName = "StackedDrawer.Content";

export const StackedDrawer: typeof Root & {
  Close: typeof Drawer.Close;
  Header: typeof Drawer.Header;
  Body: typeof Drawer.Body;
  Content: typeof Drawer.Content;
  Trigger: typeof Drawer.Trigger;
  Footer: typeof Drawer.Footer;
  Description: typeof Description;
  Title: typeof Drawer.Title;
} = Object.assign(Root, {
  Close,
  Header,
  Body,
  Content,
  Trigger,
  Footer,
  Description,
  Title,
});
