import { loadEnv } from '@medusajs/framework/utils'
import { withMercur } from '@mercurjs/core'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

module.exports = withMercur({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: REDIS_URL,
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      vendorCors: process.env.VENDOR_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    }
  },
  featureFlags: {
    seller_registration: true
  },
  modules: [
    {
      resolve: './src/modules/product-reports',
    },
    {
      resolve: '@mercurjs/core/modules/custom-fields',
      options: {
        customFields: {
          ProductCollection: {
            request_status: {
              type: 'enum',
              enum: ['draft', 'pending', 'accepted', 'rejected'],
              defaultValue: 'draft',
            },
            submitter_id: { type: 'string', nullable: true },
            reviewer_id: { type: 'string', nullable: true },
            reviewer_note: { type: 'text', nullable: true },
          },
          ProductCategory: {
            request_status: {
              type: 'enum',
              enum: ['draft', 'pending', 'accepted', 'rejected'],
              defaultValue: 'draft',
            },
            submitter_id: { type: 'string', nullable: true },
            reviewer_id: { type: 'string', nullable: true },
            reviewer_note: { type: 'text', nullable: true },
          },
          ProductType: {
            request_status: {
              type: 'enum',
              enum: ['draft', 'pending', 'accepted', 'rejected'],
              defaultValue: 'draft',
            },
            submitter_id: { type: 'string', nullable: true },
            reviewer_id: { type: 'string', nullable: true },
            reviewer_note: { type: 'text', nullable: true },
          },
          ProductTag: {
            request_status: {
              type: 'enum',
              enum: ['draft', 'pending', 'accepted', 'rejected'],
              defaultValue: 'draft',
            },
            submitter_id: { type: 'string', nullable: true },
            reviewer_id: { type: 'string', nullable: true },
            reviewer_note: { type: 'text', nullable: true },
          },
        },
      },
    },
    {
      resolve: './src/modules/reviews',
    },
    {
      resolve: './src/modules/review-images',
    },
    {
      resolve: './src/modules/review-image-reports',
    },
    {
      resolve: './src/modules/wishlist',
    },
    {
      resolve: './src/modules/seller-follow',
    },
    {
      resolve: '@mercurjs/core/modules/admin-ui',
      options: {
        appDir: '',
        path: '/dashboard',
        disable: true
      }
    },
    {
      resolve: '@mercurjs/core/modules/vendor-ui',
      options: {
        appDir: '',
        path: '/seller',
        disable: true
      }
    },
    {
      resolve: '@medusajs/medusa/cache-redis',
      options: { redisUrl: REDIS_URL },
    },
    {
      resolve: '@medusajs/medusa/event-bus-redis',
      options: { redisUrl: REDIS_URL },
    },
    {
      resolve: '@medusajs/medusa/workflow-engine-redis',
      options: { redis: { url: REDIS_URL } },
    },
    {
      resolve: '@medusajs/medusa/locking',
      options: {
        providers: [
          {
            resolve: '@medusajs/medusa/locking-redis',
            id: 'locking-redis',
            is_default: true,
            options: { redisUrl: REDIS_URL },
          },
        ],
      },
    },
    {
      resolve: '@medusajs/medusa/file',
      options: {
        providers: [
          {
            resolve: '@medusajs/file-s3',
            id: 'minio',
            options: {
              file_url: requireEnv('MINIO_FILE_URL'),
              access_key_id: requireEnv('MINIO_ACCESS_KEY_ID'),
              secret_access_key: requireEnv('MINIO_SECRET_ACCESS_KEY'),
              region: requireEnv('MINIO_REGION'),
              bucket: requireEnv('MINIO_BUCKET'),
              endpoint: requireEnv('MINIO_ENDPOINT'),
              // MinIO requires path-style addressing; the AWS SDK v3 default
              // (virtual-hosted-style) only works against real AWS S3.
              additional_client_config: { forcePathStyle: true },
            },
          },
        ],
      },
    },
  ],
})
