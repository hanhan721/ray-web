<script setup lang="ts">
import { computed, shallowRef, useTemplateRef } from 'vue'
import { deleteFiles, uploadFile, uploadFiles, type FileUpload } from '@/api/file'
import { RequestError } from '@/utils/request'
import { useSessionStore } from '@/stores/session'
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
import { Field, FieldLabel } from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { classifyFiles, formatFileSize, type UploadRejection } from './file-form'

const session = useSessionStore()
const can = (code: string) => session.can(code)

const fileInput = useTemplateRef<HTMLInputElement>('fileInput')
const picked = shallowRef<File[]>([])
const rows = shallowRef<FileUpload[]>([])
const failures = shallowRef<UploadRejection[]>([])
const actionError = shallowRef('')
const uploading = shallowRef(false)
const selectedIds = shallowRef<number[]>([])
const deleteOpen = shallowRef(false)
const deleteError = shallowRef('')
const deleting = shallowRef(false)
let deleteToken = 0

const allSelected = computed(
  () => rows.value.length > 0 && rows.value.every((row) => selectedIds.value.includes(row.fileId)),
)

function failureMessage(errorValue: unknown, fallback: string): string {
  if (errorValue instanceof RequestError && errorValue.message) return errorValue.message
  return fallback
}

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
      const uploaded = await uploadFile(file, { showErrorMessage: false })
      rows.value = [...rows.value, uploaded]
    } else {
      const batch = await uploadFiles(accepted, { showErrorMessage: false })
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

function toggleRow(id: number, event: Event) {
  const checked = event.target instanceof HTMLInputElement && event.target.checked
  const next = new Set(selectedIds.value)
  if (checked) next.add(id)
  else next.delete(id)
  selectedIds.value = [...next]
}

function toggleAll(event: Event) {
  const checked = event.target instanceof HTMLInputElement && event.target.checked
  selectedIds.value = checked ? rows.value.map((row) => row.fileId) : []
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
    await deleteFiles(ids, { showErrorMessage: false })
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
  <section class="flex flex-col gap-4">
    <header>
      <h1 class="text-lg font-medium">文件</h1>
      <p class="text-muted-foreground mt-1 text-sm">
        服务端没有文件列表。这里只保留这次页面里上传成功的未绑定文件，刷新后不再显示。
      </p>
    </header>

    <form
      v-if="can('system:file:upload')"
      class="flex flex-wrap items-end gap-3"
      @submit.prevent="uploadPicked"
    >
      <Field class="min-w-64 flex-1">
        <FieldLabel for="file-input">选择文件</FieldLabel>
        <input
          id="file-input"
          ref="fileInput"
          type="file"
          multiple
          class="border-input bg-input/20 h-7 w-full rounded-md border px-2 text-sm outline-none file:mr-3 focus-visible:ring-2"
          :disabled="uploading"
          @change="onPick"
        />
      </Field>
      <Button type="submit" :disabled="uploading">
        <Spinner v-if="uploading" />
        {{ uploading ? '正在上传' : '上传' }}
      </Button>
    </form>

    <p v-if="actionError" role="alert" class="text-destructive text-sm">{{ actionError }}</p>
    <ul v-if="failures.length > 0" class="text-destructive flex flex-col gap-1 text-sm">
      <li v-for="(item, index) in failures" :key="index">{{ item.name }}：{{ item.reason }}</li>
    </ul>

    <div class="flex flex-wrap gap-2">
      <Button
        v-if="can('system:file:remove')"
        type="button"
        variant="destructive"
        :disabled="selectedIds.length === 0 || deleting"
        @click="openDelete"
      >
        删除所选
      </Button>
    </div>

    <Table>
      <TableHeader>
        <TableRow>
          <TableHead scope="col">
            <input
              type="checkbox"
              aria-label="选择当前文件"
              :checked="allSelected"
              :disabled="rows.length === 0"
              @change="toggleAll"
            />
          </TableHead>
          <TableHead scope="col">名称</TableHead>
          <TableHead scope="col">类型</TableHead>
          <TableHead scope="col">大小</TableHead>
          <TableHead scope="col">操作</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableEmpty v-if="rows.length === 0" :colspan="5">这次还没有上传成功的文件。</TableEmpty>
        <TableRow v-for="row in rows" :key="row.fileId">
          <TableCell>
            <input
              type="checkbox"
              :aria-label="`选择 ${row.fileName}`"
              :checked="selectedIds.includes(row.fileId)"
              @change="toggleRow(row.fileId, $event)"
            />
          </TableCell>
          <TableCell class="max-w-64 truncate">{{ row.fileName }}</TableCell>
          <TableCell>{{ row.contentType }}</TableCell>
          <TableCell>{{ formatFileSize(row.size) }}</TableCell>
          <TableCell>
            <a :href="row.url" target="_blank" rel="noopener noreferrer" class="text-sm underline">
              打开
            </a>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>

    <AlertDialog :open="deleteOpen" @update:open="onDeleteOpen">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>删除文件</AlertDialogTitle>
          <AlertDialogDescription>
            将删除
            {{ selectedIds.length }} 个未绑定文件。只要有一个仍被业务引用，这次删除会整批取消。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <p v-if="deleteError" role="alert" class="text-destructive text-sm">{{ deleteError }}</p>
        <AlertDialogFooter>
          <AlertDialogCancel :disabled="deleting">取消</AlertDialogCancel>
          <Button type="button" variant="destructive" :disabled="deleting" @click="confirmDelete">
            <Spinner v-if="deleting" />
            {{ deleting ? '正在删除' : '删除' }}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </section>
</template>
