// Страница загрузок: показывает файлы последнего релиза из публичного репозитория GitHub.
//
// Впишите сюда репозиторий со сборками в виде "владелец/имя".
// Пока строка пустая, страница показывает «Сборки пока не опубликованы».
const RELEASES_REPO = "";

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

  const fail = () => {
    const p = el("p", "Не удалось получить список сборок. ", { class: "notice" });
    p.append(el("a", "Открыть релизы на GitHub", { href: releasesUrl }));
    box.replaceChildren(p);
  };

  fetch("https://api.github.com/repos/" + RELEASES_REPO + "/releases/latest", {
    headers: { Accept: "application/vnd.github+json" },
  })
    .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
    .then((rel) => {
      if (!rel.assets || !rel.assets.length) return fail();

      const head = el("div", null, { class: "release-head" });
      head.append(el("h2", "Версия " + (rel.name || rel.tag_name)));
      if (rel.published_at) {
        head.append(el("span", new Date(rel.published_at).toLocaleDateString("ru-RU", { dateStyle: "long" })));
      }

      const table = el("table", null, { class: "files" });
      const headRow = el("tr");
      headRow.append(el("th", "Файл"), el("th", "Размер"));
      table.append(headRow);
      for (const a of rel.assets) {
        const row = el("tr");
        const name = el("td");
        name.append(el("a", a.name, { href: a.browser_download_url }));
        row.append(name, el("td", size(a.size), { class: "size" }));
        table.append(row);
      }

      const all = el("p");
      all.append(el("a", "Все версии", { href: releasesUrl }));
      box.replaceChildren(head, table, all);
    })
    .catch(fail);
})();
