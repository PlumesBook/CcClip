<template>
  <div class="flex h-full overflow-hidden relative bg-cc-bg">
    <MenuList :activeIndex="defaultActiveIndex" @activeChange="activeHandler" />
    <ItemList
      :activeKey="state.activeItem.key"
      :defaultCollapse="store.hideSubMenu"
      :title="state.activeItem.title"
      @collapseChange="changeCollapse"
    />
    <div 
      v-show="store.hideSubMenu"
      class="absolute top-4 left-[4.5rem] z-10"
    >
      <div 
        class="bg-cc-surface-light border border-cc-border rounded p-1.5 cursor-pointer hover:bg-cc-border transition-colors shadow-sm"
        @click="switchCollapse"
      >
        <ElIcon :size="16" color="#fff">
          <Expand />
        </ElIcon>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { Expand } from '@element-plus/icons-vue';
  import MenuList from '@/components/MenuList.vue';
  import ItemList from '@/components/ItemList.vue';
  import { menuData } from '@/data/baseMenu';
  import { ref, reactive, nextTick } from 'vue';
  import { usePageState } from '@/stores/pageState';
  const store = usePageState();
  const defaultActiveIndex = ref(0);
  let state = reactive({
    activeItem: menuData[defaultActiveIndex.value]
  });
  function activeHandler(activeItem: any) {
    state.activeItem = reactive(activeItem);
  }
  function switchCollapse() {
    nextTick(() => {
      store.hideSubMenu = !store.hideSubMenu;
    });
  }
  function changeCollapse(newCollpase: boolean) {
    nextTick(() => {
      store.hideSubMenu = newCollpase;
    });
  }
</script>
