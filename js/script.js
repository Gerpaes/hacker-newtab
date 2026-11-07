// Elementos del DOM
const elementoReloj = document.getElementById("reloj");
const elementoSaludo = document.getElementById("saludo");
const listaSitios = document.getElementById("sitios");
const canvasMatrix = document.getElementById("matrix");
const terminalSalida = document.getElementById("terminal-salida");
const terminalForm = document.getElementById("terminal-form");
const terminalEntrada = document.getElementById("terminal-entrada");
const notasTexto = document.getElementById("notas-texto");
const notasEstado = document.getElementById("notas-estado");
const sysmonModelo = document.getElementById("sysmon-modelo");
const cpuBarra = document.getElementById("cpu-barra");
const cpuTexto = document.getElementById("cpu-texto");
const cpuNucleos = document.getElementById("cpu-nucleos");
const ramBarra = document.getElementById("ram-barra");
const ramTexto = document.getElementById("ram-texto");
const ramDetalle = document.getElementById("ram-detalle");
const redTexto = document.getElementById("red-texto");
const pantallasTexto = document.getElementById("pantallas-texto");
const pestanasToolkit = document.querySelectorAll(".toolkit-pestana");
const decodeEntrada = document.getElementById("decode-entrada");
const decodeOperacion = document.getElementById("decode-operacion");
const decodeSalida = document.getElementById("decode-salida");
const subnetEntrada = document.getElementById("subnet-entrada");
const subnetResultado = document.getElementById("subnet-resultado");
const subnetBinario = document.getElementById("subnet-binario");
const urlEntrada = document.getElementById("url-entrada");
const urlPartes = document.getElementById("url-partes");
const urlParametros = document.getElementById("url-parametros");
const urlAvisos = document.getElementById("url-avisos");

// =========================================
// Reloj y saludo
// =========================================

// Añade un 0 delante si el número tiene una sola cifra
function dosDigitos(numero) {
  return (numero < 10 ? "0" : "") + numero;
}

// Las franjas se comprueban en orden: cada if descarta las horas anteriores
function obtenerSaludo(hora) {
  if (hora < 6) {
    return "Hora de hackear 🌙";
  } else if (hora < 14) {
    return "Buenos días";
  } else if (hora < 21) {
    return "Buenas tardes";
  } else {
    return "Buenas noches";
  }
}

// Pinta la hora y el saludo actuales
function actualizarReloj() {
  const ahora = new Date();

  const horas = ahora.getHours();
  const minutos = ahora.getMinutes();
  const segundos = ahora.getSeconds();

  elementoReloj.textContent = `${dosDigitos(horas)}:${dosDigitos(minutos)}:${dosDigitos(segundos)}`;
  elementoSaludo.textContent = obtenerSaludo(horas);
}

// =========================================
// Accesos directos
// =========================================

// Construye la URL del favicon que Chrome tiene guardado para una web
function urlFavicon(urlPagina) {
  const url = new URL(chrome.runtime.getURL("/_favicon/"));
  url.searchParams.set("pageUrl", urlPagina);
  url.searchParams.set("size", "32");
  return url.toString();
}

// Nombre a mostrar: el título, o el dominio si no tiene título
function nombreSitio(sitio) {
  return sitio.title || new URL(sitio.url).hostname;
}

// Pinta un sitio como <li><a><img><span></span></a></li> dentro de la lista
function pintarSitio(sitio) {
  const elemento = document.createElement("li");
  const enlace = document.createElement("a");
  const icono = document.createElement("img");
  const texto = document.createElement("span");

  icono.src = urlFavicon(sitio.url);
  icono.alt = "";

  texto.textContent = nombreSitio(sitio);

  enlace.href = sitio.url;
  enlace.title = sitio.url;
  enlace.appendChild(icono);
  enlace.appendChild(texto);

  elemento.appendChild(enlace);
  listaSitios.appendChild(elemento);
}

// Marcadores de la barra primero, luego los más visitados, sin repetir URLs
async function cargarSitios() {
  const [arbol, masVisitados] = await Promise.all([
    chrome.bookmarks.getTree(),
    chrome.topSites.get(),
  ]);

  const barra = arbol[0].children[0];
  const marcadores = barra.children.filter((nodo) => nodo.url);

  const todos = [...marcadores, ...masVisitados];
  const vistos = new Set();

  for (const sitio of todos) {
    if (vistos.has(sitio.url)) {
      continue;
    }
    vistos.add(sitio.url);
    pintarSitio(sitio);
  }
}

