<template>
  <ul class="w-16 flex flex-col bg-cc-surface border-r border-cc-border h-full py-2 gap-2">
    <li
      v-for="(item, index) of showMenuData" :key="item.key"
      class="w-12 mx-auto flex flex-col items-center justify-center py-3 rounded-lg cursor-pointer transition-all duration-200 hover:bg-cc-surface-light group"
      :class="item.active ? 'bg-cc-surface-light text-cc-primary' : 'text-cc-text-sub'"
      @click="activeChangeHandler(index)"
    >
      <ElIcon
        :size="20"
        class="transition-colors duration-200"
        :class="item.active ? 'text-cc-primary' : 'text-cc-text-sub group-hover:text-cc-text-main'"
      >
        <component :is="item.icon" />
      </ElIcon>
      <span
        class="mt-1 select-none text-[10px] font-medium"
        :class="item.active ? 'text-cc-primary' : 'text-cc-text-sub group-hover:text-cc-text-main'"
      >{{ item.title }}</span>
    </li>
  </ul>
</template>

<script setup lang="ts">
  import { ref, computed } from 'vue';
  import { menuData } from '@/data/baseMenu';
  import type { MenuItem } from '@/data/baseMenu';
  import { usePageState } from '@/stores/pageState';
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

  const activeIndex = ref(props.activeIndex);
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