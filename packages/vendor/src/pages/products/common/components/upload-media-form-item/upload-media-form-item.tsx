import { useCallback } from 'react';

import { UseFormReturn } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import config from 'virtual:mercur/config';

import { FileType, FileUpload } from "@components/common/file-upload"
import { Form } from "@components/common/form"
import { formatFileSize } from '../../../../../lib/format-file-size';
import { EditStoreSchema } from '../../../../store/store-edit/components/edit-store-form/edit-store-form';
import { MediaSchema } from '../../../create/constants'
import { EditProductMediaSchemaType, ProductCreateSchemaType } from '../../../create/types'

type Media = z.infer<typeof MediaSchema>;

const SUPPORTED_FORMATS = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/svg+xml'];

const SUPPORTED_FORMATS_FILE_EXTENSIONS = ['.jpeg', '.png', '.webp', '.heic', '.svg'];

export const UploadMediaFormItem = ({
  form,
  append,
  showHint = true,
  maxCount,
  existingCount = 0,
  onLimitExceeded,
  onFilesAppended
}: {
  form:
    | UseFormReturn<ProductCreateSchemaType>
    | UseFormReturn<EditProductMediaSchemaType>
    | UseFormReturn<z.infer<typeof EditStoreSchema>>;
  append: (value: Media) => void;
  showHint?: boolean;
  /** When set, caps how many files `onUploaded` will append in total
   * (`existingCount` already-present + newly selected). Files beyond the
   * cap are discarded and reported via `onLimitExceeded` instead of being
   * silently dropped. Omit to leave uploads uncapped (existing behavior). */
  maxCount?: number;
  existingCount?: number;
  onLimitExceeded?: (skippedCount: number) => void;
  /** Called once per selection with the files actually appended (post-limit
   * trim), so a caller can kick off a background upload for them. Omit to
   * leave uploads untouched (existing behavior). */
  onFilesAppended?: (files: { id: string; file: File }[]) => void;
}) => {
  const { t } = useTranslation();

  const hasInvalidFiles = useCallback(
    (fileList: FileType[]) => {
      const invalidTypeFile = fileList.find(f => !SUPPORTED_FORMATS.includes(f.file.type));

      if (invalidTypeFile) {
        form.setError('media', {
          type: 'invalid_file',
          message: t('products.media.invalidFileType', {
            name: invalidTypeFile.file.name,
            types: SUPPORTED_FORMATS_FILE_EXTENSIONS.join(', ')
          })
        });

        return true;
      }

      const oversizedFile = fileList.find(f => f.file.size > config.imageLimit);

      if (oversizedFile) {
        form.setError('media', {
          type: 'invalid_file',
          message: t('products.media.fileTooLarge', {
            name: oversizedFile.file.name,
            size: formatFileSize(config.imageLimit)
          })
        });

        return true;
      }

      return false;
    },
    [form, t]
  );

  const onUploaded = useCallback(
    (files: FileType[]) => {
      form.clearErrors('media');
      if (hasInvalidFiles(files)) {
        return;
      }

      const availableSlots =
        maxCount === undefined
          ? files.length
          : Math.max(0, maxCount - existingCount);
      const filesToAppend = files.slice(0, availableSlots);
      const skippedFiles = files.slice(availableSlots);

      // Previews are created eagerly via `URL.createObjectURL` in
      // FileUpload — revoke the ones we're discarding so they don't leak.
      skippedFiles.forEach(f => URL.revokeObjectURL(f.url));

      filesToAppend.forEach(f => append({ ...f, isThumbnail: false }));

      if (filesToAppend.length > 0) {
        onFilesAppended?.(filesToAppend.map(f => ({ id: f.id, file: f.file })));
      }

      if (skippedFiles.length > 0) {
        onLimitExceeded?.(skippedFiles.length);
      }
    },
    [form, append, hasInvalidFiles, maxCount, existingCount, onLimitExceeded, onFilesAppended]
  );

  return (
    <Form.Field
      control={form.control as UseFormReturn<EditProductMediaSchemaType>['control']}
      name="media"
      render={() => {
        return (
          <Form.Item>
            <div className="flex flex-col gap-y-2">
              <div className="flex flex-col gap-y-1">
                <Form.Label optional>{t('products.media.label')}</Form.Label>
                {showHint && <Form.Hint>{t('products.media.editHint')}</Form.Hint>}
              </div>
              <Form.Control>
                <FileUpload
                  label={t('products.media.uploadImagesLabel')}
                  hint={t('products.media.uploadImagesHint')}
                  hasError={!!form.formState.errors.media}
                  formats={SUPPORTED_FORMATS}
                  onUploaded={onUploaded}
                />
              </Form.Control>
              <Form.ErrorMessage />
            </div>
          </Form.Item>
        );
      }}
    />
  );
};
