<template>
  <div class="flex flex-col w-16 h-full border-r dark:border-gray-600 border-gray-300 bg-gray-50 dark:bg-gray-800">
    <!-- Logo Area -->
    <div class="h-12 flex items-center justify-center border-b dark:border-gray-600 border-gray-300">
      <img class="h-6 w-6" :src="logoImage" alt="Logo">
    </div>

    <ul class="flex-1 flex flex-col w-full">
      <li v-for="(item, index) of showMenuData" :key="item.key"
        class="w-full flex flex-col items-center pt-2 pb-2 hover:border-indigo-400 hover:dark:bg-gray-700 hover:bg-gray-200 focus:outline-none cursor-pointer"
        :class="item.active ? 'border-b-2 dark:bg-gray-700 bg-gray-100 border-indigo-400' : 'border-b dark:bg-gray-800 bg-gray-50 dark:border-gray-600 border-gray-200'"
        @click="activeChangeHandler(index)">
        <ElIcon :size="item.active ? defaultSize + 2 : defaultSize" :color="item.active ? activeColor : baseColor"
          class="flex-auto">
          <component :is="item.icon" />
        </ElIcon>
        <span class="mt-0.5 select-none"
          :class="item.active ? 'text-sm dark:text-gray-50 text-gray-800' : 'text-xs dark:text-gray-300 text-gray-500'">{{
            item.title }}</span>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { menuData } from '@/data/baseMenu';
import type { MenuItem } from '@/data/baseMenu';
import { usePageState } from '@/stores/pageState';
import logoImage from '@/assets/ccLogo.png';
const props = defineProps({
  activeIndex: {
    type: Number,
    default: 0
  },
  defaultSize: {
    type: Number,
    default: 18
  }
});
const emit = defineEmits({
  // 校验事件
  activeChange(activeItem: MenuItem) {
    return activeItem.title && activeItem.key;
  }
});
const store = usePageState();
const baseColor = computed(() => {
  return store.isDark ? '#D1D5DB' : '#6B7280';
});
const activeColor = computed(() => {
  return store.isDark ? '#F9FAFB' : '#1F2937';
});
const activeIndex = ref(props.activeIndex);
const defaultSize = ref(props.defaultSize);
const showMenuData = computed(() => {
  return menuData.map((item, index) => {
    item.active = index === activeIndex.value;
    return item;
  });
});

function activeChangeHandler(index: number) {
  if (store.hideSubMenu) {
    store.hideSubMenu = false;
  } else if (index === activeIndex.value) {
    store.hideSubMenu = true;
  }
  activeIndex.value = index;
  emit('activeChange', menuData[activeIndex.value]);
}
</script>