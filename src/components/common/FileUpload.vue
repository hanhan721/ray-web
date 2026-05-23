<!--
  附件上传组件 (FileUpload)

  功能：
  - 单文件上传，使用 NUpload 原生文件列表样式
  - value 存储 objectKey（相对路径），用于提交
  - displayUrl 传入 presigned URL，用于下载回显

  使用示例：
  <FileUpload v-model:value="form.cadDrawing" :display-url="cadDrawingUrl" accept=".dwg,.dxf,.pdf" />
-->
<template>
  <NUpload
    :accept="accept"
    :file-list="fileList"
    :custom-request="handleUpload"
    @update:file-list="handleFileListUpdate"
    @remove="handleRemove"
    @download="handleDownload"
    :show-download-button="showDownload"
  >
    <NButton size="small" :loading="uploading" @click="handleTriggerClick">
      <template #icon>
        <NIcon><CloudUploadOutline /></NIcon>
      </template>
      {{ placeholder }}
    </NButton>
  </NUpload>
</template>

<script setup lang="ts">
import { NButton, NIcon, NUpload, type UploadFileInfo, type UploadCustomRequestOptions } from 'naive-ui'
import { CloudUploadOutline } from '@vicons/ionicons5'
import { uploadFile } from '@/api/file'

defineOptions({
  name: 'FileUpload',
})

const props = withDefaults(
  defineProps<{
    value?: string
    /** presigned URL，用于已有文件下载 */
    displayUrl?: string
    /** 已有文件的原始文件名（后端返回的 name 字段） */
    displayName?: string
    accept?: string
    maxSize?: number
    /** 最大文件数量 */
    max?: number
    placeholder?: string
    bizType?: string
  }>(),
  {
    value: '',
    accept: '*',
    maxSize: 20,
    max: 1,
    placeholder: '上传文件',
  }
)

const emit = defineEmits<{
  (e: 'update:value', value: string): void
}>()

const message = useMessage()
const uploading = ref(false)

// 新上传文件的 presigned URL
const uploadedUrl = ref('')

const showDownload = computed(() => !!(uploadedUrl.value || props.displayUrl))

// 内部维护的文件列表
const fileList = ref<UploadFileInfo[]>([])

// 根据 props 初始化/更新文件列表（编辑回填）
watch(
  () => [props.value, props.displayName] as const,
  ([val, name]) => {
    if (val && fileList.value.length === 0) {
      const fileName = name || val.split('/').pop() || val
      fileList.value = [
        {
          id: 'existing',
          name: fileName,
          status: 'finished',
          url: props.displayUrl || undefined,
        },
      ]
    } else if (!val) {
      fileList.value = []
    }
  },
  { immediate: true }
)

function handleFileListUpdate(list: UploadFileInfo[]) {
  fileList.value = list
}

function handleTriggerClick(e: MouseEvent) {
  if (fileList.value.length >= props.max) {
    e.stopPropagation()
    message.warning(`最多只能上传 ${props.max} 个文件，请先删除已有文件`)
  }
}

function handleDownload() {
  const url = uploadedUrl.value || props.displayUrl
  if (url) {
    window.open(url, '_blank')
  }
}

function handleRemove() {
  uploadedUrl.value = ''
  fileList.value = []
  emit('update:value', '')
  return true
}

async function handleUpload({ file, onFinish, onError }: UploadCustomRequestOptions) {
  if (!file.file) return

  if (file.file.size / 1024 / 1024 > props.maxSize) {
    message.warning(`文件大小不能超过 ${props.maxSize}MB`)
    onError()
    return
  }

  uploading.value = true
  try {
    const res = await uploadFile(file.file, props.bizType)
    uploadedUrl.value = res.fileUrl.url
    emit('update:value', res.filePath)
    onFinish()
  } catch {
    onError()
  } finally {
    uploading.value = false
  }
}
</script>
