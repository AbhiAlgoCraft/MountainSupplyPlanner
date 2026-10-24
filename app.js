const towns = ["Himgaun", "Pinegaon", "Valley End", "Devdar", "Meghavan", "Ridgepur", "West Pass", "Devgarh Depot"];
const points = {
  "Himgaun": [60, 125], "Pinegaon": [190, 62], "Valley End": [345, 40], "Devdar": [330, 150],
  "Meghavan": [500, 65], "Ridgepur": [500, 205], "West Pass": [190, 245], "Devgarh Depot": [675, 135]
};
const defaultRoads = [
  ["R1", "Himgaun", "Pinegaon", 4], ["R2", "Pinegaon", "Valley End", 3], ["R3", "Pinegaon", "Devdar", 6],
  ["R8", "West Pass", "Devdar", 5], ["R4", "Devdar", "Ridgepur", 2], ["R5", "Ridgepur", "Devgarh Depot", 3], ["R6", "Devdar", "Meghavan", 2],
  ["R7", "Meghavan", "Devgarh Depot", 15], ["R9", "Pinegaon", "Meghavan", 15],
  ["R10", "Himgaun", "Devdar", 12], ["R11", "Valley End", "Meghavan", 2]
];
const $ = id => document.getElementById(id);
const html = value => String(value).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[c]);

function demoState() {
  return {
    roads: defaultRoads.map(([id, a, b, km]) => ({ id, a, b, km, open: true })),
    shipments: [{
      id: "SHP-1001", origin: "Himgaun", destination: "Devgarh Depot", supply: "Food boxes", unit: "boxes", total: 24,
      loads: [
        { id: "SHP-1001-01", vehicle: "Truck 1", planned: 10, received: 10, reference: "RCV-1001-01" },
        { id: "SHP-1001-02", vehicle: "Truck 2", planned: 8, received: 5, reference: "RCV-1001-02" },
        { id: "SHP-1001-03", vehicle: "Truck 3", planned: 6, received: null, reference: "" }
      ]
    }], nextShipment: 1002
  };
}
function readState() {
  try {
    const saved = JSON.parse(localStorage.getItem("mountainSupplyDemo"));
    if (saved && Array.isArray(saved.roads) && Array.isArray(saved.shipments)) {
      const previousStatus = new Map(saved.roads.map(road => [road.id, road.open]));
      const roads = defaultRoads.map(([id, a, b, km]) => ({ id, a, b, km, open: previousStatus.get(id) ?? true }));
      return { ...demoState(), ...saved, roads, nextShipment: Number.isInteger(saved.nextShipment) ? saved.nextShipment : 1002 };
    }
  } catch (_) { /* Use fresh sample data if browser storage is unavailable. */ }
  return demoState();
}
let state = readState();
let shownRoute = { towns: [], roads: [], events: [], tree: null };
let dfsTimer = null;
let dfsEventIndex = 0;
let activeDfsNodeId = 0;
let shipmentTimer = null;
function saveState() {
  try { localStorage.setItem("mountainSupplyDemo", JSON.stringify(state)); } catch (_) { /* Keep the current demo usable without storage. */ }
}
function fillSelect(id, chosen) {
  $(id).innerHTML = towns.map(town => `<option value="${html(town)}">${html(town)}</option>`).join("");
  if (chosen) $(id).value = chosen;
}

