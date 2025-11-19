<template>
  <el-tabs
      v-if="componentData.dataType === 'Tabs'"
      v-bind="componentData.attr || {}"
      v-model="activeIndex"
      class="cc-tabs mb-4"
  >
      <AttrContainer :attrData="componentData.children" />
  </el-tabs>
  <el-tab-pane
      v-else-if="componentData.dataType === 'TabPane'"
      :label="componentData.name"
      :name="index"
      :key="index"
  >
    <AttrContainer :attrData="componentData.children" />
  </el-tab-pane>
  <el-collapse
      v-else-if="componentData.dataType === 'Collapse'"
      v-model="activeIndex"
      class="cc-collapse"
  >
    <AttrContainer :attrData="componentData.children" />
  </el-collapse>
  <el-collapse-item
      v-else-if="componentData.dataType === 'CollapsePane'"
      :title="componentData.name"
      :name="index"
  >
    <AttrContainer :attrData="componentData.children" />
  </el-collapse-item>
  <el-radio
      v-else-if="componentData.dataType === 'RadioItem'"
      :label="componentData.value"
      size="large"
      class="cc-radio"
  >
    {{ componentData.name }}
  </el-radio>
  <el-radio-button
      v-else-if="componentData.dataType === 'RadioButtonItem'"
      :label="componentData.value"
      size="small"
  >
    {{ componentData.name }}
  </el-radio-button>
  <div class="formItem" v-else-if="componentData.dataType === 'Slider'">
    <span class="formTitle" v-show="componentData.name">{{ componentData.name }}</span>
    <div class="formContent">
      <el-slider v-model="formValue" v-bind="componentData.attr" class="cc-slider" />
    </div>
    <span class="ml-3 w-10 text-right text-xs text-cc-text-sub font-mono">{{ formValue }}{{ componentData.label }}</span>
  </div>
  <div class="formItem" v-else-if="componentData.dataType === 'String'">
    <span class="formTitle" v-show="componentData.name">{{ componentData.name }}</span>
    <div class="formContent">
      <el-input v-model="formValue" v-bind="componentData.attr" class="cc-input" />
    </div>
  </div>
  <div class="formItem" v-else-if="componentData.dataType === 'Number'">
    <span class="formTitle" v-show="componentData.name">{{ componentData.name }}</span>
    <div class="formContent">
      <el-input-number v-model="formValue" v-bind="componentData.attr" class="cc-input-number" controls-position="right" />
    </div>
  </div>
  <div class="formItem" v-else-if="componentData.dataType === 'Radio'">
    <span class="formTitle" v-show="componentData.name">{{ componentData.name }}</span>
    <div class="formContent">
      <el-radio-group v-model="formValue" v-bind="componentData.attr" class="cc-radio-group">
        <AttrContainer :attrData="componentData.children" />
      </el-radio-group>
    </div>
  </div>
  <div class="formItem" v-else-if="componentData.dataType === 'RadioButton'">
    <span class="formTitle" v-show="componentData.name">{{ componentData.name }}</span>
    <div class="formContent">
      <el-radio-group v-model="formValue" v-bind="componentData.attr" class="cc-radio-button-group">
        <AttrContainer :attrData="componentData.children" />
      </el-radio-group>
    </div>
  </div>
  <div class="formItem" v-else-if="componentData.dataType === 'Boolean'">
    <span class="formTitle" v-show="componentData.name">{{ componentData.name }}</span>
    <div class="formContent justify-end">
      <el-switch v-model="formValue" v-bind="componentData.attr" class="cc-switch" />
    </div>
  </div>
  <div class="formItem" v-else-if="componentData.dataType === 'TextArea'">
    <span class="formTitle" v-show="componentData.name">{{ componentData.name }}</span>
    <div class="formContent">
      <el-input
          v-model="formValue"
          v-bind="componentData.attr"
          type="textarea"
          class="cc-textarea"
      />
    </div>
  </div>
  <div class="formItem" v-else-if="componentData.dataType === 'Color'">
    <span class="formTitle" v-show="componentData.name">{{ componentData.name }}</span>
    <div class="formContent justify-end">
      <ColorPicker v-model="formValue" v-bind="componentData.attr" />
    </div>
  </div>
  <div class="formItem" v-else-if="componentData.dataType === 'Flex'">
    <span class="formTitle" v-show="componentData.name">{{ componentData.name }}</span>
    <div class="formContentFlex">
        <AttrContainer :attrData="componentData.children" :style="{ width: `${96 / componentData.attr.col}%` }" />
    </div>
  </div>