// =========================================
// Lluvia Matrix
// =========================================
const contextoMatrix = canvasMatrix.getContext("2d");
const CARACTERES_MATRIX =
  "アイウエオカキクケコサシスセソ0123456789ABCDEF<>/{}#$";
const TAMANO_LETRA = 28;
const MS_POR_FOTOGRAMA = 25; // unos 40 fotogramas por segundo

let gotas = [];
let ultimoFotograma = 0;

// Ajusta la resolución del canvas a su tamaño real y reinicia las gotas
function prepararMatrix() {
  canvasMatrix.width = canvasMatrix.clientWidth;
  canvasMatrix.height = canvasMatrix.clientHeight;

  const columnas = Math.floor(canvasMatrix.width / TAMANO_LETRA);
  gotas = Array.from({ length: columnas }, () =>
    Math.floor(Math.random() * -20),
  );
}

// Dibuja un fotograma: oscurece lo anterior y baja cada gota una fila
function dibujarMatrix() {
  const { width, height } = canvasMatrix;

  contextoMatrix.fillStyle = "rgba(2, 6, 14, 0.15)";
  contextoMatrix.fillRect(0, 0, width, height);

  contextoMatrix.font = `${TAMANO_LETRA}px monospace`;

  for (let columna = 0; columna < gotas.length; columna++) {
    const indice = Math.floor(Math.random() * CARACTERES_MATRIX.length);
    const letra = CARACTERES_MATRIX[indice];
    const x = columna * TAMANO_LETRA;
    const y = gotas[columna] * TAMANO_LETRA;

    // Casi todas verdes; alguna roja de vez en cuando, con la paleta del tema
    contextoMatrix.fillStyle =
      Math.random() < 0.03 ? "rgb(230, 57, 70)" : "rgb(60, 255, 140)";
    contextoMatrix.fillText(letra, x, y);

    if (y > height && Math.random() > 0.975) {
      gotas[columna] = 0;
    }
    gotas[columna]++;
  }
}

// Bucle de animación limitado a MS_POR_FOTOGRAMA
function animarMatrix(tiempo) {
  if (tiempo - ultimoFotograma >= MS_POR_FOTOGRAMA) {
    dibujarMatrix();
    ultimoFotograma = tiempo;
  }
  requestAnimationFrame(animarMatrix);
}

// =========================================
// Terminal de comandos
// =========================================
const PROMPT = "gerson@dev:~$";

// Cada comando: descripción para el help y función que devuelve la URL
const COMANDOS = {
  g: {
    descripcion: "Busca en Google",
    url: (texto) =>
      `https://www.google.com/search?q=${encodeURIComponent(texto)}`,
  },
  yt: {
    descripcion: "Busca en YouTube",
    url: (texto) =>
      `https://www.youtube.com/results?search_query=${encodeURIComponent(texto)}`,
  },
  gh: {
    descripcion: "Busca en GitHub",
    url: (texto) => `https://github.com/search?q=${encodeURIComponent(texto)}`,
  },
  mdn: {
    descripcion: "Busca en la documentación de MDN",
    url: (texto) =>
      `https://developer.mozilla.org/es/search?q=${encodeURIComponent(texto)}`,
  },
  so: {
    descripcion: "Busca en Stack Overflow",
    url: (texto) =>
      `https://stackoverflow.com/search?q=${encodeURIComponent(texto)}`,
  },
  bandit: {
    descripcion: "Abre OverTheWire Bandit",
    url: () => "https://overthewire.org/wargames/bandit/",
  },
  repo: {
    descripcion: "Abre un repo mío (Tab autocompleta; sin nombre: mi perfil)",
    url: (nombre) => `https://github.com/${USUARIO_GITHUB}/${nombre}`,
  },
};

// Añade una línea al historial de la terminal
function escribirLinea(texto, clase = "") {
  const linea = document.createElement("div");
  linea.textContent = texto;
  if (clase) {
    linea.className = clase;
  }
  terminalSalida.appendChild(linea);
  terminalSalida.scrollTop = terminalSalida.scrollHeight;
}

