<script setup lang="ts">
import { onMounted, shallowRef, useTemplateRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import ThemeToggle from '@/components/ThemeToggle.vue'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { readRedirect } from '@/router/guard'
import { useSessionStore } from '@/stores/session'

const route = useRoute()
const router = useRouter()
const session = useSessionStore()
const username = shallowRef('')
const password = shallowRef('')
const formError = shallowRef('')
const submitting = shallowRef(false)
const account = useTemplateRef<{ $el?: unknown }>('account')

onMounted(() => {
  const element = account.value?.$el
  if (element instanceof HTMLInputElement) element.focus()
})

async function onSubmit() {
  formError.value = ''
  const accountName = username.value.trim()
  if (!accountName || !password.value) {
    formError.value = '请填写账号和密码'
    return
  }
  submitting.value = true
  try {
    const signedIn = await session.login(accountName, password.value)
    if (!signedIn) return
    await router.replace(readRedirect(route.query.redirect) ?? session.entryPath)
  } catch {
    formError.value = '登录失败，请检查提示后重试'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="grid min-h-svh md:grid-cols-[minmax(0,1.1fr)_minmax(20rem,26rem)]">
    <section
      class="bg-sidebar border-border hidden flex-col justify-between border-r px-10 py-12 md:flex"
    >
      <p class="text-sm font-medium">Ray</p>
      <div class="max-w-md">
        <p class="text-3xl leading-tight font-medium">账号、权限和任务都从这里进入。</p>
        <p class="text-muted-foreground mt-4 text-sm leading-6">
          登录后按你的菜单继续处理用户、部门和定时任务。这个页面不会记住密码。
        </p>
      </div>
      <p class="text-muted-foreground text-sm">管理后台</p>
    </section>
    <section class="relative flex items-center px-6 py-12">
      <div class="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <form class="w-full max-w-sm" novalidate @submit.prevent="onSubmit">
        <h1 class="text-xl font-medium">登录</h1>
        <p class="text-muted-foreground mt-2 text-sm md:hidden">
          登录后继续处理当前账号能看到的菜单。
        </p>
        <FieldGroup class="mt-6">
          <Field :data-invalid="formError ? true : undefined">
            <FieldLabel for="login-account" required>账号</FieldLabel>
            <Input
              id="login-account"
              ref="account"
              v-model="username"
              name="username"
              autocomplete="username"
              autocapitalize="off"
              spellcheck="false"
              required
              :disabled="submitting"
              :aria-invalid="formError ? true : undefined"
              :aria-describedby="formError ? 'login-error' : undefined"
            />
          </Field>
          <Field :data-invalid="formError ? true : undefined">
            <FieldLabel for="login-password" required>密码</FieldLabel>
            <Input
              id="login-password"
              v-model="password"
              name="password"
              type="password"
              autocomplete="current-password"
              required
              :disabled="submitting"
              :aria-invalid="formError ? true : undefined"
              :aria-describedby="formError ? 'login-error' : undefined"
            />
          </Field>
        </FieldGroup>
        <Alert v-if="formError" id="login-error" class="mt-4" variant="destructive" role="alert">
          <AlertDescription>{{ formError }}</AlertDescription>
        </Alert>
        <Button class="mt-4 w-full" type="submit" :disabled="submitting" :aria-busy="submitting">
          <Spinner v-if="submitting" />
          {{ submitting ? '正在登录' : '登录' }}
        </Button>
      </form>
    </section>
  </div>
</template>
