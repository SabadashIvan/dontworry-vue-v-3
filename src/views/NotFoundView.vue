<template>
  <div class="not-found-view">
    <div class="container">
      <h1>404</h1>
      <p>Page not found</p>
      <router-link to="/" class="btn">Go Home</router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
// 404 Not Found view
</script>

<style scoped>
.not-found-view {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 20px;
}

.container {
  text-align: center;
}

h1 {
  font-size: 72px;
  margin-bottom: 20px;
}

.btn {
  display: inline-block;
  padding: 10px 20px;
  background: #007bff;
  color: white;
  text-decoration: none;
  border-radius: 4px;
  margin-top: 20px;
}
</style>

