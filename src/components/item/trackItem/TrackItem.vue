<template>
  <div
      class="text-left text-sm top-0 absolute "
      :class="[TrackHeightMap.get(props.trackItem.type), isDragState ? 'opacity-30' : '']"
      :style="itemClass"
      @click="setSelectTract"
      @contextmenu.prevent.stop="handleContextMenu"
  >
    <!-- 操作手柄 -->
    <TrackHandler 
      :isActive="isActive" 
      :lineIndex="lineIndex" 
      :itemIndex="itemIndex" 
      @contextmenu.prevent.stop="handleContextMenu"
    />
    <!-- 容器 -->
    <component
        :is="componentMap.get(trackItem.type)"
        :trackItem="trackItem"
        @contextmenu.prevent.stop="handleContextMenu"
    />
    <!-- 右键菜单 -->
    <div
      v-if="showMenu"
      class="fixed z-50 bg-white dark:bg-gray-800 border dark:border-gray-600 border-gray-200 rounded shadow-lg py-1 text-xs w-32"
      :style="{ left: `${menuPos.x}px`, top: `${menuPos.y}px` }"
      @click.stop
    >
      <template v-if="canReplace">
        <div
          class="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer flex justify-between items-center"
          @click="handleReplaceClick"
        >
          <span>本地替换</span>
          <el-icon><FolderOpened /></el-icon>
        </div>
        <div
          class="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer flex justify-between items-center"
          @click="openResourceDialog"
        >
          <span>素材库替换</span>
          <el-icon><Box /></el-icon>
        </div>
        <div
          class="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer flex justify-between items-center opacity-50 cursor-not-allowed"
          title="开发中"
        >
          <span>AI 生成</span>
          <el-icon><MagicStick /></el-icon>
        </div>
        <div class="h-[1px] bg-gray-200 dark:bg-gray-700 my-1"></div>
      </template>
      
      <div
          class="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-red-500 flex justify-between items-center"
          @click="handleDelete"
      >
        <span>删除</span>
        <el-icon><Delete /></el-icon>
      </div>
    </div>
    
    <!-- 资源选择弹窗 -->
    <ResourceSelectDialog
      v-if="canReplace"
      v-model="showResourceDialog"
      :resource-type="trackItem.type"
      @select="handleResourceSelect"
    />

    <!-- 隐藏的文件输入框 -->
    <input
      ref="fileInput"
      type="file"
      class="hidden"
      :accept="acceptType"
      @click.stop
      @change="handleFileChange"
    />
  </div>
</template>

