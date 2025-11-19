<template>
  <ul class="w-16 flex flex-col bg-cc-surface border-r border-cc-border h-full py-2 gap-1">
    <li
      v-for="(item, index) of showMenuData" :key="item.key"
      class="w-full flex flex-col items-center justify-center py-3 cursor-pointer transition-colors duration-200 group relative"
      :class="item.active ? 'text-cc-primary' : 'text-cc-text-sub hover:text-white hover:bg-white/5'"
      @click="activeChangeHandler(index)"
    >
      <!-- Active Indicator Line -->
      <div v-if="item.active" class="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-cc-primary rounded-r"></div>

      <ElIcon
        :size="22"
        class="mb-1"
      >
        <component :is="item.icon" />
      </ElIcon>
      <span
        class="select-none text-[10px] font-medium scale-90"
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