import { useTrackState } from '@/stores/trackState';
const store = useTrackState();
export const initHotKey = () => {
    // 注册全局事件
    window.onkeydown = (event: KeyboardEvent) => {
      const { composed, ctrlKey, key, type } = event;
      // 检查当前焦点是否在输入框或可编辑元素内
      const activeElement = document.activeElement;
      const isEditing = activeElement && (
          activeElement.tagName === 'INPUT' ||
          activeElement.tagName === 'TEXTAREA' ||
          (activeElement as HTMLElement).isContentEditable
      );
      switch (key) {
          case 'Backspace':
              // 删除操作 - 如果正在编辑文本则跳过
              if (isEditing) break;
              if (store.selectTrackItem.line !== -1 && store.selectTrackItem.index !== -1) {
                  store.removeTrack(store.selectTrackItem.line, store.selectTrackItem.index);
                  store.selectTrackItem.line = -1;
                  store.selectTrackItem.index = -1;
              }
              break;
          case 'Enter':
              break;
          default:
              break;
      }
    };
};