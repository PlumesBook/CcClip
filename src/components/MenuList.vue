<template>
  <div class="menu-list-container">
    <!-- Logo Area -->
    <div class="logo-area">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M6 6C6 4.89543 6.89543 4 8 4H12C14.2091 4 16 5.79086 16 8V16C16 18.2091 14.2091 20 12 20H8C6.89543 20 6 19.1046 6 18V6Z"
          stroke="white" stroke-width="2" />
        <path d="M8 8L16 16" stroke="white" stroke-width="2" stroke-linecap="round" />
        <path d="M16 8L8 16" stroke="white" stroke-width="2" stroke-linecap="round" />
      </svg>
    </div>

    <!-- Menu Items -->
    <ul class="menu-items">
      <li v-for="(item, index) of showMenuData" :key="item.key" class="menu-item" :class="{ 'active': item.active }"
        @click="activeChangeHandler(index)">

        <div class="icon-wrapper">
          <component :is="getIcon(item.icon)" />
        </div>
        <span class="menu-title">{{ item.title }}</span>
      </li>
    </ul>

    <!-- Bottom Actions (Keyboard Shortcuts, etc.) -->
    <div class="bottom-actions">
      <div class="action-item">
        <ElIcon :size="20">
          <Monitor />
        </ElIcon>
      </div>
      <div class="action-item">
        <ElIcon :size="20">
          <Monitor />
        </ElIcon>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { menuData } from '@/data/baseMenu';
import type { MenuItem } from '@/data/baseMenu';
import { usePageState } from '@/stores/pageState';
import {
  VideoPlay, Microphone, Document, Picture, MagicStick,
  Connection, Filter, Monitor, Files, Grid, Reading
} from '@element-plus/icons-vue';

// Map string icon names to actual components
const iconMap: Record<string, any> = {
  'VideoIcon': VideoPlay,
  'AudioIcon': Microphone,
  'TextIcon': Document,
  'ImageIcon': Picture,
  'EffectsIcon': MagicStick,
  'TransitionIcon': Connection,
  'FilterIcon': Filter
};

const props = defineProps({
  activeIndex: {
    type: Number,
    default: 0
  }
});
const emit = defineEmits({
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

function getIcon(iconName: string) {
  return iconMap[iconName] || VideoPlay;
}

function activeChangeHandler(index: number) {
  if (index === activeIndex.value) {
    store.hideSubMenu = !store.hideSubMenu;
  } else {
    store.hideSubMenu = false;
    activeIndex.value = index;
    emit('activeChange', menuData[activeIndex.value]);
  }
}
</script>

<style lang="scss" scoped>
.menu-list-container {
  display: flex;
  flex-direction: column;
  width: 68px; // CapCut sidebar width
  height: 100%;
  background-color: #060708; // Deep Black
  color: #8e8e8e;
  user-select: none;
  border-right: 1px solid #1a1a1a; // Subtle border if needed, or remove
}

.logo-area {
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;

  svg {
    opacity: 0.9;
  }
}

.menu-items {
  flex: 1;
  display: flex;
  flex-direction: column;
  width: 100%;
  padding: 0 8px;
  gap: 4px;
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 0;
    background: transparent;
  }
}

.menu-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 64px; // Taller touch target
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;

  .icon-wrapper {
    font-size: 20px;
    margin-bottom: 4px;
    color: #8e8e8e;
    transition: color 0.2s ease;
  }

  .menu-title {
    font-size: 10px;
    font-weight: 500;
    color: #8e8e8e;
    transition: color 0.2s ease;
  }

  &:hover {
    background-color: rgba(255, 255, 255, 0.08);

    .icon-wrapper,
    .menu-title {
      color: #d0d0d0;
    }
  }

  &.active {
    background-color: #252627; // Active background

    .icon-wrapper {
      color: #ffffff;
    }

    .menu-title {
      color: #ffffff;
    }
  }
}

.bottom-actions {
  padding: 16px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;

  .action-item {
    color: #8e8e8e;
    cursor: pointer;
    transition: color 0.2s;

    &:hover {
      color: #ffffff;
    }
  }
}
</style>