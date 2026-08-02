import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  ObjectCannedACL,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3"
import { Upload } from "@aws-sdk/lib-storage"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { FileTypes, Logger } from "@medusajs/framework/types"
import { AbstractFileProviderService, MedusaError } from "@medusajs/framework/utils"
import path from "path"
import { PassThrough, Readable, Writable } from "stream"
import { ulid } from "ulid"

const DEFAULT_UPLOAD_EXPIRATION_DURATION_SECONDS = 60 * 60

type InjectedDependencies = {
  logger: Logger
}

export type MinioFileProviderOptions = {
  file_url: string
  access_key_id?: string
  secret_access_key?: string
  session_token?: string
  authentication_method?: "access-key" | "s3-iam-role"
  region: string
  bucket: string
  prefix?: string
  /** Docker-internal host the backend uses for real S3 I/O (upload/delete/streams). */
  endpoint: string
  /** Browser-reachable host used only to sign presigned URLs, so links returned to clients never contain the internal Docker hostname. */
  public_endpoint: string
  cache_control?: string
  download_file_duration?: number
  additional_client_config?: Record<string, string | boolean | number>
  acl?: ObjectCannedACL | false
}

type ResolvedCredentials = {
  accessKeyId: string
  secretAccessKey: string
  sessionToken?: string
}

type ResolvedConfig = {
  fileUrl: string
  credentials?: ResolvedCredentials
  region: string
  bucket: string
  prefix: string
  endpoint: string
  publicEndpoint: string
  cacheControl: string
  downloadFileDuration: number
  additionalClientConfig: Record<string, string | boolean | number>
  acl?: ObjectCannedACL | false
}

/**
 * S3-compatible file provider for MinIO with a dual-endpoint strategy.
 *
 * MinIO sits behind Docker networking here: the backend must reach it via the
 * internal service hostname (`endpoint`), but any URL handed back to a
 * browser must resolve on the host network (`public_endpoint`). The AWS SDK's
 * presigner signs a URL against whichever `S3Client` generates it, so a
 * single client can only ever produce one of the two correctly. This
 * provider keeps `client_` on the internal endpoint for all real I/O
 * (upload/delete/streaming) and a second `publicClient_` on the public
 * endpoint solely for `getPresignedDownloadUrl`/`getPresignedUploadUrl`.
 */
