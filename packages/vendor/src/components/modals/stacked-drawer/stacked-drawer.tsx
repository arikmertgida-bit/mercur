import { Drawer, clx } from "@medusajs/ui";
import {
  ComponentPropsWithoutRef,
  ComponentType,
  ForwardRefExoticComponent,
  PropsWithChildren,
  forwardRef,
  useEffect,
} from "react";
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
    <Drawer
      open={getIsOpen(id)}
      onOpenChange={(open) => setIsOpen(id, open)}
      // A StackedDrawer always opens on top of an already-open parent
      // modal (RouteFocusModal / StackedFocusModal), which already owns
      // body scroll-lock and focus trapping. Radix Dialog defaults to
      // `modal=true`, so without this the drawer re-applies its own
      // scroll-lock on mount/unmount on top of the parent's — the two
      // locks fighting over the scrollbar-compensation padding is what
      // causes the parent modal to visibly jump (CLS) when the drawer
      // opens or closes.
      modal={false}
    >
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

const Description: typeof Drawer.Description = Drawer.Description;
Description.displayName = "StackedDrawer.Description";

type ContentProps = ComponentPropsWithoutRef<typeof Drawer.Content>;

const Content: ForwardRefExoticComponent<ContentProps> = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof Drawer.Content>
>(({ className, onFocusOutside, onWheel, onTouchMove, ...props }, ref) => {
  return (
    <Drawer.Content
      ref={ref}
      className={clx(className)}
      overlayProps={{
        className: "bg-transparent",
      }}
      // The trigger that opens a StackedDrawer (e.g. a button inside the
      // parent modal's own content) still has DOM focus at the instant
      // this non-modal (`modal={false}`, see Root above) drawer mounts —
      // that focus is, by definition, outside this drawer's content.
      // Without overriding this, Radix's DismissableLayer reads that as
      // "focus moved outside" and closes the drawer immediately after
      // opening it. Consumers can still opt back into the default
      // dismiss-on-focus-outside behavior by passing their own handler.
      onFocusOutside={onFocusOutside ?? ((event) => event.preventDefault())}
      // The parent RouteFocusModal stays `modal=true` (Radix default), so
      // its `react-remove-scroll` lock is still active and installs a
      // document-level wheel/touchmove listener that `preventDefault()`s
      // any event whose target isn't inside that outer dialog's own content
      // subtree. This drawer renders in a separate sibling portal, so
      // without stopping propagation here the lock swallows every wheel/
      // touch scroll over this drawer's body — the scrollbar is visible but
      // the wheel does nothing.
      onWheel={(event) => {
        event.stopPropagation()
        onWheel?.(event)
      }}
      onTouchMove={(event) => {
        event.stopPropagation()
        onTouchMove?.(event)
      }}
      {...props}
    />
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
  Description: typeof Drawer.Description;
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
