<template>
  <div class="p-0 absolute top-10 bottom-0 left-0 right-0 overflow-hidden flex items-center justify-center bg-black">
    <canvas ref="playerCanvas" class="max-w-full max-h-full" />
    
    <!-- Empty State / Upload Hint -->
    <div v-show="store.frameCount === 0 || !store.existVideo" class="absolute inset-0 z-20 flex flex-col justify-center items-center pointer-events-none">
       <div class="flex flex-col items-center gap-4">
          <div class="w-16 h-16 bg-cc-primary rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(0,229,255,0.3)] animate-pulse pointer-events-auto cursor-pointer hover:scale-105 transition-transform duration-300">
             <ElIcon :size="32" color="#000"><Plus /></ElIcon>
          </div>
          <div class="text-center">
             <p class="text-sm font-medium text-white/90">点击上传素材</p>
             <p class="text-xs text-white/50 mt-1">或将文件拖拽到这里</p>
          </div>
          
          <div class="flex gap-3 mt-2 pointer-events-auto">
             <div class="w-10 h-10 rounded bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer transition-colors">
                <ElIcon :size="18" class="text-white/70"><FolderOpened /></ElIcon>
             </div>
             <div class="w-10 h-10 rounded bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer transition-colors">
                <ElIcon :size="18" class="text-white/70"><Upload /></ElIcon>
             </div>
          </div>
       </div>
    </div>

    <Loading v-show="showLoading.value" class="justify-center pl-0 bg-opacity-0" />
    <PlayerMoveable :canvasSize="player.canvasSize" />
  </div>
  <PlayerControl :disable="showLoading.value" />
  <audio ref="audio" src="" />
</template>

<script setup lang="ts">
  import PlayerMoveable from '@/components/item/player/PlayerMoveable.vue';
  import PlayerControl from '@/components/item/player/PlayerControl.vue';
  import { VideoCameraFilled, Plus, FolderOpened, Upload } from '@element-plus/icons-vue';
  import Loading from '@/components/Loading.vue';
  import { ref, inject, computed } from 'vue';
  import FFManager from '@/utils/ffmpegManager';
  import { usePlayerState } from '@/stores/playerState';
  import { audioSetup } from '@/components/item/player/initAudio';
  import { CanvasPlayer } from '@/components/item/player/canvasDraw';
  const props = defineProps({
    containerSize: { // 容器大小
      type: Object,
      default() {
        return {
          width: 0,
          height: 0
        };
      }
    }
  });
  const ffmpeg = inject('ffmpeg') as FFManager;
  const store = usePlayerState();
  const playerCanvas = ref();
  const player = new CanvasPlayer({
    player: playerCanvas,
    ffmpeg,
    containerSize: props.containerSize
  });
  const { audio, audioLoading } = audioSetup(player.loading); // audio在视频抽帧结束后才能获取到视频音轨
  const showLoading = computed(() => {
    return player.loading && audioLoading;
  });
</script>