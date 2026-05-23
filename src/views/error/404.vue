<script setup lang="ts">
defineOptions({
  name: 'NotFoundPage',
})

const router = useRouter()

function goHome() {
  router.push('/')
}
</script>

<template>
  <div class="not-found-page">
    <h1>404</h1>
    <p>页面不存在</p>
    <button @click="goHome">
      返回首页
    </button>
  </div>
</template>

<style scoped lang="scss">
.not-found-page {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100vh;
  gap: 16px;

  h1 {
    font-size: 72px;
    color: #999;
  }

  button {
    padding: 8px 16px;
    cursor: pointer;
  }
}
</style>
