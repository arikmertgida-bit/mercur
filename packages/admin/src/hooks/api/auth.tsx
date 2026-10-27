import {
  ClientError,
  InferClientInput,
  InferClientOutput,
} from "@mercurjs/client"
import { UseMutationOptions, useMutation } from "@tanstack/react-query"
import { z } from "zod"
import { clearAuthToken, sdk, setAuthToken } from "../../lib/client"

// The emailpass login/register routes answer with the session token; the
// payload comes off the wire, so it is validated before the token is stored.
const AuthTokenResponseSchema = z.object({ token: z.string() })

type AuthTokenResponse = z.infer<typeof AuthTokenResponseSchema>

export const useSignInWithEmailPass = (
  options?: UseMutationOptions<
    AuthTokenResponse,
    ClientError,
    Omit<
      InferClientInput<typeof sdk.auth.$actorType.$authProvider.mutate>,
      "$actorType" | "$authProvider"
    >
  >
) => {
  return useMutation({
    mutationFn: async (payload) => {
      const data = AuthTokenResponseSchema.parse(
        await sdk.auth.$actorType.$authProvider.mutate({
          $actorType: "user",
          $authProvider: "emailpass",
          ...payload,
        })
      )

      setAuthToken(data.token)

      return data
    },
    onSuccess: async (data, variables, context) => {
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const useSignUpWithEmailPass = (
  options?: UseMutationOptions<
    AuthTokenResponse,
    ClientError,
    Omit<
      InferClientInput<
        typeof sdk.auth.$actorType.$authProvider.register.mutate
      >,
      "$actorType" | "$authProvider"
    >
  >
) => {
  return useMutation({
    mutationFn: async (payload) =>
      AuthTokenResponseSchema.parse(
        await sdk.auth.$actorType.$authProvider.register.mutate({
          $actorType: "user",
          $authProvider: "emailpass",
          ...payload,
        })
      ),
    onSuccess: async (data, variables, context) => {
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const useResetPasswordForEmailPass = (
  options?: UseMutationOptions<
    InferClientOutput<
      typeof sdk.auth.$actorType.$authProvider.resetPassword.mutate
    >,
    ClientError,
    { email: string }
  >
) => {
  return useMutation({
    mutationFn: (payload) =>
      sdk.auth.$actorType.$authProvider.resetPassword.mutate({
        $actorType: "user",
        $authProvider: "emailpass",
        identifier: payload.email,
        metadata: {},
      }),
    onSuccess: async (data, variables, context) => {
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const useLogout = (
  options?: UseMutationOptions<
    void,
    ClientError
  >
) => {
  return useMutation({
    mutationFn: async () => clearAuthToken(),
    ...options,
  })
}

export const useUpdateProviderForEmailPass = (
  token: string,
  options?: UseMutationOptions<
    InferClientOutput<typeof sdk.auth.$actorType.$authProvider.update.mutate>,
    ClientError,
    Omit<
      InferClientInput<typeof sdk.auth.$actorType.$authProvider.update.mutate>,
      "$actorType" | "$authProvider"
    >
  >
) => {
  return useMutation({
    mutationFn: (payload) =>
      sdk.auth.$actorType.$authProvider.update.mutate({
        $actorType: "user",
        $authProvider: "emailpass",
        ...payload,
        fetchOptions: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }),
    onSuccess: async (data, variables, context) => {
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}
