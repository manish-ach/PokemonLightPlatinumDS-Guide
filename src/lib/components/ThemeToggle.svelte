<script>
  import { onMount } from 'svelte';
  let theme = $state('dark');

  onMount(() => {
    theme = document.documentElement.getAttribute('data-theme') || 'dark';
  });

  function toggle() {
    theme = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('lpds-theme', theme);
    } catch {}
  }
</script>

<button class="icon-btn" onclick={toggle} aria-label="Toggle light / dark theme" title="Toggle theme">
  {theme === 'dark' ? '☀' : '☾'}
</button>
