import { WorkflowResponse, createWorkflow } from "@medusajs/framework/workflows-sdk"

import {
  ReleaseCustomerAuthIdentityStepInput,
  releaseCustomerAuthIdentityStep,
} from "../steps/release-customer-auth-identity"

/**
 * Runs after a customer account is removed to clear the stale
 * `customer_id` key `removeCustomerAccountWorkflow` leaves behind on the
 * linked auth identity, so the same email can be used to register again.
 * See `releaseCustomerAuthIdentityStep` for the full root-cause explanation.
 */
export const releaseCustomerAuthIdentityWorkflow = createWorkflow(
  { name: "release-customer-auth-identity" },
  function (input: ReleaseCustomerAuthIdentityStepInput) {
    const released = releaseCustomerAuthIdentityStep(input)

    return new WorkflowResponse(released)
  }
)
