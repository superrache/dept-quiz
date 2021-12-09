<template>
    <div class="container">
      <div id="loading">Chargement en cours ...</div>
    </div>
</template>

<script>

export default {
  name: 'Loading',
}

</script>

<style scoped>

.container {
  position: absolute;
  top: 0px;
  z-index: 3000;
  background-color: rgb(0, 0, 0, 0.9);
}

#loading {
  color: white;
  font-weight: 700;
}

</style>