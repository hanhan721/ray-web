<script setup lang="ts">
import { shallowRef } from 'vue'
import { useSessionStore } from '@/stores/session'
import UserEditor from '@/views/system/user/UserEditor.vue'
import ParamList from '@/views/system/param/index.vue'
import DeptEditor from '@/views/system/dept/DeptEditor.vue'

const session = useSessionStore()
session.profile = {
  userId: 1,
  username: 'test',
  nickname: 'Test',
  roles: [],
  menus: [],
  avatarFileId: null,
  permissions: ['system:param:add', 'system:param:query', 'system:param:edit'],
}
const userOpen = shallowRef(false)
const deptOpen = shallowRef(false)
const dept = {
  id: 10,
  parentId: 1,
  deptName: 'Test department',
  depth: 1,
  sort: 0,
  enabled: true,
  leader: '',
  phone: '',
  email: '',
  remark: '',
}
</script>

<template>
  <main class="flex flex-col gap-5 p-8">
    <button @click="userOpen = true">Edit user</button>
    <button @click="deptOpen = true">Edit department</button>
    <UserEditor v-model:open="userOpen" :user-id="10" can-assign-roles can-assign-depts />
    <DeptEditor
      v-model:open="deptOpen"
      :dept="dept"
      :rows="[{ ...dept, id: 1, parentId: 0, deptName: 'Parent', depth: 0 }, dept]"
    />
    <ParamList />
  </main>
</template>
