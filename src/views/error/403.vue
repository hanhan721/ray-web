<template>
  <div class="forbidden-page">
    <div class="error-content">
      <div class="error-icon">
        <NIcon :size="120" color="#e88080">
          <LockClosedOutline />
        </NIcon>
      </div>
      <h1 class="error-code">
        403
      </h1>
      <p class="error-title">
        访问被拒绝
      </p>
      <p class="error-desc">
        抱歉，您没有权限访问此页面
      </p>
      <NSpace class="error-actions">
        <NButton @click="goBack">
          <template #icon>
            <NIcon>
              <ArrowBackOutline />
            </NIcon>
          </template>
          返回上页
        </NButton>
        <NButton type="primary" @click="goHome">
          <template #icon>
            <NIcon>
              <HomeOutline />
            </NIcon>
          </template>
          返回首页
        </NButton>
      </NSpace>
    </div>
  </div>
</template>

<script setup lang="ts">
import { LockClosedOutline, ArrowBackOutline, HomeOutline } from '@vicons/ionicons5'

defineOptions({
  name: 'ForbiddenPage',
})

const router = useRouter()

function goHome() {
  router.push('/')
}

function goBack() {
  router.back()
}
</script>

<style scoped lang="scss">
.forbidden-page {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}

.error-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: $spacing-xl;
}

.error-icon {
  margin-bottom: $spacing-md;
  animation: shake 0.5s ease-in-out;
}

@keyframes shake {
  0%,
  100% {
    transform: translateX(0);
  }

  10%,
  30%,
  50%,
  70%,
  90% {
    transform: translateX(-5px);
  }

  20%,
  40%,
  60%,
  80% {
    transform: translateX(5px);
  }
}

.error-code {
  font-size: 120px;
  font-weight: 700;
  margin: 0;
  background: linear-gradient(135deg, #e88080 0%, #d03050 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  line-height: 1;
}

.error-title {
  font-size: 24px;
  font-weight: 500;
  color: $text-color-primary;
  margin: $spacing-md 0 $spacing-sm;
}

.error-desc {
  font-size: $font-size-md;
  color: $text-color-secondary;
  margin: 0 0 $spacing-xl;
}

.error-actions {
  margin-top: $spacing-md;
}
</style>