export class MinioFileProviderService
  extends AbstractFileProviderService
  implements FileTypes.IFileProvider
{
  static identifier = "minio-dual-endpoint"

  protected config_: ResolvedConfig
  protected logger_: Logger
  protected client_: S3Client
  protected publicClient_: S3Client

  constructor({ logger }: InjectedDependencies, options: MinioFileProviderOptions) {
    super()

    const authenticationMethod = options.authentication_method ?? "access-key"
    const { access_key_id: accessKeyId, secret_access_key: secretAccessKey } = options

    if (authenticationMethod === "access-key" && (!accessKeyId || !secretAccessKey)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Access key ID and secret access key are required when using access key authentication"
      )
    }

    this.config_ = {
      fileUrl: options.file_url,
      credentials:
        authenticationMethod === "access-key" && accessKeyId && secretAccessKey
          ? { accessKeyId, secretAccessKey, sessionToken: options.session_token }
          : undefined,
      region: options.region,
      bucket: options.bucket,
      prefix: options.prefix ?? "",
      endpoint: options.endpoint,
      publicEndpoint: options.public_endpoint,
      cacheControl: options.cache_control ?? "public, max-age=31536000",
      downloadFileDuration: options.download_file_duration ?? 60 * 60,
      additionalClientConfig: options.additional_client_config ?? {},
      acl: options.acl ?? undefined,
    }

    this.logger_ = logger
    this.client_ = this.buildClient(this.config_.endpoint)
    this.publicClient_ = this.buildClient(this.config_.publicEndpoint)
  }

  private buildClient(endpoint: string): S3Client {
    return new S3Client({
      credentials: this.config_.credentials,
      region: this.config_.region,
      endpoint,
      ...this.config_.additionalClientConfig,
    })
  }

  private resolveAcl(access?: "public" | "private"): ObjectCannedACL | undefined {
    if (this.config_.acl === false) {
      return undefined
    }
    if (this.config_.acl) {
      return this.config_.acl
    }
    return access === "public" ? "public-read" : "private"
  }

  private buildFileKey(filename: string): string {
    const parsedFilename = path.parse(filename)
    return `${this.config_.prefix}${parsedFilename.name}-${ulid()}${parsedFilename.ext}`
  }

  private encodeKey(fileKey: string): string {
    return fileKey.split("/").map(encodeURIComponent).join("/")
  }

  async upload(
    file: FileTypes.ProviderUploadFileDTO
  ): Promise<FileTypes.ProviderFileResultDTO> {
    if (!file) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "No file provided")
    }
    if (!file.filename) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "No filename provided")
    }

    const fileKey = this.buildFileKey(file.filename)

    let content: Buffer
    try {
      const decoded = Buffer.from(file.content, "base64")
      content =
        decoded.toString("base64") === file.content
          ? decoded
          : Buffer.from(file.content, "utf8")
    } catch {
      content = Buffer.from(file.content, "binary")
    }

    const command = new PutObjectCommand({
      ACL: this.resolveAcl(file.access),
      Bucket: this.config_.bucket,
      Body: content,
      Key: fileKey,
      ContentType: file.mimeType,
      CacheControl: this.config_.cacheControl,
      Metadata: {
        "original-filename": encodeURIComponent(file.filename),
      },
    })

    try {
      await this.client_.send(command)
    } catch (e) {
      this.logger_.error(e instanceof Error ? e.message : String(e))
      throw e
    }

    return {
      url: `${this.config_.fileUrl}/${this.encodeKey(fileKey)}`,
      key: fileKey,
    }
  }

  async getUploadStream(fileData: FileTypes.ProviderUploadStreamDTO): Promise<{
    writeStream: Writable
    promise: Promise<FileTypes.ProviderFileResultDTO>
    url: string
    fileKey: string
  }> {
    if (!fileData.filename) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "No filename provided")
    }

    const fileKey = this.buildFileKey(fileData.filename)
    const pass = new PassThrough()

    const upload = new Upload({
      client: this.client_,
      params: {
        ACL: this.resolveAcl(fileData.access),
        Bucket: this.config_.bucket,
        Key: fileKey,
        Body: pass,
        ContentType: fileData.mimeType,
        CacheControl: this.config_.cacheControl,
        Metadata: {
          "original-filename": encodeURIComponent(fileData.filename),
        },
      },
    })

    const url = `${this.config_.fileUrl}/${this.encodeKey(fileKey)}`
    const promise = upload.done().then(() => ({ url, key: fileKey }))

    return { writeStream: pass, promise, url, fileKey }
  }

  async delete(
    files: FileTypes.ProviderDeleteFileDTO | FileTypes.ProviderDeleteFileDTO[]
  ): Promise<void> {
    try {
      if (Array.isArray(files)) {
        await this.client_.send(
          new DeleteObjectsCommand({
            Bucket: this.config_.bucket,
            Delete: {
              Objects: files.map((file) => ({ Key: file.fileKey })),
              Quiet: true,
            },
          })
        )
      } else {
        await this.client_.send(
          new DeleteObjectCommand({
            Bucket: this.config_.bucket,
            Key: files.fileKey,
          })
        )
      }
    } catch (e) {
      this.logger_.error(e instanceof Error ? e.message : String(e))
    }
  }

  async getPresignedDownloadUrl(fileData: FileTypes.ProviderGetFileDTO): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.config_.bucket,
      Key: `${fileData.fileKey}`,
    })

    return getSignedUrl(this.publicClient_, command, {
      expiresIn: this.config_.downloadFileDuration,
    })
  }

  async getPresignedUploadUrl(
    fileData: FileTypes.ProviderGetPresignedUploadUrlDTO
  ): Promise<FileTypes.ProviderFileResultDTO> {
    if (!fileData?.filename) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "No filename provided")
    }

    const fileKey = `${this.config_.prefix}${fileData.filename}`
    const acl = fileData.access ? this.resolveAcl(fileData.access) : undefined

    const command = new PutObjectCommand({
      Bucket: this.config_.bucket,
      ContentType: fileData.mimeType,
      ACL: acl,
      Key: fileKey,
    })

    const signedUrl = await getSignedUrl(this.publicClient_, command, {
      expiresIn: fileData.expiresIn ?? DEFAULT_UPLOAD_EXPIRATION_DURATION_SECONDS,
    })

    return { url: signedUrl, key: fileKey }
  }

  async getDownloadStream(file: FileTypes.ProviderGetFileDTO): Promise<Readable> {
    if (!file?.fileKey) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "No fileKey provided")
    }

    const response = await this.client_.send(
      new GetObjectCommand({ Key: file.fileKey, Bucket: this.config_.bucket })
    )

    return response.Body as Readable
  }

  async getAsBuffer(file: FileTypes.ProviderGetFileDTO): Promise<Buffer> {
    if (!file?.fileKey) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "No fileKey provided")
    }

    const response = await this.client_.send(
      new GetObjectCommand({ Key: file.fileKey, Bucket: this.config_.bucket })
    )

    const byteArray = await response.Body?.transformToByteArray()
    return Buffer.from(byteArray ?? [])
  }
}
