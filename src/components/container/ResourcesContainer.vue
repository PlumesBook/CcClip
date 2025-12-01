<template>
  <div class="flex h-full relative">
    <MenuList :activeIndex="defaultActiveIndex" @activeChange="activeHandler" />
    <ItemList :activeKey="state.activeItem.key" :defaultCollapse="store.hideSubMenu" :title="state.activeItem.title"
      @collapseChange="changeCollapse" />

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