// Build a DFS tree and a sequence of events for the Play and Next step controls.
function findDfsPath(start, destination) {
  let nextNodeId = 1;
  const visited = new Set([start]);
  const tree = { id: 0, town: start, via: "", state: "start", children: [] };
  const events = [];
  const pathTowns = [start], pathRoads = [];
  function visit(current, node) {
    if (current === destination) { events.push({ type: "state", id: node.id, state: "found" }); return true; }
    for (const road of state.roads) {
      if (!road.open) continue;
      const next = road.a === current ? road.b : road.b === current ? road.a : null;
      if (!next || visited.has(next)) continue;
      const child = { id: nextNodeId++, town: next, via: road.id, state: "new", children: [] };
      node.children.push(child);
      events.push({ type: "add", id: child.id });
      visited.add(next); pathTowns.push(next); pathRoads.push(road.id);
      if (visit(next, child)) {
        if (node.id !== 0) events.push({ type: "state", id: node.id, state: "route" });
        return true;
      }
      visited.delete(next); pathTowns.pop(); pathRoads.pop();
      events.push({ type: "state", id: child.id, state: child.children.length ? "backtracked" : "dead" });
      events.push({ type: "active", id: node.id });
    }
    return false;
  }
  if (start === destination) { tree.state = "found"; return { found: true, towns: [start], roads: [], distanceKm: 0, events, tree }; }
  const found = visit(start, tree);
  if (!found) events.push({ type: "state", id: 0, state: "dead" });
  const distanceKm = found ? pathRoads.reduce((sum, id) => sum + state.roads.find(road => road.id === id).km, 0) : null;
  return { found, towns: found ? pathTowns : [], roads: found ? pathRoads : [], distanceKm, events, tree };
}

function pathResult(start, destination, parent, distances = null) {
  if (start === destination) return { found: true, towns: [start], roads: [], distanceKm: 0 };
  if (!parent.has(destination)) return { found: false, towns: [], roads: [], distanceKm: null };
  const routeTowns = [destination], routeRoads = [];
  let current = destination;
  while (current !== start) {
    const previous = parent.get(current);
    routeRoads.unshift(previous.roadId); current = previous.town; routeTowns.unshift(current);
  }
  const distanceKm = distances ? distances.get(destination) : routeRoads.reduce((sum, id) => sum + state.roads.find(road => road.id === id).km, 0);
  return { found: true, towns: routeTowns, roads: routeRoads, distanceKm };
}

// BFS uses a queue, so it finds a route with the fewest road segments.
function findBfsPath(start, destination) {
  const queue = [start], visited = new Set([start]), parent = new Map();
  for (let head = 0; head < queue.length && !visited.has(destination); head++) {
    const current = queue[head];
    for (const road of state.roads) {
      if (!road.open) continue;
      const next = road.a === current ? road.b : road.b === current ? road.a : null;
      if (!next || visited.has(next)) continue;
      visited.add(next); parent.set(next, { town: current, roadId: road.id }); queue.push(next);
    }
  }
  return pathResult(start, destination, parent);
}

class MinPriorityQueue {
  constructor() { this.items = []; }
  push(item) {
    this.items.push(item); let index = this.items.length - 1;
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (this.items[parent].distance <= item.distance) break;
      this.items[index] = this.items[parent]; index = parent;
    }
    this.items[index] = item;
  }
  pop() {
    if (!this.items.length) return null;
    const first = this.items[0], last = this.items.pop();
    if (this.items.length) {
      let index = 0;
      while (true) {
        const left = index * 2 + 1, right = left + 1;
        if (left >= this.items.length) break;
        const child = right < this.items.length && this.items[right].distance < this.items[left].distance ? right : left;
        if (this.items[child].distance >= last.distance) break;
        this.items[index] = this.items[child]; index = child;
      }
      this.items[index] = last;
    }
    return first;
  }
  get size() { return this.items.length; }
}

// Dijkstra uses a min-priority queue to process the currently cheapest known town.
function findDijkstraPath(start, destination) {
  const distance = new Map(towns.map(town => [town, Infinity]));
  const parent = new Map(), queue = new MinPriorityQueue();
  distance.set(start, 0); queue.push({ town: start, distance: 0 });
  while (queue.size) {
    const current = queue.pop();
    if (current.distance !== distance.get(current.town)) continue;
    if (current.town === destination) break;
    for (const road of state.roads) {
      if (!road.open) continue;
      const next = road.a === current.town ? road.b : road.b === current.town ? road.a : null;
      if (!next) continue;
      const candidate = current.distance + road.km;
      if (candidate >= distance.get(next)) continue;
      distance.set(next, candidate); parent.set(next, { town: current.town, roadId: road.id });
      queue.push({ town: next, distance: candidate });
    }
  }
  return pathResult(start, destination, parent, distance);
}