</template>

<script setup lang="ts">
  import ColorPicker from '@/components/item/formItem/color/ColorPicker.vue';
  import AttrContainer from '@/components/item/formItem/AttrContainer.vue';
  import { ref, computed } from 'vue';
  import { useTrackAttrState } from '@/stores/trackAttribute';
  import { useTrackState } from '@/stores/trackState';
  const props = defineProps({
    componentData: {
      type: Object,
      default() {
        return {};
      }
    },
    index: {
      type: Number,
      default: 0
    }
  });
  const trackStore = useTrackState();
  const attrStore = useTrackAttrState();
  const activeIndex = ref(props.componentData.defaultValue); // 内部状态
  const selectTrack = ref(trackStore.selectResource);
  const formValue = computed({
    get() {
      if (selectTrack.value && attrStore.trackAttrMap[selectTrack.value.id]) {
        const attrData = attrStore.trackAttrMap[selectTrack.value.id][props.componentData.mappingKey];
        if (attrData === undefined && props.componentData.defaultValue !== undefined) {
          attrStore.setTrackAttr(selectTrack.value.id, {
            [props.componentData.mappingKey]: props.componentData.defaultValue
          });
          return props.componentData.defaultValue;
        }
        return attrData;
      } else {
        return null;
      }
    },
    set(value) {
      if (selectTrack.value && props.componentData.mappingKey) {
        attrStore.setTrackAttr(selectTrack.value.id, {
          [props.componentData.mappingKey]: value
        });
      }
    }
  });
</script>

<style scoped>
  .formItem {
    @apply w-full flex flex-row grow-0 shrink-0 mb-3 items-center px-2;
  }
  .formTitle{
    @apply w-20 text-xs block pr-2 text-left text-cc-text-sub shrink-0 font-medium select-none;
  }
  .formContent{
    @apply flex-1 flex flex-row items-center min-w-0;
  }
  .formContentFlex{
    @apply flex flex-row flex-wrap flex-1 overflow-x-hidden shrink-0 justify-between
  }
  .formContentFlex .formTitle{
    @apply w-auto pl-0 pr-2 mb-1;
  }
  .formContentFlex .formItem{
    @apply mb-2 flex-col items-start;
  }

  /* Deep overrides for Element Plus to match CapCut */
  :deep(.el-collapse) {
    border: none;
    --el-collapse-header-bg-color: transparent;
    --el-collapse-content-bg-color: transparent;
    --el-collapse-border-color: transparent;
  }
  :deep(.el-collapse-item__header) {
    color: var(--el-text-color-primary);
    font-size: 13px;
    font-weight: 600;
    height: 40px;
    border-bottom: 1px solid #333;
  }
  :deep(.el-collapse-item__content) {
    padding-bottom: 10px;
  }
  :deep(.el-input__wrapper) {
    background-color: #252525;
    box-shadow: none;
    border: 1px solid transparent;
    border-radius: 4px;
  }
  :deep(.el-input__wrapper:hover), :deep(.el-input__wrapper.is-focus) {
    background-color: #252525;
    box-shadow: 0 0 0 1px #4B5563 inset;
  }
  :deep(.el-input__inner) {
    color: #fff;
    font-size: 12px;
    height: 28px;
  }
  :deep(.el-input-number) {
    width: 100%;
  }
  :deep(.el-input-number__decrease), :deep(.el-input-number__increase) {
    background: #333;
    border-left: 1px solid #444;
    color: #fff;
  }
  :deep(.el-slider__runway) {
    background-color: #333;
    height: 4px;
  }
  :deep(.el-slider__bar) {
    background-color: #00E5FF;
    height: 4px;
  }
  :deep(.el-slider__button) {
    width: 12px;
    height: 12px;
    border: 2px solid #fff;
    background-color: #00E5FF;
  }
  :deep(.el-tabs__nav-wrap::after) {
    height: 1px;
    background-color: #333;
  }
  :deep(.el-tabs__item) {
    color: #8E8E8E;
    font-size: 13px;
    font-weight: 500;
  }
  :deep(.el-tabs__item.is-active) {
    color: #00E5FF;
  }
  :deep(.el-tabs__active-bar) {
    background-color: #00E5FF;
    height: 2px;
  }
  :deep(.el-switch__core) {
    background-color: #4B5563;
    border-color: #4B5563;
  }
  :deep(.el-switch.is-checked .el-switch__core) {
    background-color: #00E5FF;
    border-color: #00E5FF;
  }
</style>