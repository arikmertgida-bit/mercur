import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ContainerRegistrationKeys, MedusaError } from '@medusajs/framework/utils'

import { AdminReviewResponse } from '../../../../modules/reviews/types'

export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse<AdminReviewResponse>
): Promise<void> {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const {
    data: [review]
  } = await query.graph({
    entity: 'review',
    fields: req.queryConfig.fields,
    filters: {
      id: req.params.id
    }
  })

  if (!review) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Review with id: ${req.params.id} was not found`
    )
  }

  res.json({ review })
}
