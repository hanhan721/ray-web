<script setup lang="ts">
import { FileText, OctagonX, Trash2, Upload } from '@lucide/vue'
import { shallowRef, useTemplateRef } from 'vue'
import { deleteFiles, uploadFile, uploadFiles, type FileUpload } from '@/api/file'
import { useSessionStore } from '@/stores/session'
import { useSelection } from '@/composables/useSelection'
import { QUIET, failureMessage } from '@/utils/failure'
import RayTable from '@/components/common/RayTable.vue'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'
import {
  FILE_DATA_COLUMNS,
  classifyFiles,
  fileCellClass,
  formatFileSize,
  type UploadRejection,
} from './file-form'

const session = useSessionStore()
const can = (code: string) => session.can(code)

const fileInput = useTemplateRef<HTMLInputElement>('fileInput')
const picked = shallowRef<File[]>([])
const rows = shallowRef<FileUpload[]>([])
const failures = shallowRef<UploadRejection[]>([])
const actionError = shallowRef('')
const uploading = shallowRef(false)
const deleteOpen = shallowRef(false)
const deleteError = shallowRef('')
const deleting = shallowRef(false)
let deleteToken = 0

const { selectedIds, toggleSelected, toggleAll } = useSelection<FileUpload>({
  rowId: (row) => row.fileId,
})
const rowKey = (row: FileUpload) => row.fileId
const rowLabel = (row: FileUpload) => row.fileName

function onPick(event: Event) {
  const input = event.target
  picked.value = input instanceof HTMLInputElement && input.files ? [...input.files] : []
}

function clearPicker() {
  picked.value = []
  if (fileInput.value) fileInput.value.value = ''
}

async function uploadPicked() {
  if (uploading.value) return
  actionError.value = ''
  if (picked.value.length === 0) {
    failures.value = []
    actionError.value = '请选择文件'
    return
  }
  const { accepted, rejected } = classifyFiles(picked.value)
  failures.value = rejected
  if (accepted.length === 0) return
  uploading.value = true
  try {
    if (accepted.length === 1) {
      const file = accepted[0]
      if (!file) return
      const uploaded = await uploadFile(file, QUIET)
      rows.value = [...rows.value, uploaded]
    } else {
      const batch = await uploadFiles(accepted, QUIET)
      const uploaded: FileUpload[] = []
      const serverFailures: UploadRejection[] = [...rejected]
      for (const item of batch) {
        if (item.ok && item.data) uploaded.push(item.data)
        else {
          serverFailures.push({
            name: item.originalName || '未命名文件',
            reason: item.reason || '上传失败，请重试',
          })
        }
      }
      failures.value = serverFailures
      rows.value = [...rows.value, ...uploaded]
    }
    clearPicker()
  } catch (error) {
    actionError.value = failureMessage(error, '上传失败，请稍后重试')
  } finally {
    uploading.value = false
  }
}

function openDelete() {
  if (deleting.value) return
  deleteToken += 1
  deleteError.value = ''
  deleteOpen.value = true
}

function onDeleteOpen(open: boolean) {
  if (open) return
  deleteOpen.value = false
  deleteToken += 1
  deleting.value = false
}

async function confirmDelete() {
  const token = deleteToken
  const ids = [...selectedIds.value]
  deleting.value = true
  deleteError.value = ''
  try {
    await deleteFiles(ids, QUIET)
    const removed = new Set(ids)
    rows.value = rows.value.filter((row) => !removed.has(row.fileId))
    selectedIds.value = selectedIds.value.filter((id) => !removed.has(id))
    if (token !== deleteToken) return
    deleteOpen.value = false
  } catch (error) {
    const message = failureMessage(error, '删除失败，请稍后重试')
    if (token === deleteToken) deleteError.value = message
    else actionError.value = message
  } finally {
    if (token === deleteToken) deleting.value = false
  }
}
</script>

