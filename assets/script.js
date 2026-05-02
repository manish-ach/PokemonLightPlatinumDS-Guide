const currentPage = document.body.dataset.page;
const navLinks = [...document.querySelectorAll("[data-page-link]")];
const scriptTag = document.querySelector('script[src$="assets/script.js"]');
const assetPrefix = scriptTag
  ? scriptTag.getAttribute("src").replace(/assets\/script\.js$/, "")
  : "";

const resolveSitePath = (path) => `${assetPrefix}${path}`;

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

const sidebarInner = document.querySelector(".sidebar__inner");
const sidebarIntro = document.querySelector(".sidebar__intro");

if (sidebarInner && sidebarIntro && !document.querySelector("[data-global-search-form]")) {
  const searchForm = document.createElement("form");
  searchForm.className = "global-search global-search--sidebar";
  searchForm.action = resolveSitePath("search/index.html");
  searchForm.method = "get";
  searchForm.setAttribute("data-global-search-form", "true");

  const searchLabel = document.createElement("label");
  searchLabel.className = "global-search__label";
  searchLabel.setAttribute("for", "sidebar-global-search");
  searchLabel.textContent = "Global Search";

  const searchInput = document.createElement("input");
  searchInput.className = "global-search__input";
  searchInput.id = "sidebar-global-search";
  searchInput.name = "q";
  searchInput.type = "search";
  searchInput.placeholder = "Search the full guide";
  searchInput.autocomplete = "off";

  searchForm.append(searchLabel, searchInput);
  sidebarIntro.insertAdjacentElement("afterend", searchForm);
}

const mapBoard = document.querySelector("[data-map-board]");

if (mapBoard) {
  const mapCursor = document.createElement("span");
  mapCursor.className = "map-cursor";
  mapCursor.setAttribute("aria-hidden", "true");
  mapBoard.append(mapCursor);

  const moveCursor = (event) => {
    const rect = mapBoard.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    mapCursor.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
  };

  mapBoard.addEventListener("mouseenter", (event) => {
    mapBoard.dataset.mapCursorActive = "true";
    moveCursor(event);
  });

  mapBoard.addEventListener("mousemove", moveCursor);

  mapBoard.addEventListener("mouseleave", () => {
    delete mapBoard.dataset.mapCursorActive;
    mapCursor.style.transform = "translate(-999px, -999px)";
  });
}

const itemSearch = document.querySelector("[data-item-search]");
const itemRows = [...document.querySelectorAll("[data-item-row]")];
const itemEmpty = document.querySelector("[data-item-empty]");

if (itemSearch && itemRows.length) {
  const filterRows = () => {
    const query = itemSearch.value.trim().toLowerCase();
    let visibleCount = 0;

    itemRows.forEach((row) => {
      const matches = row.textContent.toLowerCase().includes(query);
      row.hidden = !matches;
      if (matches) {
        visibleCount += 1;
      }
    });

    if (itemEmpty) {
      itemEmpty.hidden = visibleCount !== 0;
    }
  };

  itemSearch.addEventListener("input", filterRows);
  filterRows();
}

const localFilters = [...document.querySelectorAll("[data-filter-input]")];

localFilters.forEach((input) => {
  const targetId = input.dataset.filterTarget;
  const summaryId = input.dataset.filterSummary;
  const emptyId = input.dataset.filterEmpty;
  const targetRoot = targetId ? document.getElementById(targetId) : null;
  const summaryNode = summaryId ? document.getElementById(summaryId) : null;
  const emptyNode = emptyId ? document.getElementById(emptyId) : null;
  const items = targetRoot ? [...targetRoot.querySelectorAll("[data-filter-item]")] : [];

  if (!targetRoot || !items.length) {
    return;
  }

  const defaultSummary = summaryNode ? summaryNode.textContent : "";

  const applyFilter = () => {
    const query = input.value.trim().toLowerCase();
    let visibleCount = 0;

    items.forEach((item) => {
      const matches = item.textContent.toLowerCase().includes(query);
      item.hidden = !matches;
      if (matches) {
        visibleCount += 1;
      }
    });

    if (summaryNode) {
      summaryNode.textContent = query
        ? `${visibleCount} matching result${visibleCount === 1 ? "" : "s"} for “${input.value.trim()}”.`
        : defaultSummary;
    }

    if (emptyNode) {
      emptyNode.hidden = visibleCount !== 0;
    }
  };

  input.addEventListener("input", applyFilter);
  applyFilter();
});

const searchResultsRoot = document.querySelector("[data-search-results]");
const searchQueryInput = document.querySelector("[data-search-query]");
const searchSummary = document.querySelector("[data-search-summary]");
const searchDataset = Array.isArray(window.searchIndex) ? window.searchIndex : [];