function indexTree(node, map = new Map()) { map.set(node.id, node); node.children.forEach(child => indexTree(child, map)); return map; }
function treeNodeMarkup(node) {
  const labels = { start: "Start", new: "Not visited", active: "Current", route: "Route", found: "Destination", dead: "Dead end", backtracked: "Backtracked" };
  const classes = ["tree-town", node.state, node.id === activeDfsNodeId ? "current" : ""].filter(Boolean).join(" ");
  return `<li><span class="${classes}"><b>${html(node.town)}</b><small>${html(node.via || "Start")}</small><em>${labels[node.state] || "Not visited"}</em></span>${node.children.length ? `<ul>${node.children.map(treeNodeMarkup).join("")}</ul>` : ""}</li>`;
}
function renderDfsTree() {
  const host = $("searchTree");
  host.innerHTML = `<ul class="dfs-tree" aria-label="Complete DFS parent-and-branches tree">${treeNodeMarkup(shownRoute.tree)}</ul>`;
  $("dfsProgress").textContent = shownRoute.events.length ? `${dfsEventIndex} of ${shownRoute.events.length} steps` : "Start and destination are the same town";
  $("playDfs").disabled = shownRoute.events.length === 0;
  $("stepDfs").disabled = dfsEventIndex >= shownRoute.events.length;
  if (dfsEventIndex >= shownRoute.events.length) { stopDfsPlayback(); $("playDfs").textContent = "▶ Play again"; }
}
function applyNextDfsEvent() {
  if (dfsEventIndex >= shownRoute.events.length) { renderDfsTree(); return; }
  const event = shownRoute.events[dfsEventIndex++];
  const nodes = indexTree(shownRoute.tree);
  activeDfsNodeId = event.id;
  if (event.type === "state" && nodes.has(event.id)) nodes.get(event.id).state = event.state;
  renderDfsTree();
}
function stopDfsPlayback() { if (dfsTimer) { clearInterval(dfsTimer); dfsTimer = null; } }
function restartDfs() {
  stopDfsPlayback(); dfsEventIndex = 0; activeDfsNodeId = 0;
  function reset(node, root = false) { node.state = root ? (shownRoute.found && shownRoute.roads.length === 0 ? "found" : "start") : "new"; node.children.forEach(child => reset(child)); }
  reset(shownRoute.tree, true);
  $("playDfs").textContent = "▶ Play"; renderDfsTree();
}
function toggleDfsPlayback() {
  if (dfsTimer) { stopDfsPlayback(); $("playDfs").textContent = "▶ Play"; return; }
  if (dfsEventIndex >= shownRoute.events.length) restartDfs();
  $("playDfs").textContent = "Ⅱ Pause";
  dfsTimer = setInterval(() => {
    if (dfsEventIndex >= shownRoute.events.length) { stopDfsPlayback(); renderDfsTree(); return; }
    applyNextDfsEvent();
  }, 750);
}

function renderMap() {
  const highlighted = new Set(shownRoute.roads);
  const svg = $("townMap");
  const lines = state.roads.map(road => {
    const [x1, y1] = points[road.a], [x2, y2] = points[road.b];
    const midx = (x1 + x2) / 2, midy = (y1 + y2) / 2;
    const css = !road.open ? "road-edge closed" : highlighted.has(road.id) ? "road-edge selected" : "road-edge";
    return `<g><line class="${css}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/><rect class="edge-label-bg" x="${midx - 20}" y="${midy - 11}" width="40" height="16" rx="6"/><text class="edge-label" x="${midx}" y="${midy}" text-anchor="middle">${road.km} km</text></g>`;
  }).join("");
  const start = $("startTown").value, end = $("endTown").value;
  const nodes = towns.map(town => {
    const [x, y] = points[town];
    const kind = town === start ? "start" : town === end ? "end" : "";
    return `<g><circle class="town-node ${kind}" cx="${x}" cy="${y}" r="13"/><text class="town-letter" x="${x}" y="${y + 4}" text-anchor="middle">${kind === "start" ? "S" : kind === "end" ? "D" : ""}</text><text class="town-label" x="${x}" y="${y + 30}" text-anchor="middle">${html(town)}</text></g>`;
  }).join("");
  svg.innerHTML = `${lines}${nodes}`;
}

