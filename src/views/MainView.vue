<template>
  <main class="page">
    <header class="header">
      <h1>KW 시스템</h1>
      <p>관리 포털</p>
    </header>
    <section class="menu-grid">
      <router-link class="menu-card" to="/login">
        <h2>로그인</h2>
        <p>이메일 또는 구글 계정으로 로그인합니다.</p>
      </router-link>
      <router-link class="menu-card" to="/players">
        <h2>선수 관리</h2>
        <p>선수 검색, 목록 조회, 등록/수정 화면입니다.</p>
      </router-link>
      <router-link class="menu-card" to="/tactics">
        <h2>전술 관리</h2>
        <p>전술 보드 목록, 필터, 버전 저장을 관리합니다.</p>
      </router-link>
    </section>
  </main>
</template>

<style scoped>
.page {
  max-width: 960px;
  margin: 0 auto;
  padding: 32px 16px;
}

.header h1 {
  margin: 0;
}

.header p {
  margin: 8px 0 24px;
  color: #4b5563;
}

.menu-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.menu-card {
  display: block;
  padding: 16px;
  border: 1px solid #d1d5db;
  border-radius: 10px;
  text-decoration: none;
  color: inherit;
  background: #ffffff;
}

.menu-card:hover {
  border-color: #2563eb;
}

.menu-card h2 {
  margin: 0 0 8px;
  font-size: 18px;
}

.menu-card p {
  margin: 0;
  color: #4b5563;
  font-size: 14px;
}
</style>
