// Страница загрузок: берёт файлы последнего релиза с GitHub и предлагает сборку
// под систему и процессор посетителя. Правила именования файлов описаны в README.md.

// Репозиторий, в релизах которого лежат сборки, в виде "владелец/имя".
const RELEASES_REPO = "romanvl84/abd.pro";

// Как система и процессор распознаются в имени файла (без учёта регистра).
const OS_LIST = [
  { id: "windows", title: "Windows", match: /windows|win(32|64)?(?![a-z])/i },
  { id: "macos", title: "macOS", match: /macos|darwin|osx|(?<![a-z])mac(?![a-z])/i },
  { id: "linux", title: "Linux", match: /linux/i },
];
const ARCH_LIST = [
  { id: "x64", title: "x64 (Intel, AMD)", match: /x86_64|x86-64|amd64|x64/i },
  { id: "arm64", title: "ARM64", match: /arm64|aarch64/i },
];
// Продукты: первый подошедший по имени файла. Сервер проверяется раньше, чем abd.
const PRODUCTS = [
  { id: "server", title: "Сервер", match: /server/i },
  { id: "abd", title: "Инструмент автора abd", match: /abd/i },
];
// Вспомогательные файлы (контрольные суммы, подписи) в кнопки не попадают.
const AUX = /\.(sha256|sha512|sig|asc|txt|json)$|checksums?/i;

(function () {
  const box = document.getElementById("downloads");
  if (!box || !RELEASES_REPO) return;

  const el = (tag, text, attrs) => {
    const node = document.createElement(tag);
    if (text != null) node.textContent = text;
    for (const key in attrs || {}) node.setAttribute(key, attrs[key]);
    return node;
  };
  const size = (bytes) =>
    bytes >= 1048576 ? (bytes / 1048576).toFixed(1) + " МБ" : Math.ceil(bytes / 1024) + " КБ";
  const releasesUrl = "https://github.com/" + RELEASES_REPO + "/releases";

  // Определение системы и процессора посетителя. Процессор браузер сообщает не всегда,
  // поэтому выбор всегда можно поправить вручную.
  async function detect() {
    const uaData = navigator.userAgentData;
    const ua = navigator.userAgent || "";
    const platform = ((uaData && uaData.platform) || navigator.platform || "") + " " + ua;
    let os = /win/i.test(platform) ? "windows" : /mac|iphone|ipad/i.test(platform) ? "macos" : /linux|x11|android|cros/i.test(platform) ? "linux" : "windows";
    // Новые Mac работают на ARM, а Safari процессор не сообщает — для macOS по умолчанию ARM64.
    let arch = /arm64|aarch64/i.test(ua) ? "arm64" : os === "macos" ? "arm64" : "x64";
    if (uaData && uaData.getHighEntropyValues) {
      try {
        const v = await uaData.getHighEntropyValues(["architecture"]);
        if (v.architecture === "arm") arch = "arm64";
        else if (v.architecture === "x86") arch = "x64";
      } catch (e) { /* остаётся значение по умолчанию */ }
    }
    return { os, arch };
  }

  function render(rel, choice) {
    const assets = rel.assets || [];
    const main = assets.filter((a) => !AUX.test(a.name));
    const find = (product) =>
      main.find((a) => {
        const own = PRODUCTS.find((p) => p.match.test(a.name));
        return own && own.id === product.id &&
          OS_LIST.find((o) => o.id === choice.os).match.test(a.name) &&
          ARCH_LIST.find((o) => o.id === choice.arch).match.test(a.name);
      });

    const head = el("div", null, { class: "release-head" });
    head.append(el("h2", "Версия " + (rel.name || rel.tag_name)));
    if (rel.published_at) {
      head.append(el("span", new Date(rel.published_at).toLocaleDateString("ru-RU", { dateStyle: "long" })));
    }

    const picker = el("div", null, { class: "picker" });
    const group = (label, list, key) => {
      const wrap = el("div", null, { class: "picker-group", role: "group", "aria-label": label });
      wrap.append(el("span", label, { class: "picker-label" }));
      const seg = el("div", null, { class: "segmented" });
      for (const item of list) {
        const b = el("button", item.title, { type: "button", "aria-pressed": String(choice[key] === item.id) });
        b.addEventListener("click", () => { choice[key] = item.id; render(rel, choice); });
        seg.append(b);
      }
      wrap.append(seg);
      return wrap;
    };
    picker.append(group("Система", OS_LIST, "os"), group("Процессор", ARCH_LIST, "arch"));

    const cards = el("div", null, { class: "grid dl-grid" });
    for (const product of PRODUCTS) {
      const card = el("div", null, { class: "card dl-card" });
      card.append(el("h3", product.title));
      const file = find(product);
      if (file) {
        card.append(el("a", "Скачать", { class: "button", href: file.browser_download_url }));
        card.append(el("p", file.name + " · " + size(file.size), { class: "dl-file" }));
      } else {
        card.append(el("p", "Для выбранной системы и процессора сборки нет."));
      }
      cards.append(card);
    }

    const details = el("details", null, { class: "all-files" });
    details.append(el("summary", "Все файлы этой версии"));
    const table = el("table", null, { class: "files" });
    const headRow = el("tr");
    headRow.append(el("th", "Файл"), el("th", "Размер"));
    table.append(headRow);
    for (const a of assets) {
      const row = el("tr");
      const name = el("td");
      name.append(el("a", a.name, { href: a.browser_download_url }));
      row.append(name, el("td", size(a.size), { class: "size" }));
      table.append(row);
    }
    details.append(table);

    const all = el("p");
    all.append(el("a", "Предыдущие версии", { href: releasesUrl }));
    box.replaceChildren(head, picker, cards, details, all);
  }

  const fail = () => {
    const p = el("p", "Не удалось получить список сборок. ", { class: "notice" });
    p.append(el("a", "Открыть релизы на GitHub", { href: releasesUrl }));
    box.replaceChildren(p);
  };

  fetch("https://api.github.com/repos/" + RELEASES_REPO + "/releases/latest", {
    headers: { Accept: "application/vnd.github+json" },
  })
    .then((r) => {
      if (r.status === 404) return null; // релизов ещё нет — остаётся «Сборки пока не опубликованы»
      return r.ok ? r.json() : Promise.reject(r.status);
    })
    .then(async (rel) => {
      if (!rel) return;
      if (!rel.assets || !rel.assets.length) return fail();
      render(rel, await detect());
    })
    .catch(fail);
})();
