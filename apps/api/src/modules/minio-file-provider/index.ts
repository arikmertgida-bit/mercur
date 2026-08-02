import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import { MinioFileProviderService } from "./service"

export default ModuleProvider(Modules.FILE, {
  services: [MinioFileProviderService],
})
