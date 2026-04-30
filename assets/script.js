const currentPage = document.body.dataset.page;
const navLinks = [...document.querySelectorAll("[data-page-link]")];

navLinks.forEach((link) => {
  const isActive = link.dataset.pageLink === currentPage;
  link.classList.toggle("is-active", isActive);
  if (isActive) {
    link.setAttribute("aria-current", "page");
  }
});