function renderRoadControls() {
  $("roadControls").innerHTML = state.roads.map(road => `<button class="road-toggle ${road.open ? "" : "is-closed"}" data-road="${road.id}" type="button"><span class="road-light"></span>${road.id} · ${html(road.a)}–${html(road.b)} · ${road.km} km <b>${road.open ? "Open" : "Blocked"}</b></button>`).join("");
  document.querySelectorAll("[data-road]").forEach(button => button.addEventListener("click", () => {
    const road = state.roads.find(item => item.id === button.dataset.road);
    road.open = !road.open;
    saveState(); runRoute();
  }));
}
function runRoute() {
  stopDfsPlayback();
  const start = $("startTown").value, destination = $("endTown").value, method = $("routeMethod").value;
  shownRoute = method === "bfs" ? findBfsPath(start, destination) : method === "dijkstra" ? findDijkstraPath(start, destination) : findDfsPath(start, destination);
  dfsEventIndex = 0; activeDfsNodeId = 0; $("playDfs").textContent = "▶ Play";
  const usesDfs = method === "dfs";
  $("dfsOnly").hidden = !usesDfs;
  $("algorithmHelp").hidden = usesDfs;
  $("visualizationTitle").textContent = usesDfs ? "DFS TREE SIMULATION" : `${method === "bfs" ? "BFS" : "DIJKSTRA"} ROUTE METHOD`;
  $("algorithmHelp").innerHTML = method === "bfs"
    ? "<b>BFS (Breadth-First Search)</b><p>A queue checks towns in layers. With every road treated equally, BFS finds a route using the fewest road segments.</p>"
    : method === "dijkstra"
      ? "<b>Dijkstra’s shortest-path algorithm</b><p>A min-priority queue chooses the town with the lowest known distance. It finds the route with the lowest total kilometres.</p>"
      : "";
  const methodDetail = method === "bfs" ? "BFS · fewest road segments" : method === "dijkstra" ? "Dijkstra · lowest total distance" : "DFS · first route found; not guaranteed shortest";
  $("routeResult").innerHTML = shownRoute.found
    ? `<span class="route-path">${shownRoute.towns.map(html).join(" → ")}</span><span class="detail">${methodDetail}<br>${shownRoute.roads.length} road segments · ${shownRoute.distanceKm} km</span>`
    : `<b class="error-text">No route found.</b><span class="detail">Reopen a blocked road or select another destination.</span>`;
  if (usesDfs) renderDfsTree();
  renderMap(); renderRoadControls();
}

function simulateShipmentLoading() {
  if (shipmentTimer) { clearInterval(shipmentTimer); shipmentTimer = null; }
  const form = $("shipmentForm");
  const total = Number(form.elements.total.value), unit = form.elements.unit.value;
  const amounts = String(form.elements.loads.value).split(",").map(value => Number(value.trim()));
  const host = $("shipmentViz");
  if (!Number.isInteger(total) || total <= 0 || amounts.length === 0 || amounts.some(amount => !Number.isInteger(amount) || amount <= 0)) {
    host.textContent = "Enter a positive total and positive whole-number vehicle amounts to see the simulation.";
    return;
  }
  const sum = amounts.reduce((value, amount) => value + amount, 0);
  host.innerHTML = `<div class="simulation-summary ${sum === total ? "is-valid" : "is-invalid"}">${sum === total ? "✓ Split matches the shipment total" : `Split adds to ${sum} ${html(unit)}; shipment total is ${total} ${html(unit)}`}</div><div class="sim-vehicles">${amounts.map((amount, index) => {
    const portion = Math.min(100, Math.round((amount / total) * 100));
    return `<div class="sim-vehicle"><div class="vehicle-icon" aria-hidden="true">🚚</div><div class="vehicle-info"><b>Vehicle ${index + 1}</b><span>${amount} ${html(unit)} · ${portion}% of total</span><div class="load-track"><i style="--portion:${portion}%"></i></div></div><span class="box-count">${amount} units</span></div>`;
  }).join("")}</div>`;
  const cards = host.querySelectorAll(".sim-vehicle");
  let index = 0;
  shipmentTimer = setInterval(() => {
    if (index >= cards.length) { clearInterval(shipmentTimer); shipmentTimer = null; return; }
    cards[index++].classList.add("loaded");
  }, 600);
}

