import { ReactNode } from "react";

import { assetUrl } from "../../../utils/asset-url";
import { AUTH_ILLUSTRATION_PATH } from "../../../utils/asset-paths";

type AuthLayoutProps = {
  children: ReactNode;
};

export const AuthLayout = ({ children }: AuthLayoutProps) => {
  return (
    <div className="flex h-dvh w-dvw overflow-hidden" data-testid="login-page">
      <div className="bg-ui-bg-base border-ui-border-base flex h-full w-full flex-col overflow-y-auto border-r lg:w-[584px] lg:shrink-0">
        <div className="flex flex-1 flex-col px-8 pb-8 pt-8 lg:px-14 lg:pb-12 lg:pt-12">
          {children}
        </div>
      </div>
      <div className="bg-ui-bg-subtle hidden min-w-0 flex-1 items-center justify-center overflow-hidden lg:flex">
        <img
          src={assetUrl(AUTH_ILLUSTRATION_PATH)}
          alt=""
          className="h-full max-h-[1024px] w-full max-w-[1024px] object-contain"
        />
      </div>
    </div>
  );
};
