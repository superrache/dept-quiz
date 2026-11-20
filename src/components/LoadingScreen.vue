<script setup lang="ts">
import { t } from '../i18n'

defineProps<{ error?: string | null }>()
</script>

<template>
  <div class="loading" role="status" aria-live="polite">
    <p v-if="error" role="alert">{{ error }}</p>
    <p v-else>{{ t('game.loading') }}</p>
  </div>
</template>

<style scoped>
.loading {
  position: fixed;
  inset: 0;
  z-index: 3000;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.9);
  color: white;
  font-weight: 700;
}
</style>
