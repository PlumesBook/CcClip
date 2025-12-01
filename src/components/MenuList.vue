<template>
  <div class="cc-menu-sidebar">
    <!-- Logo Area -->
    <div class="cc-logo">
      <svg width="28" height="22" viewBox="0 0 26 20" preserveAspectRatio="xMidYMid meet" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M25.73 4.15V.18l-4.77 2.507v-.15C20.959.955 19.823 0 18.18 0H3.046C1.314 0 .27.955.27 2.537v4.009l6.687 3.455L.27 13.493v4C.269 19.045 1.32 20 3.046 20h15.132c1.642 0 2.777-.955 2.777-2.507v-.209l4.776 2.537v-4.03l-11.104-5.79L25.73 4.15Zm-14.954 7.822 8.209 4.297H2.539l8.237-4.297Zm8.149-8.24-8.149 4.27-8.237-4.27h16.386Z" fill="currentColor"/>
      </svg>
    </div>

    <!-- Menu Items -->
    <nav class="cc-menu-nav">
      <div 
        v-for="(item, index) of showMenuData" 
        :key="item.key" 
        class="cc-menu-item" 
        :class="{ 'is-active': item.active }"
        @click="activeChangeHandler(index)"
      >
        <div class="cc-menu-icon">
          <component :is="getIcon(item.icon)" />
        </div>
        <span class="cc-menu-label">{{ item.title }}</span>
      </div>
    </nav>

    <!-- Bottom Actions -->
    <div class="cc-menu-footer">
      <div class="cc-menu-action">
        <ElIcon :size="20"><Monitor /></ElIcon>
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
.cc-menu-sidebar {
  display: flex;
  flex-direction: column;
  width: 72px;
  height: 100%;
  background-color: #0d0d0d;
  user-select: none;
}

.cc-logo {
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  flex-shrink: 0;

  svg {
    width: 28px;
    height: 22px;
  }
}

.cc-menu-nav {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 4px 8px;
  gap: 2px;
  overflow-y: auto;
  overflow-x: hidden;

  &::-webkit-scrollbar {
    width: 0;
    height: 0;
  }
}

.cc-menu-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.15s ease;
  flex-shrink: 0;

  .cc-menu-icon {
    font-size: 20px;
    line-height: 1;
    margin-bottom: 4px;
    color: #8a8a8a;
    transition: color 0.15s ease;

    :deep(svg) {
      width: 20px;
      height: 20px;
    }
  }

  .cc-menu-label {
    font-size: 11px;
    font-weight: 400;
    line-height: 1.2;
    color: #8a8a8a;
    transition: color 0.15s ease;
    white-space: nowrap;
  }

  &:hover {
    background-color: rgba(255, 255, 255, 0.06);

    .cc-menu-icon,
    .cc-menu-label {
      color: #c0c0c0;
    }
  }

  &.is-active {
    background-color: #00B5FF;

    .cc-menu-icon,
    .cc-menu-label {
      color: #ffffff;
    }

    &:hover {
      background-color: #00a3e6;
    }
  }
}

.cc-menu-footer {
  padding: 12px 0 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.cc-menu-action {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #8a8a8a;
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.15s ease;

  &:hover {
    background-color: rgba(255, 255, 255, 0.06);
    color: #c0c0c0;
  }
}
</style>