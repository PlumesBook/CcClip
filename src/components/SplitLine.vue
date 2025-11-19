<template>
  <div
    class="flex absolute justify-center items-center group"
    :class="[
        disabled ? 'cursor-no-drop' : isVertical ? 'cursor-c-resize' : 'cursor-r-resize',
        isVertical ? 'w-2 h-full flex-col' : 'h-2 w-full flex-row'
    ]"
    ref="lineElement"
    @mousedown="mouseDownHandler"
  >
      <span
        class="absolute flex z-10 bg-cc-surface border border-cc-border rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
        :class="isVertical ? 'h-8 w-4 flex-col justify-center items-center' : 'w-8 h-4 flex-row justify-center items-center'"
      >
        <el-icon :class="isVertical ? 'rotate-90' : ''" :color="iconColor" :size="12">
          <MoreFilled />
        </el-icon>
      </span>
    <i class="block bg-transparent group-hover:bg-cc-primary transition-colors delay-100" :class="isVertical ? 'w-px h-full' : 'w-full h-px'" />
  </div>
</template>

<script setup lang="ts">
  import { MoreFilled } from '@element-plus/icons-vue';
  import { usePageState } from '@/stores/pageState';
  import { computed, ref } from 'vue';

  const props = defineProps({
    disabled: {
      type: Boolean,
      default: false
    },
    newWidth: {
      type: Number,
      default: 0
    },
    newHeight: {
      type: Number,
      default: 0
    },
    direction: {
      type: String,
      default: 'horizontal'
    },
    limitSize: {
      type: Object,
      default() {
        return {
          minHeight: 0,
          maxHeight: 999999,
          minWidth: 0,
          maxWidth: 999999
        };
      }
    }
  });

  const emit = defineEmits({
    // 校验事件
    'update:newWidth': val => {
      return val !== null;
    },
    'update:newHeight': val => {
      return val !== null;
    }
  });

  const newWidthValue = computed({
    get() {
      return props.newWidth;
    },
    set(newValue) {
      emit('update:newWidth', newValue);
    }
  });
  const newHeightValue = computed({
    get() {
      return props.newHeight;
    },
    set(newValue) {
      emit('update:newHeight', newValue);
    }
  });

  const lineElement = ref();
  const store = usePageState();
  const isVertical = computed(() => props.direction === 'vertical');
  const iconColor = computed(() => {
    return store.isDark ? '#E5E7EB' : '#1F2937';
  });
  // 定位数据缓存
  const positionState = {
    left: 0,
    top: 0
  };

  let enableMove = false;

  function mouseDownHandler() {
    if (props.disabled) {
      return;
    }
    const { left, top } = lineElement.value.getBoundingClientRect();
    positionState.left = parseInt(left);
    positionState.top = parseInt(top);
    enableMove = true;

    document.onmousemove = documentEvent => {
      if (!enableMove) return;
      const { pageX, pageY } = documentEvent;
      const { top: oldTop, left: oldLeft } = positionState;
      const { minHeight, maxHeight, minWidth, maxWidth } = props.limitSize;
      const offsetX = pageX - oldLeft;
      const offsetY = pageY - oldTop;
      positionState.left = pageX;
      positionState.top = pageY;
      if (isVertical.value) {
        const newWidth = newWidthValue.value - offsetX;
        newWidthValue.value = newWidth > maxWidth ? maxWidth : newWidth < minWidth ? minWidth : newWidth;
      } else {
        const newHeight = newHeightValue.value - offsetY;
        newHeightValue.value = newHeight > maxHeight ? maxHeight : newHeight < minHeight ? minHeight : newHeight;
      }
    };

    document.onmouseup = () => {
      enableMove = false;
      document.onmouseup = null;
      document.onmousemove = null;
    };
  }
</script>