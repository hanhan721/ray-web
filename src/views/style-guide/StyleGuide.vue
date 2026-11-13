<script setup lang="ts">
import { MoonIcon, OctagonXIcon, SunIcon, UsersIcon } from '@lucide/vue'
import { computed, shallowRef } from 'vue'
import { storeToRefs } from 'pinia'
import { toast } from 'vue-sonner'
import { useThemeStore } from '@/stores/theme'
import RaySearchForm from '@/components/common/RaySearchForm.vue'
import RaySelect from '@/components/common/RaySelect.vue'
import RayTreeSelect, { type TreeSelectOption } from '@/components/common/RayTreeSelect.vue'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const theme = useThemeStore()
const { mode } = storeToRefs(theme)
const dark = computed(() => mode.value === 'dark')
const account = shallowRef('admin')
const password = shallowRef('')
const passwordAgain = shallowRef('不一致')
const allowLogin = shallowRef(true)
const editorOpen = shallowRef(false)
const confirmOpen = shallowRef(false)
const nickname = shallowRef('夜间巡检')
const filterName = shallowRef('')
const filterStatus = shallowRef<string | null>(null)
const statusOptions = [
  { value: 'true', label: '启用' },
  { value: 'false', label: '停用' },
]
const guideTreeSingle = shallowRef<number | null>(null)
const guideTreeMulti = shallowRef<number[]>([])
const guideFlatMulti = shallowRef<string[]>([])
const guideTagOptions = [
  { value: 'ops', label: '运维' },
  { value: 'dev', label: '开发' },
  { value: 'test', label: '测试' },
]
const guideTreeOptions: TreeSelectOption<number>[] = [
  {
    value: 1,
    label: '演示分组A',
    children: [
      { value: 11, label: '演示页面A1' },
      { value: 12, label: '演示页面A2' },
    ],
  },
  {
    value: 2,
    label: '演示分组B',
    children: [{ value: 21, label: '演示页面B1' }],
  },
  { value: 3, label: '演示单页' },
]

const longRemark =
  '夜间巡检账号，负责字典维护、任务失败重试和权限复核。备注需要完整显示，不能被表格裁成一行省略号。'

function toggleTheme() {
  theme.toggle()
}

function showSaved() {
  toast.success('已保存')
}

function resetSearchExample() {
  filterName.value = ''
  filterStatus.value = null
}
</script>

