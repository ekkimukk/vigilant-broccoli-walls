const IMAGE_EXTENSIONS = /\.(jpe?g|png|gif|webp|avif|bmp)$/i;

const state = {
  items: [],
  filtered: [],
  folder: "",
  index: 0
};

const $ = (id) => document.getElementById(id);
const gallery = $("gallery");
const folders = $("folders");
const search = $("search");
const sort = $("sort");
const empty = $("empty");
const error = $("error");
const lightbox = $("lightbox");
const lightboxImage = $("lightbox-image");
const lightboxCaption = $("lightbox-caption");

function repoInfo() {
  const parts = location.pathname.split("/").filter(Boolean);
  const repoIndex = parts.length > 0 ? parts.length - 1 : -1;

  // On project Pages: owner.github.io/repo/
  if (location.hostname.endsWith(".github.io")) {
    const owner = location.hostname.split(".")[0];
    const repo = parts[0] || `${owner}.github.io`;
    return { owner, repo };
  }

  // Fallback: set these if the site is served somewhere other than GitHub Pages.
  return {
    owner: "YOUR_GITHUB_USERNAME",
    repo: "YOUR_REPOSITORY"
  };
}

async function loadRepository() {
  const { owner, repo } = repoInfo();

  if (owner === "YOUR_GITHUB_USERNAME") {
    throw new Error("Не удалось определить GitHub-репозиторий. Откройте сайт через GitHub Pages или укажите owner/repo в script.js.");
  }

  const response = await fetch(
    `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/HEAD?recursive=1`,
    { headers: { Accept: "application/vnd.github+json" } }
  );

  if (!response.ok) {
    throw new Error(`GitHub API returned HTTP ${response.status}. Make sure the repository is public.`);
  }

  const data = await response.json();

  if (data.truncated) {
    console.warn("GitHub API: дерево репозитория обрезано.");
  }

  const pagesPrefix = location.pathname.endsWith("/")
    ? location.pathname
    : location.pathname.slice(0, location.pathname.lastIndexOf("/") + 1);

  state.items = (data.tree || [])
    .filter(item => item.type === "blob" && IMAGE_EXTENSIONS.test(item.path))
    .map(item => {
      const parts = item.path.split("/");
      const name = parts.pop();
      const folder = parts.join("/") || "root";

      return {
        path: item.path,
        name,
        folder,
        url: pagesPrefix + item.path.split("/").map(encodeURIComponent).join("/"),
        sha: item.sha
      };
    });

  state.items.sort((a, b) => a.path.localeCompare(b.path, undefined, { numeric: true, sensitivity: "base" }));

  const folderSet = [...new Set(state.items.map(item => item.folder))];
  folders.innerHTML = [
    `<button class="folder active" data-folder="">Все <span>${state.items.length}</span></button>`,
    ...folderSet.map(folder => {
      const count = state.items.filter(item => item.folder === folder).length;
      return `<button class="folder" data-folder="${escapeHtml(folder)}">${escapeHtml(folder)} <span>${count}</span></button>`;
    })
  ].join("");

  folders.querySelectorAll(".folder").forEach(button => {
    button.addEventListener("click", () => {
      state.folder = button.dataset.folder;
      folders.querySelectorAll(".folder").forEach(b => b.classList.remove("active"));
      button.classList.add("active");
      render();
    });
  });

  $("subtitle").textContent = `${state.items.length} ${pluralize(state.items.length, "обои", "обоев", "обоя")}`;
  render();
}

function render() {
  const query = search.value.trim().toLowerCase();

  state.filtered = state.items
    .filter(item => !state.folder || item.folder === state.folder)
    .filter(item => !query || item.name.toLowerCase().includes(query) || item.folder.toLowerCase().includes(query));

  const mode = sort.value;

  state.filtered.sort((a, b) => {
    if (mode === "name") return a.path.localeCompare(b.path, undefined, { numeric: true, sensitivity: "base" });
    if (mode === "newest") return b.sha.localeCompare(a.sha);
    return a.sha.localeCompare(b.sha);
  });

  gallery.innerHTML = state.filtered.map((item, index) => `
    <article class="card" tabindex="0" data-index="${index}">
      <img src="${item.url}" alt="${escapeHtml(item.name)}" loading="lazy" decoding="async">
      <div class="card-info">
        <div class="card-name">${escapeHtml(item.name)}</div>
        <div class="card-folder">${escapeHtml(item.folder)}</div>
      </div>
    </article>
  `).join("");

  empty.classList.toggle("hidden", state.filtered.length !== 0);
  gallery.classList.toggle("hidden", state.filtered.length === 0);

  gallery.querySelectorAll(".card").forEach(card => {
    const open = () => openLightbox(Number(card.dataset.index));
    card.addEventListener("click", open);
    card.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        open();
      }
    });
  });
}

function openLightbox(index) {
  state.index = index;
  const item = state.filtered[state.index];
  if (!item) return;

  lightboxImage.src = item.url;
  lightboxImage.alt = item.name;
  lightboxCaption.textContent = item.path;
  lightbox.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeLightbox() {
  lightbox.classList.add("hidden");
  document.body.style.overflow = "";
}

function move(delta) {
  if (!state.filtered.length) return;
  state.index = (state.index + delta + state.filtered.length) % state.filtered.length;
  openLightbox(state.index);
}

$("close").addEventListener("click", closeLightbox);
$("prev").addEventListener("click", () => move(-1));
$("next").addEventListener("click", () => move(1));

lightbox.addEventListener("click", e => {
  if (e.target === lightbox) closeLightbox();
});

document.addEventListener("keydown", e => {
  if (lightbox.classList.contains("hidden")) return;
  if (e.key === "Escape") closeLightbox();
  if (e.key === "ArrowLeft") move(-1);
  if (e.key === "ArrowRight") move(1);
});

search.addEventListener("input", render);
sort.addEventListener("change", render);

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[char]));
}

function pluralize(n, one, many, few) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) return few;
  return many;
}

loadRepository().catch(err => {
  console.error(err);
  error.textContent = err.message;
  error.classList.remove("hidden");
  $("subtitle").textContent = "Ошибка загрузки";
});