function loadStatus(load) {
  if (load.received === null) return { text: "Not received", css: "missing" };
  if (load.received < load.planned) return { text: "Short", css: "short" };
  if (load.received > load.planned) return { text: "Excess", css: "excess" };
  return { text: "Complete", css: "complete" };
}
function renderDeliveries() {
  const loads = state.shipments.flatMap(shipment => shipment.loads.map(load => ({ shipment, load })));
  $("loadRows").innerHTML = loads.length ? loads.map(({ shipment, load }) => {
    const status = loadStatus(load);
    return `<tr><td><b class="id-text">${html(load.id)}</b><br><span class="muted">${html(shipment.id)}</span></td><td>${html(shipment.origin)} → ${html(shipment.destination)}<br><span class="muted">${html(shipment.supply)}</span></td><td>${html(load.vehicle)}</td><td>${load.planned} ${html(shipment.unit)}</td><td>${load.received === null ? "—" : `${load.received} ${html(shipment.unit)}`}</td><td><span class="status ${status.css}">${status.text}</span>${load.reference ? `<br><span class="muted">${html(load.reference)}</span>` : ""}</td><td><button class="small-button" data-record="${html(load.id)}">Record receipt</button></td></tr>`;
  }).join("") : `<tr><td colspan="7" class="empty">No vehicle loads yet. Create a shipment first.</td></tr>`;
  $("reportRows").innerHTML = state.shipments.length ? state.shipments.map(shipment => {
    const receivedLoads = shipment.loads.filter(load => load.received !== null);
    const received = receivedLoads.reduce((sum, load) => sum + load.received, 0);
    const missing = shipment.loads.reduce((sum, load) => sum + Math.max(0, load.planned - (load.received ?? 0)), 0);
    const statuses = shipment.loads.map(loadStatus);
    const reportStatus = missing > 0 ? (received === 0 ? "Missing" : "Short / missing") : statuses.some(status => status.css === "excess") ? "Excess" : "Complete";
    const reportCss = missing > 0 ? "short" : reportStatus === "Excess" ? "excess" : "complete";
    return `<tr><td><b class="id-text">${html(shipment.id)}</b><br><span class="muted">${html(shipment.origin)} → ${html(shipment.destination)}</span></td><td>${html(shipment.supply)}</td><td>${shipment.total} ${html(shipment.unit)}</td><td>${received} ${html(shipment.unit)}</td><td class="${missing ? "error-text" : ""}">${missing} ${html(shipment.unit)}</td><td><span class="status ${reportCss}">${reportStatus}</span></td></tr>`;
  }).join("") : `<tr><td colspan="6" class="empty">No shipments yet.</td></tr>`;
  document.querySelectorAll("[data-record]").forEach(button => button.addEventListener("click", () => openReceipt(button.dataset.record)));
}

