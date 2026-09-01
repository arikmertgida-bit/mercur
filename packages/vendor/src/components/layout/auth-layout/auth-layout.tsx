import { ReactNode } from "react";

import { assetUrl } from "../../../utils/asset-url";
import { AUTH_ILLUSTRATION_PATH } from "../../../utils/asset-paths";
import { AuthBackButton } from "./auth-back-button";
import { AuthLanguageSelect } from "./auth-language-select";

type AuthLayoutProps = {
  children: ReactNode;
};

export const AuthLayout = ({ children }: AuthLayoutProps) => {
  return (
    <div className="flex h-dvh w-dvw overflow-hidden">
      <div className="bg-ui-bg-base border-ui-border-base flex h-full w-full flex-col overflow-y-auto border-r lg:w-[584px] lg:shrink-0">
        <div className="flex items-center justify-between px-8 pt-8 lg:px-14 lg:pt-12">
          <AuthBackButton />
          <AuthLanguageSelect />
        </div>
        <div className="flex flex-1 flex-col px-8 pb-8 lg:px-14 lg:pb-12">
          {children}
        </div>
      </div>
      <div className="bg-ui-bg-subtle relative hidden flex-1 overflow-hidden lg:flex">
        <img
          src={assetUrl(AUTH_ILLUSTRATION_PATH)}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
      </div>
    </div>
  );
};
