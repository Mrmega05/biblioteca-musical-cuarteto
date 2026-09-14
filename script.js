(function () {
  "use strict";

  const FAV_KEY = "cuarteto_naranjos_favoritos";
  let SONGS = [];
  let favoritos = new Set();

  // ---------- Utilidades ----------
  function loadFavoritos() {
    try {
      const raw = localStorage.getItem(FAV_KEY);
      favoritos = new Set(raw ? JSON.parse(raw) : []);
    } catch (e) {
      favoritos = new Set();
    }
  }
  function saveFavoritos() {
    localStorage.setItem(FAV_KEY, JSON.stringify([...favoritos]));
  }
  function toggleFavorito(numero) {
    if (favoritos.has(numero)) favoritos.delete(numero);
    else favoritos.add(numero);
    saveFavoritos();
  }
  function normaliza(str) {
    return (str || "")
      .toString()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  // ---------- Carga de datos ----------
  // Si el archivo se abre directamente con doble clic (protocolo file://), algunos
  // navegadores bloquean fetch() por seguridad. En ese caso se usa SONGS_FALLBACK,
  // una copia exacta de songs.json embebida en fallback-data.js.
  async function cargarCanciones() {
    try {
      const res = await fetch("songs.json");
      if (!res.ok) throw new Error("No se pudo leer songs.json");
      SONGS = await res.json();
    } catch (e) {
      if (window.SONGS_FALLBACK) {
        SONGS = window.SONGS_FALLBACK;
      } else {
        console.error("No se pudieron cargar las canciones:", e);
        SONGS = [];
      }
    }
  }

  // ---------- Tarjetas ----------
  const template = document.getElementById("card-template");

  function crearTarjeta(song) {
    const node = template.content.cloneNode(true);
    const card = node.querySelector(".song-card");
    card.dataset.numero = song.numero;

    node.querySelector(".card-number").textContent =
      "N.° " + String(song.numero).padStart(2, "0");
    node.querySelector(".card-title").textContent = song.titulo;
    node.querySelector(".key-value").textContent = song.tonalidad || "—";

    const tagsWrap = node.querySelector(".card-tags");
    (song.temas || []).forEach((t) => {
      const span = document.createElement("span");
      span.className = "tag";
      span.textContent = t;
      tagsWrap.appendChild(span);
    });

    const openBtn = node.querySelector(".card-open");
    if (song.pdf) {
      openBtn.href = song.pdf;
    } else {
      openBtn.href = "#";
      openBtn.textContent = "⚠️ No disponible";
      openBtn.classList.add("disabled");
      openBtn.removeAttribute("target");
    }

    const favBtn = node.querySelector(".fav-btn");
    const esFav = favoritos.has(song.numero);
    favBtn.textContent = esFav ? "★" : "☆";
    favBtn.classList.toggle("is-fav", esFav);
    favBtn.addEventListener("click", () => {
      toggleFavorito(song.numero);
      renderRepertorio();
      renderFavoritos();
    });

    return node;
  }

  function renderGrid(container, songs, emptyEl) {
    container.innerHTML = "";
    if (emptyEl) emptyEl.hidden = songs.length > 0;
    songs.forEach((s) => container.appendChild(crearTarjeta(s)));
  }

  // ---------- Filtros de repertorio ----------
  const elBuscar = document.getElementById("search-repertorio");
  const elBuscarHero = document.getElementById("search-hero");
  const elTonalidad = document.getElementById("filter-tonalidad");
  const elTema = document.getElementById("filter-tema");
  const elDisponibilidad = document.getElementById("filter-disponibilidad");
  const elCount = document.getElementById("repertorio-count");
  const elGrid = document.getElementById("repertorio-grid");
  const elClear = document.getElementById("clear-filters");

  function poblarSelects() {
    const tonalidades = [...new Set(SONGS.map((s) => s.tonalidad))].sort(
      (a, b) => a.localeCompare(b, "es")
    );
    const temas = [...new Set(SONGS.flatMap((s) => s.temas || []))].sort(
      (a, b) => a.localeCompare(b, "es")
    );

    tonalidades.forEach((t) => {
      const opt = document.createElement("option");
      opt.value = t;
      opt.textContent = t;
      elTonalidad.appendChild(opt);
    });
    temas.forEach((t) => {
      const opt = document.createElement("option");
      opt.value = t;
      opt.textContent = t;
      elTema.appendChild(opt);
    });
  }

  function filtrarCanciones(query) {
    const q = normaliza(query);
    const tonalidad = elTonalidad.value;
    const tema = elTema.value;
    const disponibilidad = elDisponibilidad.value;

    return SONGS.filter((s) => {
      if (q) {
        const campo = normaliza(
          s.numero + " " + s.titulo + " " + s.tonalidad + " " + (s.temas || []).join(" ")
        );
        if (!campo.includes(q)) return false;
      }
      if (tonalidad && s.tonalidad !== tonalidad) return false;
      if (tema && !(s.temas || []).includes(tema)) return false;
      if (disponibilidad === "disponible" && !s.pdf) return false;
      if (disponibilidad === "pendiente" && s.pdf) return false;
      return true;
    });
  }

  function renderRepertorio() {
    const query = elBuscar.value;
    const resultados = filtrarCanciones(query);
    renderGrid(elGrid, resultados, null);
    elCount.textContent =
      resultados.length === SONGS.length
        ? `${SONGS.length} alabanzas en el repertorio`
        : `${resultados.length} de ${SONGS.length} alabanzas`;
  }

  elBuscar.addEventListener("input", renderRepertorio);
  elTonalidad.addEventListener("change", renderRepertorio);
  elTema.addEventListener("change", renderRepertorio);
  elDisponibilidad.addEventListener("change", renderRepertorio);
  elClear.addEventListener("click", () => {
    elBuscar.value = "";
    elTonalidad.value = "";
    elTema.value = "";
    elDisponibilidad.value = "";
    renderRepertorio();
  });

  elBuscarHero.addEventListener("input", () => {
    elBuscar.value = elBuscarHero.value;
    cambiarVista("repertorio");
    renderRepertorio();
  });

  // ---------- Favoritos ----------
  function renderFavoritos() {
    const lista = SONGS.filter((s) => favoritos.has(s.numero));
    const grid = document.getElementById("favoritos-grid");
    const empty = document.getElementById("favoritos-empty");
    const count = document.getElementById("favoritos-count");
    renderGrid(grid, lista, empty);
    count.textContent = lista.length
      ? `${lista.length} alabanza${lista.length === 1 ? "" : "s"} favorita${lista.length === 1 ? "" : "s"}`
      : "";
  }

  // ---------- Tonalidades ----------
  function renderTonalidades() {
    const grupos = {};
    SONGS.forEach((s) => {
      const key = s.tonalidad || "Sin especificar";
      if (!grupos[key]) grupos[key] = [];
      grupos[key].push(s);
    });

    const claves = Object.keys(grupos).sort((a, b) => a.localeCompare(b, "es"));
    const cont = document.getElementById("tonalidades-list");
    cont.innerHTML = "";

    claves.forEach((clave) => {
      const block = document.createElement("div");
      block.className = "group-block";

      const title = document.createElement("h3");
      title.className = "group-title";
      title.innerHTML = `🎹 ${clave} <span style="color:var(--ink-soft); font-weight:400; font-size:.8rem;">(${grupos[clave].length})</span>`;
      block.appendChild(title);

      const items = document.createElement("div");
      items.className = "group-items";
      grupos[clave]
        .sort((a, b) => a.numero - b.numero)
        .forEach((s) => items.appendChild(crearItemGrupo(s)));
      block.appendChild(items);

      cont.appendChild(block);
    });
  }

  // ---------- Temas ----------
  function renderTemas() {
    const grupos = {};
    SONGS.forEach((s) => {
      const temas = s.temas && s.temas.length ? s.temas : ["Tema por confirmar"];
      temas.forEach((t) => {
        if (!grupos[t]) grupos[t] = [];
        grupos[t].push(s);
      });
    });

    const iconos = {
      "Cristo y la cruz": "✝️",
      "Amor de Dios": "❤️",
      "Adoración y entrega": "🙏",
      "Paz y consuelo": "🕊️",
      "Segunda venida / esperanza": "🌅",
      "Hogar celestial": "🏠",
      "Palabra de Dios": "📖",
      "Evangelización": "🌎",
      "Fe y confianza": "💪",
      "Tema por confirmar": "❔",
    };

    const claves = Object.keys(grupos).sort((a, b) => a.localeCompare(b, "es"));
    const cont = document.getElementById("temas-list");
    cont.innerHTML = "";

    claves.forEach((clave) => {
      const block = document.createElement("div");
      block.className = "group-block";

      const title = document.createElement("h3");
      title.className = "group-title";
      title.innerHTML = `${iconos[clave] || "🏷️"} ${clave} <span style="color:var(--ink-soft); font-weight:400; font-size:.8rem;">(${grupos[clave].length})</span>`;
      block.appendChild(title);

      const items = document.createElement("div");
      items.className = "group-items";
      grupos[clave]
        .sort((a, b) => a.numero - b.numero)
        .forEach((s) => items.appendChild(crearItemGrupo(s)));
      block.appendChild(items);

      cont.appendChild(block);
    });
  }

  function crearItemGrupo(song) {
    const a = document.createElement(song.pdf ? "a" : "div");
    a.className = "group-item " + (song.pdf ? "disponible" : "pendiente");
    if (song.pdf) {
      a.href = song.pdf;
      a.target = "_blank";
      a.rel = "noopener";
    }
    const num = document.createElement("span");
    num.className = "g-num";
    num.textContent = String(song.numero).padStart(2, "0");
    const title = document.createElement("span");
    title.className = "g-title";
    title.textContent = song.titulo;
    const status = document.createElement("span");
    status.className = "g-status";
    status.textContent = song.pdf ? "📄" : "⚠️ No disponible";

    a.appendChild(num);
    a.appendChild(title);
    a.appendChild(status);
    return a;
  }

  // ---------- Estadísticas ----------
  function renderStats() {
    const total = SONGS.length;
    const disponibles = SONGS.filter((s) => s.pdf).length;
    const pendientes = total - disponibles;
    const tonalidades = new Set(SONGS.map((s) => s.tonalidad)).size;

    document.getElementById("stat-total").textContent = total;
    document.getElementById("stat-disponibles").textContent = disponibles;
    document.getElementById("stat-pendientes").textContent = pendientes;
    document.getElementById("stat-tonalidades").textContent = tonalidades;
  }

  // ---------- Navegación por pestañas ----------
  function cambiarVista(view) {
    document.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.view === view);
    });
    document.querySelectorAll(".view").forEach((sec) => {
      sec.classList.toggle("active", sec.id === "view-" + view);
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  document.getElementById("tabs").addEventListener("click", (e) => {
    const btn = e.target.closest(".tab-btn");
    if (btn) cambiarVista(btn.dataset.view);
  });

  document.querySelectorAll(".quick-card").forEach((btn) => {
    btn.addEventListener("click", () => cambiarVista(btn.dataset.goto));
  });

  // ---------- Modo oscuro ----------
  const themeToggle = document.getElementById("theme-toggle");
  function aplicarTema(tema) {
    document.documentElement.setAttribute("data-theme", tema);
    localStorage.setItem("cuarteto_naranjos_tema", tema);
    themeToggle.querySelector(".theme-icon").textContent =
      tema === "dark" ? "☀" : "☾";
    themeToggle.querySelector(".theme-label").textContent =
      tema === "dark" ? "Modo día" : "Modo noche";
  }
  themeToggle.addEventListener("click", () => {
    const actual = document.documentElement.getAttribute("data-theme");
    aplicarTema(actual === "dark" ? "light" : "dark");
  });

  // ---------- Inicialización ----------
  async function init() {
    loadFavoritos();
    const temaGuardado = localStorage.getItem("cuarteto_naranjos_tema");
    if (temaGuardado) aplicarTema(temaGuardado);

    await cargarCanciones();
    poblarSelects();
    renderStats();
    renderRepertorio();
    renderTonalidades();
    renderTemas();
    renderFavoritos();
  }

  init();
})();
