<template>
  <el-dialog
    v-model="visible"
    :title="`选择${typeName}素材进行替换`"
    width="70%"
    class="resource-select-dialog"
    destroy-on-close
    :close-on-click-modal="false"
    append-to-body
    @close="handleClose"
  >
    <el-tabs v-model="activeTab" @tab-change="handleTabChange">
      <el-tab-pane label="系统推荐" name="system"></el-tab-pane>
      <el-tab-pane label="我的上传" name="user"></el-tab-pane>
    </el-tabs>

    <div class="h-[400px] overflow-y-auto p-2" v-loading="loading">
      <!-- 空状态 -->
      <div v-if="!loading && list.length === 0" class="h-full flex flex-col items-center justify-center text-gray-400">
        <el-icon :size="48"><Files /></el-icon>
        <span class="mt-2">暂无相关素材</span>
      </div>

      <!-- 列表 -->
      <div class="grid grid-cols-4 gap-4">
        <div
          v-for="(item, index) in list"
          :key="index"
          class="relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-all duration-200 bg-gray-50 dark:bg-gray-800"
          :class="selectedItem === item ? 'border-blue-500 ring-2 ring-blue-200' : 'border-transparent hover:border-gray-300 dark:hover:border-gray-600'"
          @click="selectItem(item)"
          @dblclick="handleDbClick(item)"
        >
          <!-- 封面 -->
          <div class="aspect-video bg-gray-100 dark:bg-gray-800 relative">
            <img 
              :src="item.cover" 
              class="w-full h-full object-cover select-none block"
              loading="lazy"
            />
            <!-- 视频时长角标 -->
            <span v-if="resourceType === 'video'" class="absolute bottom-1 right-1 text-xs text-white bg-black bg-opacity-50 px-1 rounded scale-90 origin-bottom-right">
              {{ formatTimeStr(item.time) }}
            </span>
          </div>
          
          <!-- 名称 -->
          <div class="p-2">
            <p class="text-xs truncate text-gray-700 dark:text-gray-200" :title="item.name">{{ item.name }}</p>
          </div>

          <!-- 选中标记 -->
          <div v-if="selectedItem === item" class="absolute top-1 right-1 bg-blue-500 text-white rounded-full p-0.5 shadow-sm">
            <el-icon :size="12"><Check /></el-icon>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <span class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button type="primary" @click="confirmSelect" :disabled="!selectedItem">
          确认替换
        </el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { Files, Check } from '@element-plus/icons-vue';
import { getData } from '@/api/mock';
import { getUploadResources } from '@/utils/uploadStore';
import { formatTime } from '@/utils/common';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  resourceType: {
    type: String,
    default: 'video'
  }
});

const emit = defineEmits(['update:modelValue', 'select']);

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
});

const activeTab = ref('system');
const loading = ref(false);
const list = ref<any[]>([]);
const selectedItem = ref<any>(null);

const typeName = computed(() => {
  if (props.resourceType === 'video') return '视频';
  if (props.resourceType === 'image') return '图片';
  return '素材';
});

function formatTimeStr(time: number) {
  if (!time) return '00:00';
  const { str } = formatTime(time);
  return str;
}

async function loadData() {
  loading.value = true;
  list.value = [];
  selectedItem.value = null;
  
  try {
    if (activeTab.value === 'system') {
      // 系统推荐
      const res = await getData(props.resourceType);
      let rawList = [];
      const data = (res as any).data; 
      if (Array.isArray(data)) {
        rawList = data;
      } else if (data && Array.isArray(data.items)) {
        rawList = data.items;
      } else if (Array.isArray(res)) {
        rawList = res;
      }
      list.value = rawList.map((item: any) => ({ ...item, _isUpload: false }));
    } else {
      // 我的上传
      const res = await getUploadResources(props.resourceType);
      list.value = res.map(item => ({ ...item, _isUpload: true }));
    }
  } catch (e) {
    console.error('Load resource failed', e);
  } finally {
    loading.value = false;
  }
}

function handleTabChange() {
  loadData();
}

function selectItem(item: any) {
  selectedItem.value = item;
}

function handleDbClick(item: any) {
  selectedItem.value = item;
  confirmSelect();
}

function confirmSelect() {
  if (selectedItem.value) {
    emit('select', selectedItem.value);
    handleClose();
  }
}

function handleClose() {
  visible.value = false;
  selectedItem.value = null;
}

watch(() => props.modelValue, (val) => {
  if (val) {
    loadData();
  }
});
</script>

<style scoped>
.resource-select-dialog :deep(.el-dialog__body) {
  padding: 10px 20px;
}
</style>
