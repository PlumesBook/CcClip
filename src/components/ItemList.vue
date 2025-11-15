<template>
    <div
class="flex flex-col transition-all duration-200 overflow-x-hidden border-r dark:border-gray-600 border-gray-300"
        :class="collapse ? 'w-0' : 'w-80'"
>
        <div class="min-h-full w-80 flex flex-col overflow-hidden border-l dark:border-gray-600 border-gray-300">
            <div class="h-10 border-b dark:border-gray-600 border-gray-300">
                <span class="inline leading-10 pl-3 select-none">{{ title }}</span>
                <ElIcon :size="16" class="mr-3 mt-1 float-right cursor-pointer p-2 box-content" @click="switchCollapse">
                    <Fold />
                </ElIcon>
            </div>
            <div class="overflow-auto flex-1 pb-10">
                <template v-for="(subData, index) of listData" :key="`${index}-${subData.type}`">
                    <SubList :type="subData.type" :listData="subData" @upload="handleUpload($event, index)" />
                </template>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
  import { Fold } from '@element-plus/icons-vue';
  import { computed, ref, watch } from 'vue';
  import SubList from '@/components/SubList.vue';
  import { getData } from '@/api/mock';
  import { useRequest } from 'vue-hooks-plus';
  import { saveUploadResource, getUploadResources } from '@/utils/uploadStore';
  const props = defineProps({
    activeKey: {
      type: String,
      default: ''
    },
    title: {
      type: String,
      default: ''
    },
    defaultCollapse: {
      type: Boolean,
      default: false
    }
  });
  const emit = defineEmits({
    collapseChange(newCollapse: boolean) {
      return newCollapse !== null;
    }
  });
  const { data: listData, refresh } = useRequest(() => getData(props.activeKey));
  watch(() => props.activeKey, () => {
    refresh();
  });

  async function mergeLocalUploads() {
    const activeKey = props.activeKey;
    if (!activeKey) return;
    const uploads = await getUploadResources(activeKey);
    const list = (listData as any).value || [];
    uploads.forEach(record => {
      const target = list.find((sub: any) => sub.type === record.groupType && sub.title === record.groupTitle);
      if (!target) return;
      if (!Array.isArray(target.items)) {
        target.items = [];
      }
      const source = URL.createObjectURL(record.file);
      target.items.unshift({
        name: record.name,
        format: record.format,
        cover: record.cover,
        source,
        width: record.width,
        height: record.height,
        fps: record.fps,
        frameCount: record.frameCount,
        time: record.time
      });
    });
  }

  watch(listData, () => {
    mergeLocalUploads();
  });

  const title = computed(() => props.title);
  const collapse = ref(props.defaultCollapse);
  function switchCollapse() {
    collapse.value = !collapse.value;
  }
  watch(collapse, newValue => {
    emit('collapseChange', newValue);
  });
  watch(() => props.defaultCollapse, newValue => {
    collapse.value = newValue;
  });
  async function handleUpload(item: Record<string, any>, subIndex: number) {
    if (!item) return;
    const list = (listData as any).value || [];
    const target = list[subIndex];
    if (!target || !Array.isArray(target.items)) return;
    const { file, groupType, groupTitle, ...rest } = item as any;
    target.items.unshift({
      ...rest
    });
    if (file) {
      try {
        await saveUploadResource({
          activeKey: props.activeKey,
          groupType: groupType || target.type,
          groupTitle: groupTitle || target.title,
          name: rest.name,
          format: rest.format,
          cover: rest.cover,
          width: rest.width,
          height: rest.height,
          fps: rest.fps,
          frameCount: rest.frameCount,
          time: rest.time,
          file
        });
      } catch (e) {
        // ignore
      }
    }
  }
</script>