function mostrarAyuda() {
  for (const [nombre, comando] of Object.entries(COMANDOS)) {
    escribirLinea(
      `  ${nombre.padEnd(12)} ${comando.descripcion}`,
      "terminal-info",
    );
  }
  escribirLinea(`  ${"clear".padEnd(12)} Limpia la terminal`, "terminal-info");
}

// Interpreta lo que ha escrito el usuario y actúa
function ejecutarComando(textoCompleto) {
  const [nombre, ...palabras] = textoCompleto.trim().split(/\s+/);
  const argumento = palabras.join(" ");

  if (nombre === "help") {
    mostrarAyuda();
    return;
  }

  if (nombre === "clear") {
    terminalSalida.replaceChildren();
    return;
  }

  const comando = COMANDOS[nombre];
  if (!comando) {
    escribirLinea(
      `${nombre}: command not found. Escribe "help".`,
      "terminal-error",
    );
    return;
  }

  escribirLinea("→ Abriendo...", "terminal-info");
  window.location.href = comando.url(argumento);
}

const USUARIO_GITHUB = "Gerpaes";
let reposEnCache = null;

// Pide a la API de GitHub los nombres de mis repos (solo la primera vez)
async function obtenerRepos() {
  if (reposEnCache) {
    return reposEnCache;
  }

  const respuesta = await fetch(
    `https://api.github.com/users/${USUARIO_GITHUB}/repos?per_page=100`,
  );
  if (!respuesta.ok) {
    throw new Error(`GitHub respondió ${respuesta.status}`);
  }

  const repos = await respuesta.json();
  reposEnCache = repos.map((repo) => repo.name);
  return reposEnCache;
}

// Parte común al principio de varios textos: ["ror5_app", "ror5_api"] → "ror5_ap"
function prefijoComun(textos) {
  let prefijo = textos[0];
  for (const texto of textos) {
    while (!texto.toLowerCase().startsWith(prefijo.toLowerCase())) {
      prefijo = prefijo.slice(0, -1);
    }
  }
  return prefijo;
}

// Completa el comando o el nombre del repo al pulsar Tab
async function autocompletar() {
  const texto = terminalEntrada.value;
  const [nombre, ...palabras] = texto.trimStart().split(/\s+/);

  // Caso 1: aún escribiendo el comando → completar el nombre del comando
  if (palabras.length === 0) {
    const coincidencias = Object.keys(COMANDOS).filter((comando) =>
      comando.startsWith(nombre),
    );
    if (coincidencias.length === 1) {
      terminalEntrada.value = `${coincidencias[0]} `;
    }
    return;
  }

  // Caso 2: "repo algo" → completar con mis repositorios
  if (nombre !== "repo") {
    return;
  }

  const parcial = palabras.join(" ");
  let repos;
  try {
    repos = await obtenerRepos();
  } catch (error) {
    escribirLinea(`No se pudo leer GitHub: ${error.message}`, "terminal-error");
    return;
  }

  const coincidencias = repos.filter((repo) =>
    repo.toLowerCase().startsWith(parcial.toLowerCase()),
  );

  if (coincidencias.length === 0) {
    escribirLinea(
      `Ningún repo público empieza por "${parcial}" (${repos.length} repos encontrados)`,
      "terminal-error",
    );
    return;
  }
  if (coincidencias.length === 1) {
    terminalEntrada.value = `repo ${coincidencias[0]}`;
    return;
  }

  escribirLinea(coincidencias.join("   "), "terminal-info");
  terminalEntrada.value = `repo ${prefijoComun(coincidencias)}`;
}

terminalEntrada.addEventListener("keydown", (evento) => {
  if (evento.key === "Tab") {
    evento.preventDefault();
    autocompletar();
  }
});

terminalForm.addEventListener("submit", (evento) => {
  evento.preventDefault();

  const texto = terminalEntrada.value;
  terminalEntrada.value = "";
  if (texto.trim() === "") {
    return;
  }

  escribirLinea(`${PROMPT} ${texto}`);
  ejecutarComando(texto);
});

// =========================================
// Notas rápidas
// =========================================
const CLAVE_NOTAS = "notas";
const MS_ESPERA_GUARDADO = 800;

let temporizadorGuardado = null;

