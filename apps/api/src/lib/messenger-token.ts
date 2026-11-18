import jwt from "jsonwebtoken"

/**
 * Messenger tokens live in the browser (the Socket.io client needs them), so
 * they must never be usable against Medusa. They are signed with their own
 * secret and carry an audience the messenger insists on; a token signed with
 * Medusa's JWT_SECRET used to be accepted as a store session by Medusa.
 */
export const MESSENGER_TOKEN_AUDIENCE = "kayi-messenger"
export const MESSENGER_TOKEN_ISSUER = "kayi-api"

export const MessengerActorType = {
  CUSTOMER: "customer",
  SELLER: "seller",
  USER: "user",
} as const

export type MessengerActorType =
  (typeof MessengerActorType)[keyof typeof MessengerActorType]

function readMessengerSecret(): string {
  const secret = process.env.MESSENGER_JWT_SECRET
  if (!secret || secret.trim().length === 0) {
    throw new Error(
      "[messenger-token] MESSENGER_JWT_SECRET environment variable is not set"
    )
  }
  if (secret === process.env.JWT_SECRET) {
    throw new Error(
      "[messenger-token] MESSENGER_JWT_SECRET must differ from JWT_SECRET"
    )
  }
  return secret
}

const MESSENGER_JWT_SECRET: string = readMessengerSecret()

export function signMessengerToken(
  actorId: string,
  actorType: MessengerActorType,
  expiresIn: "1m" | "8h"
): string {
  return jwt.sign(
    { sub: actorId, actor_id: actorId, actor_type: actorType },
    MESSENGER_JWT_SECRET,
    {
      algorithm: "HS256",
      audience: MESSENGER_TOKEN_AUDIENCE,
      issuer: MESSENGER_TOKEN_ISSUER,
      expiresIn,
    }
  )
}