<script setup lang="ts">
  import { FolderOpened, Box, MagicStick, Delete } from '@element-plus/icons-vue';
  import TrackHandler from '@/components/item/trackItem/TrackHandler.vue';
  import VideoItem from '@/components/item/trackItem/template/VideoItem.vue';
  import AudioItem from '@/components/item/trackItem/template/AudioItem.vue';
  import TextItem from '@/components/item/trackItem/template/TextItem.vue';
  import ImageItem from '@/components/item/trackItem/template/ImageItem.vue';
  import EffectItem from '@/components/item/trackItem/template/EffectItem.vue';
  import TransitionItem from '@/components/item/trackItem/template/TransitionItem.vue';
  import FilterItem from '@/components/item/trackItem/template/FilterItem.vue';
  import { TrackHeightMap } from '@/data/trackConfig';
  import { useTrackState } from '@/stores/trackState';
  import { computed, ref, inject, onMounted, onUnmounted } from 'vue';
  import { createVideoResourceFromFile, createImageResourceFromFile } from '@/utils/fileResourceUtils';
  import { saveUploadResource } from '@/utils/uploadStore';
  import type FFManager from '@/utils/ffmpegManager';
  import ResourceSelectDialog from '@/components/dialog/ResourceSelectDialog.vue';

  const props = defineProps({
    trackType: {
      type: String,
      default: ''
    },
    lineIndex: {
      type: Number,
      default: 0
    },
    itemIndex: {
      type: Number,
      default: 0
    },
    trackItem: {
      type: Object,
      default() {
        return {
          width: '0px',
          left: '0px'
        };
      }
    }
  });
  const store = useTrackState();
  const ffmpeg = inject('ffmpeg') as FFManager;
  const itemClass = computed(() => {
    return {
      width: props.trackItem.showWidth,
      left: props.trackItem.showLeft
    };
  });
  const isActive = computed(() => {
    return store.selectTrackItem.line === props.lineIndex && store.selectTrackItem.index === props.itemIndex;
  });
  const componentMap = new Map([
    ['video', VideoItem],
    ['audio', AudioItem],
    ['text', TextItem],
    ['image', ImageItem],
    ['effect', EffectItem],
    ['transition', TransitionItem],
    ['filter', FilterItem]
  ]);
  const isDragState = computed(() => {
    return store.moveTrackData.lineIndex === props.lineIndex && store.moveTrackData.itemIndex === props.itemIndex;
  });
  function setSelectTract(event:Event) {
    event.preventDefault();
    event.stopPropagation();
    store.selectTrackItem.line = props.lineIndex;
    store.selectTrackItem.index = props.itemIndex;
  }

  // 右键菜单逻辑
  const showMenu = ref(false);
  const showResourceDialog = ref(false);
  const menuPos = ref({ x: 0, y: 0 });
  const fileInput = ref<HTMLInputElement | null>(null);

  const canReplace = computed(() => {
    return ['video', 'image'].includes(props.trackItem.type);
  });

  const acceptType = computed(() => {
    return props.trackItem.type === 'video' ? 'video/*' : 'image/*';
  });

  // 全局关闭逻辑
  function closeSelf() {
    showMenu.value = false;
    window.removeEventListener('click', closeMenuHandler);
    window.removeEventListener('contextmenu', closeMenuHandler);
  }

  function closeMenuHandler() {
    closeSelf();
  }

  function handleContextMenu(event: MouseEvent) {
    // 1. 广播关闭信号
    window.dispatchEvent(new Event('cc-close-context-menu'));

    // 选中当前素材
    setSelectTract(event);
    
    showMenu.value = true;
    menuPos.value = {
      x: event.clientX,
      y: event.clientY
    };
    
    // 延迟添加监听
    setTimeout(() => {
      window.addEventListener('click', closeMenuHandler);
      window.addEventListener('contextmenu', closeMenuHandler);
    }, 0);
  }

  onMounted(() => {
    window.addEventListener('cc-close-context-menu', closeSelf);
  });

  onUnmounted(() => {
    window.removeEventListener('cc-close-context-menu', closeSelf);
    window.removeEventListener('click', closeMenuHandler);
    window.removeEventListener('contextmenu', closeMenuHandler);
  });

  function handleReplaceClick() {
    console.log('Replace clicked', fileInput.value);
    if (fileInput.value) {
      fileInput.value.click();
    }
    showMenu.value = false;
  }

  function openResourceDialog() {
    showMenu.value = false;
    showResourceDialog.value = true;
  }

  function handleResourceSelect(resource: any) {
    showResourceDialog.value = false;
    
    const newTrackItem = {
      ...resource,
      type: props.trackItem.type,
      source: resource.source, 
      cover: resource.cover
    };

    // 如果是用户上传的素材，需要保留 uploadId，以便后续从 DB 恢复
    if (resource._isUpload) {
      newTrackItem.uploadId = resource.id;
    }
    
    store.replaceTrack(props.lineIndex, props.itemIndex, newTrackItem);
  }

  function handleDelete() {
    showMenu.value = false;
    store.removeTrack(props.lineIndex, props.itemIndex);
  }

  async function handleFileChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    try {
      let resource;
      if (props.trackItem.type === 'video') {
        resource = await createVideoResourceFromFile(file, 'video');
      } else if (props.trackItem.type === 'image') {
        resource = await createImageResourceFromFile(file, ffmpeg, 'image');
      }

      if (resource) {
        // 1. 保存到 UploadStore (模拟上传)
        const { id } = await saveUploadResource({
          activeKey: props.trackItem.type, // 简单归类
          groupType: props.trackItem.type,
          groupTitle: '用户上传',
          ...resource
        });
        
        // 广播上传成功事件，通知左侧列表刷新
        window.dispatchEvent(new Event('cc-upload-success'));

        // 2. 替换轨道
        // 构造 TrackItem 数据，注意这里复用了 resource 的数据
        const newTrackItem = {
          ...resource,
          type: props.trackItem.type,
          uploadId: id, // 关联上传记录
          source: resource.source,
          cover: resource.cover
        };
        
        store.replaceTrack(props.lineIndex, props.itemIndex, newTrackItem as any);
      }
    } catch (e) {
      console.error('Replace failed', e);
    } finally {
      target.value = '';
    }
  }
</script>