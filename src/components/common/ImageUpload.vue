<template>
  <div class="image-upload" :class="{ 'image-upload--multiple': multiple }">
    <!-- 单图模式 -->
    <template v-if="!multiple">
      <div
        v-if="value"
        class="image-upload__preview"
      >
        <NImage
          :src="getDisplayUrl(value as string)"
          :width="width"
          :height="height"
          object-fit="contain"
        />
        <div class="image-upload__actions">
          <NButton
            circle
            size="tiny"
            type="error"
            secondary
            @click="handleRemove"
          >
            <template #icon>
              <NIcon><CloseOutline /></NIcon>
            </template>
          </NButton>
        </div>
      </div>

      <NUpload
        v-else
        :accept="accept"
        :show-file-list="false"
        :custom-request="handleUpload"
      >
        <div
          class="image-upload__trigger"
          :style="{ width: `${width}px`, height: `${height}px` }"
        >
          <NSpin v-if="uploading" size="small" />
          <template v-else>
            <NIcon :size="24" depth="3">
              <CloudUploadOutline />
            </NIcon>
            <NText depth="3" style="font-size: 12px">
              上传图片
            </NText>
          </template>
        </div>
      </NUpload>
    </template>

    <!-- 多图模式 -->
    <template v-else>
      <div
        v-for="(img, idx) in (value as string[])"
        :key="idx"
        class="image-upload__preview"
      >
        <NImage
          :src="getDisplayUrl(img)"
          :width="width"
          :height="height"
          object-fit="contain"
        />
        <div class="image-upload__actions">
          <NButton
            circle
            size="tiny"
            type="error"
            secondary
            @click="handleRemoveAt(idx)"
          >
            <template #icon>
              <NIcon><CloseOutline /></NIcon>
            </template>
          </NButton>
        </div>
      </div>

      <NUpload
        v-if="!max || (value as string[]).length < max"
        :accept="accept"
        :multiple="true"
        :show-file-list="false"
        :custom-request="handleUpload"
      >
        <div
          class="image-upload__trigger"
          :style="{ width: `${width}px`, height: `${height}px` }"
        >
          <NSpin v-if="uploading" size="small" />
          <template v-else>
            <NIcon :size="24" depth="3">
              <CloudUploadOutline />
            </NIcon>
            <NText depth="3" style="font-size: 12px">
              上传图片
            </NText>
          </template>
        </div>
      </NUpload>
    </template>
  </div>
</template>

<script setup lang="ts">
import { NButton, NIcon, NImage, NSpin, NText, NUpload, type UploadCustomRequestOptions } from 'naive-ui'
import { CloudUploadOutline, CloseOutline } from '@vicons/ionicons5'
import { uploadFile, uploadFiles } from '@/api/file'

defineOptions({
  name: 'ImageUpload',
})

const props = withDefaults(
  defineProps<{
    value?: string | string[]
    /** objectKey → 展示 URL 映射，用于已有图片回显（presigned URL 等） */
    displayUrls?: Record<string, string>
    bizType?: string
    accept?: string
    maxSize?: number
    width?: number
    height?: number
    multiple?: boolean
    max?: number
  }>(),
  {
    value: '',
    accept: '.png,.jpg,.jpeg,.gif,.webp',
    maxSize: 2,
    width: 100,
    height: 100,
    multiple: false,
  }
)

const emit = defineEmits<{
  (e: 'update:value', value: string | string[]): void
  (e: 'uploaded', value: { filePath: string; fileUrl: string } | null): void
}>()

const message = useMessage()

const uploading = ref(false)

// filePath -> fileUrl 映射，用于新上传图片的预览
const previewUrlMap = reactive<Record<string, string>>({})

function getDisplayUrl(path: string) {
  return previewUrlMap[path] || props.displayUrls?.[path] || path
}

// 批量上传：收集同一次文件选择中的多个文件
const pendingFiles: File[] = []
let batchScheduled = false

async function handleUpload({ file }: UploadCustomRequestOptions) {
  if (!file.file) return

  if (file.file.size / 1024 / 1024 > props.maxSize) {
    message.warning(`图片大小不能超过 ${props.maxSize}MB`)
    return
  }

  if (props.multiple) {
    // 收集文件，延迟到下一个宏任务统一批量上传
    pendingFiles.push(file.file)
    if (!batchScheduled) {
      batchScheduled = true
      setTimeout(handleBatchUpload, 0)
    }
  } else {
    uploading.value = true
    try {
      const res = await uploadFile(file.file, props.bizType)
      previewUrlMap[res.filePath] = res.fileUrl.url
      emit('uploaded', { filePath: res.filePath, fileUrl: res.fileUrl.url })
      emit('update:value', res.filePath)
    } finally {
      uploading.value = false
    }
  }
}

async function handleBatchUpload() {
  const files = pendingFiles.splice(0)
  batchScheduled = false

  // 超出 max 限制时截断并提示
  if (props.max) {
    const currentCount = (props.value as string[]).length
    const allowed = props.max - currentCount
    if (allowed <= 0) return
    if (files.length > allowed) {
      files.splice(allowed)
      message.warning(`最多还能上传 ${allowed} 张图片，已自动截取`)
    }
  }

  uploading.value = true
  try {
    const resList = await uploadFiles(files, props.bizType)
    for (const res of resList) {
      previewUrlMap[res.filePath] = res.fileUrl.url
    }
    const newPaths = resList.map((r) => r.filePath)
    const list = [...(props.value as string[]), ...newPaths]
    emit('update:value', list)
  } finally {
    uploading.value = false
  }
}

// 单图模式移除
function handleRemove() {
  const path = props.value as string
  delete previewUrlMap[path]
  emit('uploaded', null)
  emit('update:value', '')
}

// 多图模式移除指定索引
function handleRemoveAt(index: number) {
  const list = [...(props.value as string[])]
  const path = list[index]
  delete previewUrlMap[path]
  list.splice(index, 1)
  emit('update:value', list)
}
</script>

<style scoped lang="scss">
.image-upload {
  &--multiple {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;

    :deep(.n-upload) {
      width: auto;
    }
  }

  &__preview {
    position: relative;
    display: inline-block;
    border: 1px solid var(--n-border-color, #e0e0e6);
    border-radius: 4px;
    overflow: hidden;
  }

  &__actions {
    position: absolute;
    top: 4px;
    right: 4px;
  }

  &__trigger {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    border: 1px dashed var(--n-border-color, #e0e0e6);
    border-radius: 4px;
    cursor: pointer;
    transition: border-color 0.3s;

    &:hover {
      border-color: var(--n-primary-color, #18a058);
    }
  }
}
</style>