function openReceipt(loadId) {
  const match = state.shipments.flatMap(shipment => shipment.loads.map(load => ({ shipment, load }))).find(item => item.load.id === loadId);
  if (!match) return;
  const { shipment, load } = match;
  const form = $("receiptForm");
  form.elements.loadId.value = load.id;
  form.elements.quantity.value = load.received === null ? "" : load.received;
  form.elements.reference.value = load.reference || "";
  $("receiptContext").textContent = `${load.id} · ${load.vehicle} · planned ${load.planned} ${shipment.unit}`;
  $("receiptDialog").showModal();
}
function createShipment(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const origin = String(form.get("origin")), destination = String(form.get("destination"));
  const supply = String(form.get("supply")).trim(), total = Number(form.get("total"));
  const unit = String(form.get("unit"));
  const amounts = String(form.get("loads")).split(",").map(value => Number(value.trim()));
  const result = $("shipmentResult");
  if (!supply || !Number.isInteger(total) || total <= 0 || amounts.length === 0 || amounts.some(value => !Number.isInteger(value) || value <= 0)) {
    result.className = "shipment-result error-box";
    result.textContent = "Enter a supply name, a positive total, and a positive whole number for every vehicle.";
    return;
  }
  const sum = amounts.reduce((acc, amount) => acc + amount, 0);
  if (sum !== total) {
    result.className = "shipment-result error-box";
    result.textContent = `The vehicle amounts add up to ${sum} ${unit}, but the shipment total is ${total} ${unit}. Adjust the amounts and try again.`;
    return;
  }
  const route = findDfsPath(origin, destination);
  if (!route.found) {
    result.className = "shipment-result error-box";
    result.textContent = "There is no open route for this shipment. Reopen a road on the Route map first.";
    return;
  }
  const id = `SHP-${state.nextShipment++}`;
  const shipment = { id, origin, destination, supply, total, unit, loads: amounts.map((planned, index) => ({ id: `${id}-${String(index + 1).padStart(2, "0")}`, vehicle: `Vehicle ${index + 1}`, planned, received: null, reference: "" })) };
  state.shipments.unshift(shipment); saveState(); renderDeliveries();
  result.className = "shipment-result success-box";
  result.innerHTML = `<b>Shipment ${html(id)} created.</b> Route: ${route.towns.map(html).join(" → ")}<br>${amounts.length} individual vehicle loads are ready for receipts.`;
  event.currentTarget.reset();
  event.currentTarget.elements.origin.value = origin;
  event.currentTarget.elements.destination.value = destination;
  document.querySelector('[data-panel="deliveryPanel"]').click();
  $("deliveryPanel").scrollIntoView({ behavior: "smooth", block: "start" });
}

document.querySelectorAll(".tab").forEach(button => button.addEventListener("click", () => {
  document.querySelectorAll(".tab").forEach(tab => tab.classList.toggle("active", tab === button));
  document.querySelectorAll(".panel").forEach(panel => panel.classList.toggle("hidden", panel.id !== button.dataset.panel));
}));
$("findRoute").addEventListener("click", runRoute);
$("startTown").addEventListener("change", runRoute);
$("endTown").addEventListener("change", runRoute);
$("routeMethod").addEventListener("change", runRoute);
$("playDfs").addEventListener("click", toggleDfsPlayback);
$("stepDfs").addEventListener("click", () => { stopDfsPlayback(); $("playDfs").textContent = "▶ Play"; applyNextDfsEvent(); });
$("restartDfs").addEventListener("click", restartDfs);
$("playShipmentSim").addEventListener("click", simulateShipmentLoading);
$("shipmentForm").addEventListener("submit", createShipment);
$("receiptForm").addEventListener("submit", event => {
  event.preventDefault();
  const form = event.currentTarget;
  const match = state.shipments.flatMap(shipment => shipment.loads).find(load => load.id === form.elements.loadId.value);
  const quantity = Number(form.elements.quantity.value);
  const reference = String(form.elements.reference.value).trim();
  if (!match || !Number.isInteger(quantity) || quantity < 0 || !reference) return;
  match.received = quantity; match.reference = reference;
  saveState(); renderDeliveries(); $("receiptDialog").close();
});
$("closeDialog").addEventListener("click", () => $("receiptDialog").close());
$("resetDemo").addEventListener("click", () => {
  stopDfsPlayback();
  if (shipmentTimer) { clearInterval(shipmentTimer); shipmentTimer = null; }
  state = demoState(); saveState();
  fillSelect("startTown", "Himgaun"); fillSelect("endTown", "Devgarh Depot");
  fillSelect("shipmentOrigin", "Himgaun"); fillSelect("shipmentDestination", "Devgarh Depot");
  $("routeMethod").value = "dfs";
  $("shipmentResult").className = "shipment-result";
  $("shipmentResult").textContent = "A sample shipment is already available in the delivery report.";
  $("shipmentViz").textContent = "Enter shipment values, then start the simulation.";
  runRoute(); renderDeliveries();
});
fillSelect("startTown", "Himgaun"); fillSelect("endTown", "Devgarh Depot");
fillSelect("shipmentOrigin", "Himgaun"); fillSelect("shipmentDestination", "Devgarh Depot");
runRoute(); renderDeliveries();
