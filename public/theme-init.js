try {
  document.documentElement.dataset.theme = localStorage.getItem("graphlink-theme") || "dark";
  const accentColor = localStorage.getItem("graphlink-accent");
  const backgroundColor = localStorage.getItem("graphlink-background");

  if (/^#[0-9a-fA-F]{6}$/.test(accentColor || "")) {
    document.documentElement.style.setProperty("--teal", accentColor);
  }

  if (/^#[0-9a-fA-F]{6}$/.test(backgroundColor || "")) {
    document.documentElement.style.setProperty("--bg", backgroundColor);
    document.documentElement.style.setProperty("--body-bg", backgroundColor);
  }
} catch (_error) {
  document.documentElement.dataset.theme = "dark";
}