// Lee la nota guardada en la cuenta de Google y la muestra
async function cargarNotas() {
  const datos = await chrome.storage.sync.get(CLAVE_NOTAS);
  notasTexto.value = datos[CLAVE_NOTAS] || "";
}

async function guardarNotas() {
  try {
    await chrome.storage.sync.set({ [CLAVE_NOTAS]: notasTexto.value });
    notasEstado.textContent = "✓ guardado";
  } catch (error) {
    notasEstado.textContent = `✗ ${error.message}`;
  }
}

// Espera a que dejes de escribir antes de guardar (debounce)
notasTexto.addEventListener("input", () => {
  notasEstado.textContent = "…";
  clearTimeout(temporizadorGuardado);
  temporizadorGuardado = setTimeout(guardarNotas, MS_ESPERA_GUARDADO);
});

// =========================================
// Monitor del sistema (CPU y RAM)
// =========================================
const BYTES_POR_GB = 1024 ** 3;

let muestraAnterior = null;

// Verde si va holgado, amarillo si va cargado, rojo si va al límite
function colorSegunUso(porcentaje) {
  if (porcentaje < 60) {
    return "rgb(60, 255, 140)";
  } else if (porcentaje < 85) {
    return "rgb(230, 180, 60)";
  } else {
    return "rgb(230, 57, 70)";
  }
}

function pintarBarra(barra, texto, porcentaje) {
  barra.style.width = `${porcentaje}%`;
  barra.style.backgroundColor = colorSegunUso(porcentaje);
  texto.textContent = `${Math.round(porcentaje)}%`;
}

// Uso de un núcleo entre dos muestras: tiempo ocupado / tiempo total
function usoEntreMuestras(actual, anterior) {
  const total = actual.total - anterior.total;
  const libre = actual.idle - anterior.idle;
  return total > 0 ? ((total - libre) / total) * 100 : 0;
}

function pintarNucleos(usos) {
  // La primera vez, crea una barra por núcleo
  if (cpuNucleos.children.length !== usos.length) {
    cpuNucleos.replaceChildren(
      ...usos.map(() => {
        const barra = document.createElement("div");
        barra.className = "nucleo";
        return barra;
      }),
    );
  }

  usos.forEach((uso, indice) => {
    const barra = cpuNucleos.children[indice];
    barra.style.height = `${uso}%`;
    barra.style.backgroundColor = colorSegunUso(uso);
  });
}

async function actualizarSysmon() {
  const [cpu, memoria] = await Promise.all([
    chrome.system.cpu.getInfo(),
    chrome.system.memory.getInfo(),
  ]);

  sysmonModelo.textContent = cpu.modelName;

  // CPU: hacen falta dos muestras para calcular el uso
  if (muestraAnterior) {
    const usos = cpu.processors.map((nucleo, indice) =>
      usoEntreMuestras(nucleo.usage, muestraAnterior[indice].usage),
    );
    const media = usos.reduce((suma, uso) => suma + uso, 0) / usos.length;

    pintarBarra(cpuBarra, cpuTexto, media);
    pintarNucleos(usos);
  }
  muestraAnterior = cpu.processors;

  // RAM
  const usada = memoria.capacity - memoria.availableCapacity;
  pintarBarra(ramBarra, ramTexto, (usada / memoria.capacity) * 100);
  ramDetalle.textContent = `${(usada / BYTES_POR_GB).toFixed(1)} / ${(memoria.capacity / BYTES_POR_GB).toFixed(1)} GB`;
}

// --- Red: estado y latencia ---
const URL_PING = "https://www.google.com/generate_204";
const MS_ENTRE_PINGS = 5000;
const MS_LIMITE_PING = 3000;

async function medirPing() {
    if (!navigator.onLine) {
      redTexto.replaceChildren(crearEstado("● offline", "estado-offline"));
      return;
    }

  const inicio = performance.now();
  try {
    await fetch(URL_PING, {
      mode: "no-cors",
      cache: "no-store",
      signal: AbortSignal.timeout(MS_LIMITE_PING),
    });
    const ms = Math.round(performance.now() - inicio);
    redTexto.replaceChildren(
      crearEstado("● online", "estado-online"),
      `   ping ${ms} ms`,
    );
  } catch {
    redTexto.replaceChildren(
      crearEstado("● sin respuesta", "estado-offline"),
      `   > ${MS_LIMITE_PING} ms`,
    );
  }
}

