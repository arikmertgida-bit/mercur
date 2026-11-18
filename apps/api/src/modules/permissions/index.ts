import { Module } from "@medusajs/framework/utils"
import { PERMISSIONS_MODULE } from "@mercurjs/types"

import PermissionsModuleService from "./service"

export { PermissionsModuleService }

export default Module(PERMISSIONS_MODULE, {
  service: PermissionsModuleService,
})
