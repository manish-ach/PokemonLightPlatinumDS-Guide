const currentPage = document.body.dataset.page;
const navLinks = [...document.querySelectorAll("[data-page-link]")];

navLinks.forEach((link) => {
  const isActive = link.dataset.pageLink === currentPage;
  link.classList.toggle("is-active", isActive);
  if (isActive) {
    link.setAttribute("aria-current", "page");
  }
});

const sectionRoot = document.body.dataset.sectionRoot;
const sectionLabel = document.body.dataset.sectionLabel;
const contentRoot = document.querySelector(".content");

if (sectionRoot && sectionLabel && contentRoot) {
  const backWrap = document.createElement("nav");
  backWrap.className = "section-back";
  backWrap.setAttribute("aria-label", "Section Navigation");

  const backLink = document.createElement("a");
  backLink.className = "section-back__link";
  backLink.href = sectionRoot;
  backLink.textContent = `Back to ${sectionLabel}`;

  backWrap.append(backLink);
  contentRoot.prepend(backWrap);
}