<template>
  <main class="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-6">
    <header class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div class="flex max-w-prose flex-col gap-2">
        <h1 class="text-lg font-medium">ray-web</h1>
        <p class="text-sm text-muted-foreground">
          账号、权限和定时任务的操作台。这一页用来核对按钮、表单、表格和弹窗，还不是登录页。
        </p>
      </div>
      <Button variant="outline" @click="toggleTheme">
        <SunIcon v-if="dark" data-icon="inline-start" />
        <MoonIcon v-else data-icon="inline-start" />
        {{ dark ? '浅色' : '深色' }}
      </Button>
    </header>

    <section class="flex flex-col gap-3">
      <h2 class="text-sm font-medium">操作</h2>
      <div class="flex flex-wrap items-center gap-2">
        <Button>保存</Button>
        <Button variant="outline">取消</Button>
        <Button variant="secondary">重置密码</Button>
        <Button variant="ghost">查看角色</Button>
        <Button variant="destructive" @click="confirmOpen = true">停用账号</Button>
        <Button disabled>
          <Spinner data-icon="inline-start" />
          正在保存
        </Button>
      </div>
      <Field orientation="horizontal" class="w-fit">
        <Switch id="allow-login" v-model="allowLogin" />
        <FieldLabel for="allow-login">允许登录</FieldLabel>
      </Field>
    </section>

    <Separator />

    <section class="flex min-w-0 flex-col gap-4">
      <h2 class="text-sm font-medium">表单布局规范</h2>
      <p class="text-muted-foreground text-sm">
        搜索字段左右排列，空间不足自动换行；编辑字段上下排列，相关短字段在宽屏并排。
        以下为布局示例，查询不会请求接口。
      </p>
      <RaySearchForm @submit="toast.info('布局示例，无接口请求')">
        <Field orientation="horizontal">
          <FieldLabel for="guide-filter-name">账号</FieldLabel>
          <Input id="guide-filter-name" v-model="filterName" placeholder="输入账号关键字" />
        </Field>
        <Field orientation="horizontal" class="ray-search-field-short">
          <FieldLabel for="guide-filter-status">状态</FieldLabel>
          <RaySelect
            id="guide-filter-status"
            v-model="filterStatus"
            :options="statusOptions"
            placeholder="全部"
            :searchable="false"
          />
        </Field>
        <template #actions>
          <Button type="submit">查询</Button>
          <Button type="button" variant="ghost" @click="resetSearchExample"> 重置 </Button>
        </template>
      </RaySearchForm>
      <div class="ray-form-body">
        <FieldGroup class="ray-form-grid">
          <Field>
            <FieldLabel for="guide-edit-name" required>账号</FieldLabel>
            <Input id="guide-edit-name" model-value="night-watch" required />
          </Field>
          <Field>
            <FieldLabel for="guide-edit-nickname">昵称</FieldLabel>
            <Input id="guide-edit-nickname" model-value="夜间巡检" />
          </Field>
          <Field class="ray-form-span-full" data-invalid>
            <FieldLabel for="guide-edit-email">邮箱</FieldLabel>
            <Input
              id="guide-edit-email"
              model-value="night-watch@"
              aria-invalid="true"
              aria-describedby="guide-email-error"
            />
            <FieldError id="guide-email-error"
              >请输入完整的邮箱地址，例如 name@example.com。</FieldError
            >
          </Field>
        </FieldGroup>
      </div>
      <div class="flex flex-col gap-3">
        <p class="text-muted-foreground text-sm">
          选择器变体：复选框与行点击行为可配置（select / toggle / both / none），页面统一用
          select：行点击只勾选，展开收起只认箭头。
        </p>
        <div class="flex flex-wrap gap-3">
          <Field class="w-64">
            <FieldLabel for="guide-select-checkbox">多选 + 复选框</FieldLabel>
            <RaySelect
              id="guide-select-checkbox"
              v-model="guideFlatMulti"
              multiple
              checkbox
              :options="guideTagOptions"
              placeholder="选择标签"
            />
          </Field>
          <Field class="w-64">
            <FieldLabel for="guide-tree-single">树形单选（行点击选中）</FieldLabel>
            <RayTreeSelect
              id="guide-tree-single"
              v-model="guideTreeSingle"
              row-action="select"
              :options="guideTreeOptions"
              placeholder="选择节点"
            />
          </Field>
          <Field class="w-64">
            <FieldLabel for="guide-tree-multi">树形多选（行点击勾选）</FieldLabel>
            <RayTreeSelect
              id="guide-tree-multi"
              v-model="guideTreeMulti"
              multiple
              row-action="select"
              :options="guideTreeOptions"
              placeholder="选择节点"
            />
          </Field>
        </div>
      </div>
    </section>

    <Separator />

    <Card class="max-w-md">
      <form class="contents" @submit.prevent>
        <CardHeader>
          <CardTitle>登录</CardTitle>
          <CardDescription>填写账号和密码。错误会留在字段旁边。</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel for="account">账号</FieldLabel>
              <Input id="account" v-model="account" autocomplete="username" />
            </Field>
            <Field>
              <FieldLabel for="password">密码</FieldLabel>
              <Input
                id="password"
                v-model="password"
                type="password"
                autocomplete="current-password"
              />
            </Field>
            <Field data-invalid>
              <FieldLabel for="password-again">再次输入密码</FieldLabel>
              <Input
                id="password-again"
                v-model="passwordAgain"
                type="password"
                autocomplete="new-password"
                aria-invalid="true"
              />
              <FieldError>两次输入的密码不一致。</FieldError>
            </Field>
            <Field data-disabled>
              <FieldLabel for="nickname">昵称</FieldLabel>
              <Input id="nickname" model-value="系统管理员" disabled />
              <FieldDescription>这个字段当前不能改。</FieldDescription>
            </Field>
          </FieldGroup>
        </CardContent>
        <CardFooter>
          <Button type="submit">登录</Button>
        </CardFooter>
      </form>
    </Card>

    <Separator />

    <section class="flex flex-col gap-3">
      <h2 class="text-sm font-medium">账号</h2>
      <Table>
        <TableCaption>示例数据，用来检查排版，不是接口返回。</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>账号</TableHead>
            <TableHead>昵称</TableHead>
            <TableHead>角色</TableHead>
            <TableHead>状态</TableHead>
            <TableHead>备注</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>admin</TableCell>
            <TableCell>系统管理员</TableCell>
            <TableCell>管理员</TableCell>
            <TableCell>
              <Badge>启用</Badge>
            </TableCell>
            <TableCell>日常维护</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>night-ops</TableCell>
            <TableCell>夜间巡检</TableCell>
            <TableCell>运维</TableCell>
            <TableCell>
              <Badge variant="secondary">停用</Badge>
            </TableCell>
            <TableCell class="max-w-xs whitespace-normal">{{ longRemark }}</TableCell>
          </TableRow>
        </TableBody>
      </Table>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>账号</TableHead>
            <TableHead>昵称</TableHead>
            <TableHead>角色</TableHead>
            <TableHead>状态</TableHead>
            <TableHead>备注</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableEmpty :colspan="5">
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <UsersIcon />
                </EmptyMedia>
                <EmptyTitle>还没有待审核的账号</EmptyTitle>
                <EmptyDescription>新建账号后，待审核记录会出现在这里。</EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button variant="outline" @click="editorOpen = true">新建账号</Button>
              </EmptyContent>
            </Empty>
          </TableEmpty>
        </TableBody>
      </Table>
    </section>

    <Separator />

    <section class="flex max-w-prose flex-col gap-3">
      <h2 class="text-sm font-medium">反馈</h2>
      <Alert variant="destructive">
        <OctagonXIcon />
        <AlertTitle>没能停用这个账号</AlertTitle>
        <AlertDescription>刷新页面后再试一次。已经启用的角色不会被这次失败改掉。</AlertDescription>
      </Alert>
      <div class="flex flex-wrap gap-2">
        <Button variant="outline" @click="showSaved">显示保存结果</Button>
      </div>
      <div class="flex flex-col gap-2" aria-hidden="true">
        <Skeleton class="h-4 w-40" />
        <Skeleton class="h-4 w-full" />
        <Skeleton class="h-4 w-2/3" />
      </div>
    </section>

    <Separator />

    <section class="flex flex-col gap-3">
      <h2 class="text-sm font-medium">弹窗</h2>
      <div class="flex flex-wrap gap-2">
        <Button variant="outline" @click="editorOpen = true">编辑账号</Button>
      </div>
      <Dialog v-model:open="editorOpen">
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑账号</DialogTitle>
            <DialogDescription>{{ longRemark }}</DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel for="editor-nickname">昵称</FieldLabel>
            <Input id="editor-nickname" v-model="nickname" autocomplete="off" />
          </Field>
          <DialogFooter>
            <DialogClose as-child>
              <Button variant="outline">取消</Button>
            </DialogClose>
            <Button @click="showSaved">保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog v-model:open="confirmOpen">
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>停用这个账号？</AlertDialogTitle>
            <AlertDialogDescription>
              停用后不能登录。角色会保留，重新启用后恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction variant="destructive">停用</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  </main>
</template>
