import { assetUrl } from "../../utils/asset-url";
import { AUTH_ILLUSTRATION_PATH } from "../../utils/asset-paths";

export const WizardPreview = () => {
  return (
    <div className="hidden lg:flex flex-1 relative overflow-hidden">
      <img
        src={assetUrl(AUTH_ILLUSTRATION_PATH)}
        alt=""
        className="h-full w-full object-cover"
      />
    </div>
  );
};