// Crea un <span> con texto y clase de color
function crearEstado(texto, clase) {
  const span = document.createElement("span");
  span.className = clase;
  span.textContent = texto;
  return span;
}

// --- Pantallas conectadas ---
async function mostrarPantallas() {
  const pantallas = await chrome.system.display.getInfo();
  pantallasTexto.textContent = pantallas
    .map(
      (p) => `${p.isPrimary ? "★ " : ""}${p.bounds.width}×${p.bounds.height}`,
    )
    .join("   ");
  pantallasTexto.title = pantallas.map((p) => p.name).join(" | ");
}

// =========================================
// Caja de herramientas: pestañas
// =========================================
function activarPestana(pestanaElegida) {
  for (const pestana of pestanasToolkit) {
    const activa = pestana === pestanaElegida;
    pestana.setAttribute("aria-selected", activa);
    document.getElementById(pestana.getAttribute("aria-controls")).hidden = !activa;
  }
}

for (const pestana of pestanasToolkit) {
  pestana.addEventListener("click", () => activarPestana(pestana));
}

// =========================================
// Caja de herramientas: decode
// =========================================

// Texto ↔ bytes en UTF-8 (necesario para tildes, ñ y emojis)
const textoABytes = (texto) => new TextEncoder().encode(texto);
const bytesATexto = (bytes) => new TextDecoder().decode(bytes);

function bytesAHex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function hexABytes(hex) {
  const limpio = hex.replace(/\s+/g, "");
  if (!/^([0-9a-f]{2})*$/i.test(limpio)) {
    throw new Error("No es hexadecimal válido (pares de 0-9 y a-f)");
  }
  return Uint8Array.from(limpio.match(/../g) ?? [], (par) => parseInt(par, 16));
}

// Desplaza cada letra 13 posiciones; el resto de caracteres se queda igual
function rot13(texto) {
  return texto.replace(/[a-z]/gi, (letra) => {
    const base = letra <= "Z" ? 65 : 97; // código de "A" o de "a"
    return String.fromCharCode(((letra.charCodeAt(0) - base + 13) % 26) + base);
  });
}

// Cada operación: cómo codificar y cómo decodificar (null si no se puede)
const OPERACIONES = {
  base64: {
    codificar: (texto) => btoa(String.fromCharCode(...textoABytes(texto))),
    decodificar: (texto) =>
      bytesATexto(Uint8Array.from(atob(texto.trim()), (c) => c.charCodeAt(0))),
  },
  hex: {
    codificar: (texto) => bytesAHex(textoABytes(texto)),
    decodificar: (texto) => bytesATexto(hexABytes(texto)),
  },
  rot13: {
    codificar: rot13,
    decodificar: rot13,
  },
  url: {
    codificar: encodeURIComponent,
    decodificar: decodeURIComponent,
  },
  sha256: {
    codificar: async (texto) =>
      bytesAHex(new Uint8Array(await crypto.subtle.digest("SHA-256", textoABytes(texto)))),
    decodificar: null,
  },
};

function mostrarResultado(texto, esError = false) {
  decodeSalida.textContent = texto;
  decodeSalida.classList.toggle("error", esError);
}

async function transformar(direccion) {
  const operacion = OPERACIONES[decodeOperacion.value];
  const funcion = operacion[direccion];

  if (!funcion) {
    mostrarResultado("✗ Un hash es de un solo sentido: no se puede decodificar.", true);
    return;
  }

  try {
    mostrarResultado(await funcion(decodeEntrada.value));
  } catch (error) {
    mostrarResultado(`✗ ${error.message}`, true);
  }
}

document.getElementById("decode-codificar").addEventListener("click", () => transformar("codificar"));
document.getElementById("decode-decodificar").addEventListener("click", () => transformar("decodificar"));

document.getElementById("decode-copiar").addEventListener("click", async () => {
  await navigator.clipboard.writeText(decodeSalida.textContent);
});

// Pasa el resultado a la entrada para encadenar operaciones
document.getElementById("decode-reutilizar").addEventListener("click", () => {
  decodeEntrada.value = decodeSalida.textContent;
  mostrarResultado("");
});

// =========================================
// Caja de herramientas: subnet
// =========================================

