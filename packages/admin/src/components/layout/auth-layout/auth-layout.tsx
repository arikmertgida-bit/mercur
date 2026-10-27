import { ReactNode } from "react";

import { assetUrl } from "../../../utils/asset-url";
import { AUTH_ILLUSTRATION_PATH } from "../../../utils/asset-paths";

type AuthLayoutProps = {
  children: ReactNode;
};

export const AuthLayout = ({ children }: AuthLayoutProps) => {
  return (
    <div className="flex h-dvh w-dvw overflow-hidden" data-testid="login-page">
      <div className="bg-ui-bg-base border-ui-border-base flex h-full min-w-0 flex-1 flex-col overflow-y-auto border-r lg:min-w-[520px]">
        <div className="mx-auto flex w-full max-w-[584px] flex-1 flex-col px-8 pb-8 pt-8 lg:px-14 lg:pb-12 lg:pt-12">
          {children}
        </div>
      </div>
      {/* Square panel sized by the viewport height, so the square illustration fills it without cropping */}
      <div className="bg-ui-bg-subtle hidden aspect-square h-full max-w-[calc(100dvw-520px)] shrink-0 items-center justify-center overflow-hidden lg:flex">
        <img
          src={assetUrl(AUTH_ILLUSTRATION_PATH)}
          alt=""
          className="h-full w-full object-contain"
        />
      </div>
    </div>
  );
};
