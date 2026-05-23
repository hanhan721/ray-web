<template>
  <div class="login-container">
    <!-- 粒子背景 -->
    <vue-particles
      id="tsparticles"
      class="particles-bg"
      :options="particlesOptions"
    />

    <!-- 登录卡片 -->
    <n-card class="login-card" :bordered="false">
      <!-- Logo -->
      <div class="logo-wrapper">
        <div class="logo">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M12 2L2 7L12 12L22 7L12 2Z"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M2 17L12 22L22 17"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M2 12L12 17L22 12"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </div>
      </div>

      <!-- 标题 -->
      <div class="form-header">
        <h1>Ray Admin</h1>
        <p>现代化企业级后台管理系统</p>
      </div>

      <!-- 登录表单 -->
      <n-form
        ref="formRef"
        :model="formData"
        :rules="rules"
        size="large"
        class="login-form"
      >
        <n-form-item path="username" :show-label="false">
          <n-input
            v-model:value="formData.username"
            placeholder="请输入用户名"
            :input-props="{ autocomplete: 'username' }"
          >
            <template #prefix>
              <n-icon :component="PersonOutline" class="input-icon" />
            </template>
          </n-input>
        </n-form-item>

        <n-form-item path="password" :show-label="false">
          <n-input
            v-model:value="formData.password"
            :type="showPassword ? 'text' : 'password'"
            placeholder="请输入密码"
            :input-props="{ autocomplete: 'current-password' }"
            @keyup.enter="handleLogin"
          >
            <template #prefix>
              <n-icon :component="LockClosedOutline" class="input-icon" />
            </template>
            <template #suffix>
              <n-icon
                :component="showPassword ? EyeOutline : EyeOffOutline"
                class="password-toggle"
                @click="showPassword = !showPassword"
              />
            </template>
          </n-input>
        </n-form-item>

        <div class="form-options">
          <n-checkbox v-model:checked="formData.remember">
            记住我
          </n-checkbox>
        </div>

        <n-button
          type="primary"
          block
          :loading="loading"
          :disabled="loading"
          class="login-button"
          @click="handleLogin"
        >
          {{ loading ? '登录中...' : '登 录' }}
        </n-button>
      </n-form>

      <n-divider>
        <span class="divider-text">演示账号</span>
      </n-divider>

      <div class="demo-account">
        <n-tag type="info" :bordered="false">
          admin / 123456
        </n-tag>
      </div>

      <div class="form-footer">
        <p>&copy; 2024 Ray Admin. All rights reserved.</p>
      </div>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { useUserStore } from '@/stores/user'
import { useAppStore } from '@/stores/app'
import {
  PersonOutline,
  LockClosedOutline,
  EyeOutline,
  EyeOffOutline,
} from '@vicons/ionicons5'
import type { FormInst, FormRules } from 'naive-ui'

defineOptions({
  name: 'LoginPage',
})

const router = useRouter()
const userStore = useUserStore()
const appStore = useAppStore()
const message = useMessage()

// 表单引用
const formRef = ref<FormInst | null>(null)

// 表单数据
const formData = reactive({
  username: 'admin',
  password: '123456',
  remember: true,
})

// 状态
const loading = ref(false)
const showPassword = ref(false)

// 表单验证规则
const rules: FormRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: ['input', 'blur'] },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: ['input', 'blur'] },
    { min: 6, message: '密码长度不能少于6位', trigger: ['input', 'blur'] },
  ],
}

// 粒子颜色跟随主题
const particleColor = computed(() => (appStore.isDarkMode ? 'rgba(255, 255, 255, 0.6)' : '#1890ff'))
const particleLinkOpacity = computed(() => (appStore.isDarkMode ? 0.15 : 0.3))

// 粒子配置
const particlesOptions = computed(() => ({
  background: {
    color: {
      value: 'transparent',
    },
  },
  fpsLimit: 60,
  interactivity: {
    events: {
      onClick: {
        enable: true,
        mode: 'push',
      },
      onHover: {
        enable: true,
        mode: 'grab',
      },
    },
    modes: {
      push: {
        quantity: 4,
      },
      grab: {
        distance: 140,
        links: {
          opacity: 0.5,
        },
      },
    },
  },
  particles: {
    color: {
      value: particleColor.value,
    },
    links: {
      color: particleColor.value,
      distance: 150,
      enable: true,
      opacity: particleLinkOpacity.value,
      width: 1,
    },
    move: {
      direction: 'none' as const,
      enable: true,
      outModes: {
        default: 'bounce' as const,
      },
      random: false,
      speed: 1.5,
      straight: false,
    },
    number: {
      density: {
        enable: true,
        area: 800,
      },
      value: 60,
    },
    opacity: {
      value: 0.4,
    },
    shape: {
      type: 'circle',
    },
    size: {
      value: { min: 1, max: 3 },
    },
  },
  detectRetina: true,
}))