// "192.168.1.10" → número de 32 bits sin signo
function ipANumero(ip) {
  const octetos = ip.split(".").map(Number);
  const valida =
    octetos.length === 4 &&
    octetos.every((o) => Number.isInteger(o) && o >= 0 && o <= 255);

  if (!valida) {
    throw new Error(`"${ip}" no es una IPv4 válida`);
  }
  return octetos.reduce((acumulado, octeto) => ((acumulado << 8) | octeto) >>> 0, 0);
}

// Número de 32 bits → "192.168.1.10"
function numeroAIp(numero) {
  return [24, 16, 8, 0].map((desplazamiento) => (numero >>> desplazamiento) & 255).join(".");
}

// /24 → 11111111.11111111.11111111.00000000
function mascaraDesdePrefijo(prefijo) {
  return prefijo === 0 ? 0 : (0xffffffff << (32 - prefijo)) >>> 0;
}

// ¿Está la IP dentro de la red red/prefijo?
function enRango(ip, red, prefijo) {
  const mascara = mascaraDesdePrefijo(prefijo);
  return ((ip & mascara) >>> 0) === ((ipANumero(red) & mascara) >>> 0);
}

const RANGOS_ESPECIALES = [
  { red: "10.0.0.0", prefijo: 8, tipo: "privada" },
  { red: "172.16.0.0", prefijo: 12, tipo: "privada" },
  { red: "192.168.0.0", prefijo: 16, tipo: "privada" },
  { red: "127.0.0.0", prefijo: 8, tipo: "loopback" },
  { red: "169.254.0.0", prefijo: 16, tipo: "link-local" },
];

function tipoDeIp(ip) {
  const rango = RANGOS_ESPECIALES.find((r) => enRango(ip, r.red, r.prefijo));
  return rango ? `${rango.tipo} (${rango.red}/${rango.prefijo})` : "pública";
}

function calcularSubred(texto) {
  const [ipTexto, prefijoTexto = "32"] = texto.trim().split("/");
  const prefijo = Number(prefijoTexto);

  if (!Number.isInteger(prefijo) || prefijo < 0 || prefijo > 32) {
    throw new Error("El prefijo debe ser un número entre 0 y 32");
  }

  const ip = ipANumero(ipTexto);
  const mascara = mascaraDesdePrefijo(prefijo);
  const red = (ip & mascara) >>> 0;
  const broadcast = (red | ~mascara) >>> 0;
  const bitsHost = 32 - prefijo;

  // /31 y /32 son casos especiales: no reservan red ni broadcast
  const hostsUtiles = prefijo >= 31 ? 2 ** bitsHost : 2 ** bitsHost - 2;
  const primero = prefijo >= 31 ? red : red + 1;
  const ultimo = prefijo >= 31 ? broadcast : broadcast - 1;

  return {
    ip, prefijo, bitsHost,
    filas: [
      ["IP", numeroAIp(ip)],
      ["Máscara", numeroAIp(mascara)],
      ["Wildcard", numeroAIp(~mascara >>> 0)],
      ["Red", numeroAIp(red)],
      ["Broadcast", numeroAIp(broadcast)],
      ["Rango", `${numeroAIp(primero)} – ${numeroAIp(ultimo)}`],
      ["Hosts útiles", hostsUtiles.toLocaleString("es-ES")],
      ["Tipo", tipoDeIp(ip)],
    ],
  };
}

// 32 bits con puntos cada 8, coloreando red y host
function pintarBinario(ip, prefijo) {
  const bits = ip.toString(2).padStart(32, "0");
  const conPuntos = (cadena, inicio) =>
    [...cadena].map((bit, i) => ((inicio + i) % 8 === 0 && inicio + i > 0 ? "." : "") + bit).join("");

  const red = document.createElement("span");
  red.className = "bits-red";
  red.textContent = conPuntos(bits.slice(0, prefijo), 0);

  const host = document.createElement("span");
  host.className = "bits-host";
  host.textContent = conPuntos(bits.slice(prefijo), prefijo);

  subnetBinario.replaceChildren(red, host);
}

function actualizarSubred() {
  try {
    const { ip, prefijo, filas } = calcularSubred(subnetEntrada.value);

    subnetResultado.replaceChildren(
      ...filas.flatMap(([nombre, valor]) => {
        const dt = document.createElement("dt");
        const dd = document.createElement("dd");
        dt.textContent = nombre;
        dd.textContent = valor;
        return [dt, dd];
      })
    );
    pintarBinario(ip, prefijo);
  } catch (error) {
    const aviso = document.createElement("p");
    aviso.className = "error";
    aviso.textContent = `✗ ${error.message}`;
    subnetResultado.replaceChildren(aviso);
    subnetBinario.replaceChildren();
  }
}