if (searchResultsRoot && searchQueryInput) {
  const params = new URLSearchParams(window.location.search);
  const initialQuery = params.get("q") ?? "";
  searchQueryInput.value = initialQuery;

  const normalize = (value) => value.toLowerCase().trim();
  const tokenize = (value) => normalize(value).split(/\s+/).filter(Boolean);
  const groupLabels = {
    guide: "Guide Pages",
    location: "Locations",
    route: "Routes",
    pokemon: "Pokemons",
    item: "Items",
  };

  const scoreEntry = (entry, query, tokens) => {
    const haystack = normalize(
      [entry.title, entry.section, entry.excerpt, ...(entry.keywords || [])].join(" ")
    );

    if (tokens.some((token) => !haystack.includes(token))) {
      return -1;
    }

    let score = 0;
    const title = normalize(entry.title);

    if (title === query) score += 120;
    if (title.includes(query)) score += 50;
    if (normalize(entry.section).includes(query)) score += 25;

    tokens.forEach((token) => {
      if (title.startsWith(token)) score += 18;
      if (title.includes(token)) score += 12;
      if ((entry.keywords || []).some((keyword) => normalize(keyword).includes(token))) {
        score += 8;
      }
      if (normalize(entry.excerpt).includes(token)) score += 4;
    });

    return score;
  };

  const renderResults = (queryValue) => {
    const query = normalize(queryValue);
    const tokens = tokenize(queryValue);
    searchResultsRoot.innerHTML = "";

    if (!query) {
      if (searchSummary) {
        searchSummary.textContent =
          "Type a query to search items, locations, routes, Pokémon pages, and guide sections.";
      }

      const featured = Object.entries(groupLabels)
        .map(([type, label]) => ({
          type,
          label,
          entries: searchDataset.filter((entry) => entry.type === type).slice(0, 3),
        }))
        .filter((group) => group.entries.length);

      featured.forEach((group) => {
        const section = document.createElement("section");
        section.className = "search-group";

        const heading = document.createElement("h3");
        heading.textContent = group.label;
        section.append(heading);

        const grid = document.createElement("div");
        grid.className = "search-results-grid";

        group.entries.forEach((entry) => {
          const card = document.createElement("article");
          card.className = "search-card";
          card.innerHTML = `
            <div class="search-card__meta">
              <span class="search-card__badge">${group.label}</span>
              <span class="search-card__badge">${entry.section}</span>
            </div>
            <h4><a href="${resolveSitePath(entry.path)}">${entry.title}</a></h4>
            <p>${entry.excerpt}</p>
          `;
          grid.append(card);
        });

        section.append(grid);
        searchResultsRoot.append(section);
      });

      return;
    }

    const matches = searchDataset
      .map((entry) => ({ entry, score: scoreEntry(entry, query, tokens) }))
      .filter((result) => result.score >= 0)
      .sort((a, b) => b.score - a.score);

    if (searchSummary) {
      searchSummary.textContent = `${matches.length} result${matches.length === 1 ? "" : "s"} for “${queryValue.trim()}”.`;
    }

    if (!matches.length) {
      const empty = document.createElement("p");
      empty.className = "search-empty";
      empty.textContent = "No matching results found in the current site index.";
      searchResultsRoot.append(empty);
      return;
    }

    const grouped = new Map();
    matches.forEach(({ entry }) => {
      if (!grouped.has(entry.type)) {
        grouped.set(entry.type, []);
      }
      grouped.get(entry.type).push(entry);
    });

    grouped.forEach((entries, type) => {
      const section = document.createElement("section");
      section.className = "search-group";

      const heading = document.createElement("h3");
      heading.textContent = groupLabels[type] || type;
      section.append(heading);

      const grid = document.createElement("div");
      grid.className = "search-results-grid";

      entries.forEach((entry) => {
        const card = document.createElement("article");
        card.className = "search-card";
        card.innerHTML = `
          <div class="search-card__meta">
            <span class="search-card__badge">${groupLabels[type] || type}</span>
            <span class="search-card__badge">${entry.section}</span>
          </div>
          <h4><a href="${resolveSitePath(entry.path)}">${entry.title}</a></h4>
          <p>${entry.excerpt}</p>
        `;
        grid.append(card);
      });

      section.append(grid);
      searchResultsRoot.append(section);
    });
  };

  searchQueryInput.addEventListener("input", (event) => {
    const nextQuery = event.target.value;
    const nextParams = new URLSearchParams(window.location.search);
    if (nextQuery.trim()) {
      nextParams.set("q", nextQuery);
    } else {
      nextParams.delete("q");
    }
    window.history.replaceState({}, "", `${window.location.pathname}${nextParams.toString() ? `?${nextParams.toString()}` : ""}`);
    renderResults(nextQuery);
  });

  renderResults(initialQuery);
}