// 登录处理
async function handleLogin() {
  try {
    await formRef.value?.validate()
  } catch {
    return
  }

  loading.value = true

  try {
    await userStore.login(formData.username, formData.password)

    // 记住用户名
    if (formData.remember) {
      localStorage.setItem('rememberedUsername', formData.username)
    } else {
      localStorage.removeItem('rememberedUsername')
    }

    message.success('登录成功')
    router.push('/dashboard')
  } finally {
    loading.value = false
  }
}

// 初始化记住的用户名
const rememberedUsername = localStorage.getItem('rememberedUsername')
if (rememberedUsername) {
  formData.username = rememberedUsername
}
</script>

<style scoped lang="scss">
.login-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 24px;
  background: linear-gradient(135deg, #f0f4f8 0%, #e8eef5 100%);
  position: relative;
  overflow: hidden;
  transition: background var(--transition-duration) var(--transition-timing);

  [data-theme='dark'] & {
    background: linear-gradient(135deg, #0a0a0f 0%, #111827 100%);
  }
}

// 粒子背景
.particles-bg {
  position: absolute;
  inset: 0;
  z-index: 0;
}

// 登录卡片
.login-card {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 420px;
  border-radius: 20px;
  box-shadow: var(--box-shadow-md);
  backdrop-filter: blur(10px);
  background: rgba(255, 255, 255, 0.95) !important;
  transition: background var(--transition-duration) var(--transition-timing),
    box-shadow var(--transition-duration) var(--transition-timing);

  [data-theme='dark'] & {
    background: rgba(31, 31, 31, 0.9) !important;
  }

  :deep(.n-card__content) {
    padding: 48px 40px;
  }
}

// Logo
.logo-wrapper {
  display: flex;
  justify-content: center;
  margin-bottom: 24px;
}

.logo {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  background: linear-gradient(135deg, var(--primary-color) 0%, #36cfc9 100%);
  border-radius: 16px;
  color: white;
  box-shadow: 0 8px 20px rgba(24, 144, 255, 0.3);

  svg {
    width: 36px;
    height: 36px;
  }
}

// 标题
.form-header {
  text-align: center;
  margin-bottom: 36px;

  h1 {
    font-size: 28px;
    font-weight: 600;
    color: var(--text-color-primary);
    margin: 0 0 8px;
    letter-spacing: -0.5px;
  }

  p {
    font-size: 14px;
    color: var(--text-color-secondary);
    margin: 0;
  }
}

// 表单样式
.login-form {
  :deep(.n-input) {
    --n-height: 48px !important;
    --n-border-radius: 10px !important;
  }

  :deep(.n-form-item) {
    --n-blank-height: 8px;
  }

  :deep(.n-form-item-feedback-wrapper) {
    min-height: 20px;
  }
}

.input-icon {
  color: var(--text-color-disabled);
  font-size: 18px;
}

.password-toggle {
  color: var(--text-color-disabled);
  cursor: pointer;
  transition: color 0.2s;

  &:hover {
    color: var(--primary-color);
  }
}

.form-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.login-button {
  height: 48px !important;
  border-radius: 10px !important;
  font-size: 16px !important;
  font-weight: 500 !important;
  background: linear-gradient(135deg, var(--primary-color) 0%, #36cfc9 100%) !important;
  border: none !important;
  transition: transform 0.2s, box-shadow 0.2s, opacity 0.2s !important;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(24, 144, 255, 0.35);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.7;
  }
}

:deep(.n-divider) {
  margin: 28px 0 20px;

  .n-divider__line {
    background: var(--border-color-light);
  }
}

.divider-text {
  font-size: 13px;
  color: var(--text-color-disabled);
}

.demo-account {
  display: flex;
  justify-content: center;
  margin-bottom: 24px;

  :deep(.n-tag) {
    --n-height: 30px;
    --n-border-radius: 6px;
    --n-font-size: 13px;
    font-family: 'SF Mono', 'Monaco', 'Menlo', monospace;
    letter-spacing: 0.5px;
  }
}

.form-footer {
  text-align: center;

  p {
    font-size: 12px;
    color: var(--text-color-disabled);
    margin: 0;
  }
}

// 响应式
@media (max-width: 480px) {
  .login-card {
    :deep(.n-card__content) {
      padding: 36px 24px;
    }
  }

  .logo {
    width: 56px;
    height: 56px;

    svg {
      width: 32px;
      height: 32px;
    }
  }

  .form-header h1 {
    font-size: 24px;
  }
}
</style>