subnetEntrada.addEventListener("input", actualizarSubred);

// =========================================
// Caja de herramientas: url
// =========================================
const PUERTOS_ESTANDAR = { "http:": "80", "https:": "443" };

const PARAMETROS_REDIRECCION = [
  "redirect", "redirect_uri", "redirect_url", "url", "next", "return",
  "returnto", "return_to", "goto", "dest", "destination", "continue",
];

const PATRONES_SOSPECHOSOS = [
  { patron: /<script|javascript:|on(error|load)\s*=/i, aviso: "Posible XSS: código JavaScript en la URL" },
  { patron: /('|")\s*(or|and)\s|union\s+select|;\s*drop\s/i, aviso: "Posible inyección SQL" },
  { patron: /\.\.[/\\]/, aviso: "Posible path traversal (../)" },
  { patron: /%00|\0/, aviso: "Byte nulo (%00): se usa para cortar rutas o validaciones" },
];

// Rellena un <dl> con pares [nombre, valor]; las filas con un solo elemento son subtítulos
function pintarFilas(lista, filas) {
  lista.replaceChildren(
    ...filas.flatMap(([nombre, valor]) => {
      if (valor === undefined) {
        const subtitulo = document.createElement("dt");
        subtitulo.className = "toolkit-subtitulo";
        subtitulo.textContent = nombre;
        return [subtitulo];
      }
      const dt = document.createElement("dt");
      const dd = document.createElement("dd");
      dt.textContent = nombre;
      dd.textContent = valor;
      return [dt, dd];
    })
  );
}

function analizarUrl(texto) {
  const avisos = [];
  let url;

  try {
    url = new URL(texto.trim());
  } catch {
    throw new Error("No es una URL válida. ¿Falta el protocolo (https://)?");
  }

  // Protocolo
  if (url.protocol === "http:") {
    avisos.push(["medio", "Usa http: los datos viajan sin cifrar"]);
  } else if (url.protocol === "javascript:" || url.protocol === "data:") {
    avisos.push(["alto", `Protocolo ${url.protocol} puede ejecutar código al abrirlo`]);
  }

  // Truco de la @
  if (url.username || url.password) {
    avisos.push(["alto", `Lleva "usuario@" delante del dominio: el navegador irá a ${url.hostname}`]);
  }

  // Homógrafos: el navegador ya convierte el dominio a Punycode
  if (url.hostname.split(".").some((parte) => parte.startsWith("xn--"))) {
    avisos.push(["alto", `Dominio con caracteres de otros alfabetos (${url.hostname}): posible suplantación`]);
  }

  // IP directa
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(url.hostname)) {
    avisos.push(["medio", "Usa una IP en lugar de un dominio"]);
  }

  // Puerto no estándar
  if (url.port && url.port !== PUERTOS_ESTANDAR[url.protocol]) {
    avisos.push(["medio", `Puerto no estándar (${url.port})`]);
  }

  // Parámetros que redirigen a otra web
  for (const [nombre, valor] of url.searchParams) {
    const esRedireccion = PARAMETROS_REDIRECCION.includes(nombre.toLowerCase());
    if (esRedireccion && /^(https?:)?\/\//i.test(valor)) {
      avisos.push(["alto", `Parámetro "${nombre}" redirige a otra web: posible open redirect`]);
    }
  }

  // Patrones de ataque en la URL decodificada
  let decodificada = texto;
  try {
    decodificada = decodeURIComponent(texto);
  } catch {
    avisos.push(["medio", "Tiene codificación % mal formada"]);
  }
  for (const { patron, aviso } of PATRONES_SOSPECHOSOS) {
    if (patron.test(decodificada)) {
      avisos.push(["alto", aviso]);
    }
  }

  const partes = [
    ["Protocolo", url.protocol],
    ["Usuario", url.username || "—"],
    ["Dominio", url.hostname],
    ["Puerto", url.port || `${PUERTOS_ESTANDAR[url.protocol] ?? "—"} (por defecto)`],
    ["Ruta", url.pathname],
    ["Fragmento", url.hash || "—"],
  ];

  const parametros = [...url.searchParams];

  return { partes, parametros, avisos };
}

function actualizarUrl() {
  const texto = urlEntrada.value;

  if (texto.trim() === "") {
    urlPartes.replaceChildren();
    urlParametros.replaceChildren();
    urlAvisos.replaceChildren();
    return;
  }

  try {
    const { partes, parametros, avisos } = analizarUrl(texto);

    pintarFilas(urlPartes, partes);
    pintarFilas(
      urlParametros,
      parametros.length > 0 ? [[`Parámetros (${parametros.length})`], ...parametros] : []
    );

    const lineas = avisos.length > 0 ? avisos : [["ok", "Sin señales sospechosas evidentes"]];
    urlAvisos.replaceChildren(
      ...lineas.map(([nivel, mensaje]) => {
        const li = document.createElement("li");
        li.className = `aviso-${nivel}`;
        li.textContent = `${nivel === "ok" ? "✓" : "⚠"} ${mensaje}`;
        return li;
      })
    );
  } catch (error) {
    pintarFilas(urlPartes, []);
    urlParametros.replaceChildren();
    const li = document.createElement("li");
    li.className = "aviso-alto";
    li.textContent = `✗ ${error.message}`;
    urlAvisos.replaceChildren(li);
  }
}

urlEntrada.addEventListener("input", actualizarUrl);

// =========================================
// Pantallas sobre la imagen de fondo
// =========================================
const ANCHO_IMAGEN = 1920;
const ALTO_IMAGEN = 1080;

// Zonas de la imagen original (x, y, ancho, alto) donde va cada elemento
const PANTALLAS = {
  matrix: { x: 40, y: 499, ancho: 560, alto: 341 },
  terminal: { x: 48, y: 124, ancho: 544, alto: 304 },
  teclado: { x: 1480, y: 900, ancho: 300, alto: 50 },
  notas: { x: 650, y: 102, ancho: 620, alto: 250 },
  sysmon: { x: 1320, y: 499, ancho: 560, alto: 341 },
  toolkit: { x: 1320, y: 86, ancho: 560, alto: 384 },
};

// Coloca un elemento encima de su zona, imitando background-size: cover
function colocarPantalla(elemento, zona) {
  const escala = Math.max(
    window.innerWidth / ANCHO_IMAGEN,
    window.innerHeight / ALTO_IMAGEN,
  );
  const desfaseX = (window.innerWidth - ANCHO_IMAGEN * escala) / 2;
  const desfaseY = (window.innerHeight - ALTO_IMAGEN * escala) / 2;

  elemento.style.left = `${desfaseX + zona.x * escala}px`;
  elemento.style.top = `${desfaseY + zona.y * escala}px`;
  elemento.style.width = `${zona.ancho * escala}px`;
  elemento.style.height = `${zona.alto * escala}px`;
}

function colocarTodas() {
  colocarPantalla(canvasMatrix, PANTALLAS.matrix);
  colocarPantalla(document.getElementById("terminal"), PANTALLAS.terminal);
  colocarPantalla(document.getElementById("notas"), PANTALLAS.notas);
  colocarPantalla(document.getElementById("sysmon"), PANTALLAS.sysmon);
  colocarPantalla(document.querySelector(".accesos"), PANTALLAS.teclado);
  colocarPantalla(document.getElementById("toolkit"), PANTALLAS.toolkit);
  prepararMatrix();
}

// =========================================
// Arranque
// =========================================

// Colocación de pantallas
colocarTodas();
window.addEventListener("resize", colocarTodas);

// Reloj y saludo
actualizarReloj();
setInterval(actualizarReloj, 1000);

// Contenido de las pantallas
cargarSitios();
cargarNotas();
requestAnimationFrame(animarMatrix);
escribirLinea('Escribe "help" para ver los comandos.', "terminal-info");


// Monitor del sistema
actualizarSysmon();
setInterval(actualizarSysmon, 1000);
medirPing();
setInterval(medirPing, MS_ENTRE_PINGS);
window.addEventListener("online", medirPing);
window.addEventListener("offline", medirPing);
mostrarPantallas();
chrome.system.display.onDisplayChanged.addListener(mostrarPantallas);
actualizarSubred();