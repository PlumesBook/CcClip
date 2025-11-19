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
                    <SubList :type="subData.type" :listData="subData" @upload="handleUpload($event, index)" @delete="handleDelete($event, index)" />
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
  import { saveUploadResource, getUploadResources, deleteUploadResource, type UploadStoreRecord } from '@/utils/uploadStore';
  import { useTrackState } from '@/stores/trackState';
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
  const trackStore = useTrackState();
  watch(() => props.activeKey, () => {
    refresh();
  });

  function rebindTrackSources(uploads: UploadStoreRecord[], urlMap: Map<string, string>) {
    const uploadMap = new Map<string, UploadStoreRecord>();
    uploads.forEach(record => {
      uploadMap.set(record.id, record);
    });
    trackStore.trackList.forEach(line => {
      line.list.forEach((item: any) => {
        if (!['video', 'audio', 'image'].includes(item.type)) return;
        const uploadId = item.uploadId as string | undefined;
        if (!uploadId) return;
        const record = uploadMap.get(uploadId);
        if (!record) return;
        let source = urlMap.get(record.id);
        if (!source) {
          source = URL.createObjectURL(record.file);
          urlMap.set(record.id, source);
        }
        item.source = source;
        item.format = record.format;
        item.time = record.time;
        if (item.type === 'video') {
          item.frameCount = record.frameCount;
          item.width = record.width;
          item.height = record.height;
          item.cover = record.cover;
        } else if (item.type === 'image') {
          item.width = record.width;
          item.height = record.height;
          const recordCover = record.cover || '';
          item.cover = recordCover.startsWith('blob:') ? source : recordCover || source;
          item.sourceFrame = item.sourceFrame || record.sourceFrame || 1;
        }
      });
    });
  }

  async function mergeLocalUploads() {
    const activeKey = props.activeKey;
    if (!activeKey) return;
    const uploads = await getUploadResources(activeKey);
    const list = (listData as any).value || [];
    const urlMap = new Map<string, string>();
    uploads.forEach(record => {
      const target = list.find((sub: any) => sub.type === record.groupType && sub.title === record.groupTitle);
      if (!target) return;
      if (!Array.isArray(target.items)) {
        target.items = [];
      }
      let source = urlMap.get(record.id);
      if (!source) {
        source = URL.createObjectURL(record.file);
        urlMap.set(record.id, source);
      }
      const isImageGroup = record.groupType === 'image';
      const recordCover = record.cover || '';
      const cover = isImageGroup
        ? (recordCover.startsWith('blob:') ? source : recordCover || source)
        : recordCover;
      target.items.unshift({
        name: record.name,
        format: record.format,
        cover,
        source,
        width: record.width,
        height: record.height,
        fps: record.fps,
        frameCount: record.frameCount,
        time: record.time,
        sourceFrame: record.sourceFrame,
        uploadId: record.id
      });
    });
    rebindTrackSources(uploads, urlMap);
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
    const insertItem: any = {
      ...rest
    };
    target.items.unshift(insertItem);
    if (file) {
      try {
        const { id } = await saveUploadResource({
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
          file,
          sourceFrame: rest.sourceFrame
        });
        insertItem.uploadId = id;
      } catch (e) {
        // ignore
      }
    }
  }
  async function handleDelete(item: Record<string, any>, subIndex: number) {
    const list = (listData as any).value || [];
    const target = list[subIndex];
    if (!target || !Array.isArray(target.items)) return;
    if (item.uploadId) {
      try {
        await deleteUploadResource(item.uploadId);
        const itemIndex = target.items.indexOf(item);
        if (itemIndex > -1) {
          target.items.splice(itemIndex, 1);
        }
      } catch (e) {
        // ignore
      }
    }
  }
</script>