<template>
  <RayTable
    :paginated="false"
    :columns="FILE_DATA_COLUMNS"
    :rows="rows"
    :total="rows.length"
    :page-index="0"
    :page-size="rows.length"
    :selected-ids="selectedIds"
    selection-unit="个"
    :row-key="rowKey"
    :row-label="rowLabel"
    :cell-class="fileCellClass"
    @toggle-row="toggleSelected"
    @row-click="(row) => toggleSelected(row.fileId, !selectedIds.includes(row.fileId))"
    @toggle-page="toggleAll(rows, $event)"
  >
    <template #filters>
      <form v-if="can('system:file:upload')" class="min-w-0" @submit.prevent="uploadPicked()">
        <FieldGroup class="flex-row flex-wrap items-end gap-3">
          <Field class="min-w-0 basis-64 flex-1">
            <FieldLabel for="file-input">选择文件</FieldLabel>
            <input
              id="file-input"
              ref="fileInput"
              type="file"
              multiple
              class="border-input bg-input/20 h-9 min-w-0 w-full rounded-md border px-2.5 text-sm outline-none file:mr-3 focus-visible:ring-2"
              :disabled="uploading"
              @change="onPick"
            />
          </Field>
          <Button type="submit" :disabled="uploading">
            <Spinner v-if="uploading" />
            <Upload v-else data-icon="inline-start" />
            {{ uploading ? '正在上传' : '上传' }}
          </Button>
        </FieldGroup>
      </form>

      <Alert v-if="actionError" variant="destructive" class="mt-3">
        <OctagonX />
        <AlertTitle>上传失败</AlertTitle>
        <AlertDescription>{{ actionError }}</AlertDescription>
      </Alert>
      <Alert v-if="failures.length > 0" variant="destructive" class="mt-3">
        <OctagonX />
        <AlertTitle>部分文件没有上传</AlertTitle>
        <AlertDescription>
          <ul class="flex flex-col gap-1">
            <li v-for="(item, index) in failures" :key="index">
              {{ item.name }}：{{ item.reason }}
            </li>
          </ul>
        </AlertDescription>
      </Alert>
      <p class="text-muted-foreground mt-3 w-full text-xs">
        服务端没有文件列表。这里只保留这次页面里上传成功的未绑定文件，刷新后不再显示。
      </p>
    </template>

    <template #actions>
      <Button
        v-if="can('system:file:remove')"
        type="button"
        variant="outline"
        :disabled="selectedIds.length === 0 || deleting"
        @click="openDelete"
      >
        <Trash2 data-icon="inline-start" />
        删除所选
        <span v-if="selectedIds.length > 0" class="text-muted-foreground">
          {{ selectedIds.length }}
        </span>
      </Button>
    </template>

    <template #empty>
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FileText />
          </EmptyMedia>
          <EmptyTitle>这次还没有上传成功的文件</EmptyTitle>
          <EmptyDescription>选择文件并上传后，这里会显示本次上传的结果。</EmptyDescription>
        </EmptyHeader>
      </Empty>
    </template>

    <template #cell-size="{ row }">
      <span :class="fileCellClass('size')">{{ formatFileSize(row.size) }}</span>
    </template>

    <template #cell-actions="{ row }">
      <div class="flex min-w-16 flex-nowrap gap-1">
        <Button as-child variant="ghost" size="sm">
          <a :href="row.url" target="_blank" rel="noopener noreferrer">打开</a>
        </Button>
      </div>
    </template>
  </RayTable>

  <AlertDialog :open="deleteOpen" @update:open="onDeleteOpen">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>删除文件</AlertDialogTitle>
        <AlertDialogDescription>
          将删除
          {{ selectedIds.length }} 个未绑定文件。只要有一个仍被业务引用，这次删除会整批取消。
          <span v-if="deleteError" class="text-destructive mt-2 block">{{ deleteError }}</span>
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel :disabled="deleting">取消</AlertDialogCancel>
        <Button type="button" variant="destructive" :disabled="deleting" @click="confirmDelete">
          <Spinner v-if="deleting" />
          删除
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
