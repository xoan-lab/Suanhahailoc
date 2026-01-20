/* Sửa Nhà Hái Lộc – prototype (vanilla HTML/CSS/JS)
   - Coins (xu) earned from daily tasks
   - Shop for decorations -> placed in room
   - Spin wheel: 1 spin/day (localStorage)
   Run in VS Code with Live Server.
*/

const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

/** ---------- Storage ---------- **/
const STORAGE_KEY = "snhl_state_v1";

function todayKey() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth()+1).padStart(2,"0");
  const dd = String(d.getDate()).padStart(2,"0");
  return `${yyyy}-${mm}-${dd}`;
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try { return JSON.parse(raw); } catch {}
  }
  return {
    coins: 0,
    ownedItemIds: [],
    placed: {},              // itemId -> {x,y}
    tasksDoneByDate: {},     // "YYYY-MM-DD" -> [taskId]
    lastSpinDate: null,
    lastPrize: null
  };
}
function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
const SESSION_FLAG = "snhl_session_started_v1";

if (!sessionStorage.getItem(SESSION_FLAG)) {
  // tab mới / phiên mới
  localStorage.removeItem(STORAGE_KEY);
  sessionStorage.setItem(SESSION_FLAG, "1");
}

let state = loadState();

/** ---------- Game Data ---------- **/
const TASKS = [
  {
    id: "share_saving",
    icon: "🎯",
    title: "Chia sẻ Khoảnh dự phòng tài chính lên cộng đồng",
    desc: "Gợi ý: mô phỏng hành động, không cần tích hợp thật.",
    reward: 3
  },
  {
    id: "create_group_fund",
    icon: "👥",
    title: "Đặt Quỹ Nhóm làm chi tiêu yêu thích",
    desc: "Tạo 1 nhóm quỹ để cùng tiết kiệm.",
    reward: 4
  },
  {
    id: "buy_data",
    icon: "📶",
    title: "Nạp Data 4G/5G từ 2.000đ",
    desc: "Nhận thêm lượt Lắc Xì (mô phỏng).",
    reward: 2
  },
  {
    id: "contribute_group",
    icon: "💰",
    title: "Góp tiền vào Quỹ Nhóm từ 20.000đ",
    desc: "Hoàn thành giao dịch (mô phỏng).",
    reward: 1
  },
  {
    id: "view_report",
    icon: "📊",
    title: "Xem báo cáo chi tiêu trong 1 phút",
    desc: "Xem insight giúp quản lý tài chính.",
    reward: 1
  }
];

const SHOP_CATEGORIES = [
  { id:"plants", name:"Cây & Hoa Tết" },
  { id:"foods",  name:"Bánh trái" },
  { id:"decor",  name:"Đồ trang trí" }
];

const SHOP_ITEMS = [
  // plants
  { id:"mai_small", cat:"plants", name:"Cây mai nhỏ", emoji:"🌼", price:2, defaultPos:{x:32,y:208} },
  { id:"mai_big",   cat:"plants", name:"Cây mai lớn", emoji:"🌼", price:4, defaultPos:{x:260,y:188} },
  { id:"dao_small", cat:"plants", name:"Cây đào nhỏ", emoji:"🌸", price:2, defaultPos:{x:60,y:164} },
  { id:"quat",      cat:"plants", name:"Cây quất",    emoji:"🍊", price:5, defaultPos:{x:282,y:222} },

  // foods
  { id:"banh_chung",     cat:"foods", name:"Bánh chưng",    emoji:"🎁", price:1, defaultPos:{x:150,y:266} },
  { id:"banh_tet",       cat:"foods", name:"Bánh tét",      emoji:"🍙", price:2, defaultPos:{x:190,y:276} },
  { id:"mut_dua",        cat:"foods", name:"Mứt dừa",       emoji:"🍬", price:1, defaultPos:{x:206,y:300} },
  { id:"mut_thap_cam",   cat:"foods", name:"Mứt thập cẩm",  emoji:"🍱", price:3, defaultPos:{x:120,y:300} },

  // decor
  { id:"den_long",   cat:"decor", name:"Đèn lồng",  emoji:"🏮", price:4, defaultPos:{x:260,y:52} },
  { id:"tranh_tet",  cat:"decor", name:"Tranh Tết", emoji:"🖼️", price:2, defaultPos:{x:160,y:60} },
  { id:"bao_li_xi",  cat:"decor", name:"Bao lì xì", emoji:"🧧", price:1, defaultPos:{x:210,y:318} },
  { id:"cau_dia",    cat:"decor", name:"Câu đối",   emoji:"🧾", price:1, defaultPos:{x:24,y:70} }
];

const WHEEL_PRIZES = [
  { label: "Giảm 10k tiền điện", type:"toast", value:"Voucher 10k tiền điện" },
  { label: "Giảm 10k vé phim",   type:"toast", value:"Voucher 10k vé phim" },
  { label: "Giảm 10k mua sắm",   type:"toast", value:"Voucher 10k mua sắm" },
  { label: "Giảm 5k ăn uống",    type:"toast", value:"Voucher 5k ăn uống" },
  { label: "+3 xu",              type:"coins", value:3 },
  { label: "+1 xu",              type:"coins", value:1 },
];

/** ---------- UI / Router ---------- **/
const screenRoot = $("#screenRoot");
const coinCountEl = $("#coinCount");
const toastEl = $("#toast");

function setCoins(n){
  state.coins = Math.max(0, Math.floor(n));
  coinCountEl.textContent = String(state.coins);
  saveState();
}

function toast(msg){
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  window.clearTimeout(toast._t);
  toast._t = window.setTimeout(()=>toastEl.classList.remove("show"), 1800);
}

function isTaskDone(taskId){
  const k = todayKey();
  const done = state.tasksDoneByDate[k] || [];
  return done.includes(taskId);
}
function markTaskDone(taskId){
  const k = todayKey();
  state.tasksDoneByDate[k] = state.tasksDoneByDate[k] || [];
  if (!state.tasksDoneByDate[k].includes(taskId)) state.tasksDoneByDate[k].push(taskId);
  saveState();
}

function ownsItem(itemId){
  return state.ownedItemIds.includes(itemId);
}

function buyItem(item){
  if (ownsItem(item.id)) return;
  if (state.coins < item.price) {
    toast("Chưa đủ xu 😅");
    return;
  }
  state.coins -= item.price;
  state.ownedItemIds.push(item.id);

  if (!state.placed[item.id]) {
    state.placed[item.id] = { x: item.defaultPos.x, y: item.defaultPos.y };
  }
  saveState();
  render();
  toast(`Đã mua: ${item.name}`);
}

/** ---------- Screens ---------- **/
function ScreenHeader(title, subtitle){
  return `
    <div class="scr-head">
      <div class="scr-title">${escapeHtml(title)}</div>
      ${subtitle ? `<div class="scr-sub">${escapeHtml(subtitle)}</div>` : ``}
    </div>
  `;
}

function renderHome(){
  const hasAny = state.ownedItemIds.length > 0;

  return `
    ${ScreenHeader("Trang chủ", "Căn nhà của bạn (kéo thả đồ để sắp xếp)")}
    <div class="content">
      <div class="room-wrap">
        <div class="card">
          <div class="row">
            <div>
              <div style="font-weight:900">Tiến độ trang trí</div>
              <div class="muted" style="font-size:12px; margin-top:2px">${state.ownedItemIds.length} món đã mua</div>
            </div>
            <button class="btn secondary small" id="btnGoShop">Mua đồ</button>
          </div>
          <div class="sep"></div>
          <div class="row">
            <div class="badge">🎡 Mỗi ngày 1 lượt quay</div>
            <button class="btn small" id="btnGoSpin">Vào vòng quay</button>
          </div>
        </div>

<div class="room" id="room">
  <div class="wall"></div>
  <div class="floor"></div>

  <!-- AVATAR -->
  <img
    class="avatar"
    id="avatar"
    src="./assets/nhanvat.png"
    alt="nhân vật"
  />

  ${!hasAny ? `
    <div class="room-empty">
      <div>
        <div class="big">🏡</div>
        <div class="tx">Nhà đang trống</div>
        <div class="muted" style="font-size:12px; margin-top:6px">
          Hãy hoàn thành nhiệm vụ để nhận xu và mua đồ trang trí.
        </div>
      </div>
    </div>
  ` : ``}
</div>  


        <div class="card">
          <div class="row">
            <div>
              <div style="font-weight:900">Mẹo nhanh</div>
              <div class="muted" style="font-size:12px; margin-top:2px">
                Nhiệm vụ → nhận xu → cửa hàng → kéo thả đồ vào phòng.
              </div>
            </div>
            <button class="btn secondary small" id="btnClearLayout">Reset bố cục</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderTasks(){
  const doneCount = TASKS.filter(t => isTaskDone(t.id)).length;
  const total = TASKS.length;

  const list = TASKS.map(t => {
    const done = isTaskDone(t.id);
    return `
      <div class="task">
        <div class="left">
          <div class="ic">${t.icon}</div>
          <div>
            <div class="name">${escapeHtml(t.title)}</div>
            <div class="meta">${escapeHtml(t.desc)}</div>
          </div>
        </div>
        <div class="right">
          <div class="reward">+${t.reward} xu</div>
          <button class="btn small ${done ? "secondary":""}" data-task="${t.id}" ${done ? "disabled":""}>
            ${done ? "Đã xong" : "Thực hiện"}
          </button>
        </div>
      </div>
      <div class="sep"></div>
    `;
  }).join("");

  return `
    ${ScreenHeader("Nhiệm vụ", `Hôm nay: ${doneCount}/${total} nhiệm vụ`)}
    <div class="content">
      <div class="card">
        <div class="row">
          <div class="badge">🎯 Nhiệm vụ hàng ngày</div>
          <div class="muted" style="font-weight:900; font-size:12px">${todayKey()}</div>
        </div>
        <div class="sep"></div>
        ${list}
      </div>
    </div>
  `;
}

function renderShop(){
  const currentCat = router.params.cat || SHOP_CATEGORIES[0].id;

  const pills = SHOP_CATEGORIES.map(c => `
    <button class="pill ${c.id===currentCat ? "active":""}" data-cat="${c.id}">${escapeHtml(c.name)}</button>
  `).join("");

  const items = SHOP_ITEMS
    .filter(i => i.cat === currentCat)
    .map(i => {
      const owned = ownsItem(i.id);
      const canBuy = state.coins >= i.price && !owned;
      return `
        <div class="item">
          <div class="left">
            <div class="pic">${i.emoji}</div>
            <div>
              <div class="nm">${escapeHtml(i.name)}</div>
              <div class="ct">Danh mục: ${escapeHtml(SHOP_CATEGORIES.find(c=>c.id===i.cat)?.name || "")}</div>
            </div>
          </div>
          <div class="right" style="display:flex; flex-direction:column; align-items:flex-end; gap:6px">
            <div class="price">🪙 ${i.price} xu</div>
            <button class="btn small ${owned ? "secondary":""}" data-buy="${i.id}" ${owned ? "disabled":""}>
              ${owned ? "Đã mua" : (canBuy ? "Mua" : "Thiếu xu")}
            </button>
          </div>
        </div>
        <div class="sep"></div>
      `;
    }).join("");

  return `
    ${ScreenHeader("Cửa hàng", "Mua đồ trang trí để thêm vào căn nhà")}
    <div class="content">
      <div class="card">
        <div class="tabs">${pills}</div>
        <div class="sep"></div>
        ${items || `<div class="muted" style="font-weight:800">Chưa có item trong danh mục này.</div>`}
      </div>

      <div style="height:12px"></div>

      <div class="card">
        <div class="row">
          <div>
            <div style="font-weight:900">Tủ đồ</div>
            <div class="muted" style="font-size:12px; margin-top:2px">Bạn đã sở hữu ${state.ownedItemIds.length} món</div>
          </div>
          <button class="btn secondary small" id="btnGoHome">Về nhà</button>
        </div>
      </div>
    </div>
  `;
}

let wheel = null;

function renderSpin(){
  const canSpin = state.lastSpinDate !== todayKey();
  const last = state.lastPrize;

  return `
    ${ScreenHeader("Vòng quay may mắn", "Mỗi ngày 1 lượt quay")}
    <div class="content">
      <div class="card spin-wrap">
        <div class="wheel-area">
          <div class="pointer"></div>
          <canvas id="wheelCanvas" width="520" height="520"></canvas>
        </div>

        <div class="prize">
          ${last ? `Lần trước: <span style="color:var(--pink)">${escapeHtml(String(last))}</span>` : `Chưa quay lần nào`}
          <small>${canSpin ? "Bạn còn 1 lượt quay hôm nay" : "Bạn đã quay hôm nay, quay lại ngày mai nhé"}</small>
        </div>

        <button class="btn" id="btnSpin" ${canSpin ? "" : "disabled"}>
          ${canSpin ? "QUAY!" : "Hết lượt"}
        </button>

        <button class="btn secondary small" id="btnGoHome2">Về trang chủ</button>
      </div>
    </div>
  `;
}

/** ---------- Render + Bind ---------- **/
const router = { route: "home", params: {} };

function render(){
  coinCountEl.textContent = String(state.coins);
  setActiveTab(router.route);

  if (router.route === "home") screenRoot.innerHTML = renderHome();
  if (router.route === "tasks") screenRoot.innerHTML = renderTasks();
  if (router.route === "shop") screenRoot.innerHTML = renderShop();
  if (router.route === "spin") screenRoot.innerHTML = renderSpin();

  bindScreen();
  
}

function goto(route, params={}){
  router.route = route;
  router.params = params;
  render();
}

function setActiveTab(route){
  $$(".tab").forEach(b => b.classList.toggle("active", b.dataset.route === route));
}

function bindScreen(){
  // ===== AVATAR: chọn ảnh từ máy =====
const avatar = document.getElementById("avatar");

if (avatar) {
  avatar.onclick = () => {
    const picker = document.createElement("input");
    picker.type = "file";
    picker.accept = "img/*";

    picker.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const url = URL.createObjectURL(file);
      avatar.src = img;
    };
    picker.click();
  };
}

  // bottom tabs
  $$(".tab").forEach(btn=>{
    btn.onclick = () => goto(btn.dataset.route);
  });

  // Home buttons
  const btnGoShop = $("#btnGoShop");
  if (btnGoShop) btnGoShop.onclick = () => goto("shop");

  const btnGoSpin = $("#btnGoSpin");
  if (btnGoSpin) btnGoSpin.onclick = () => goto("spin");

  const btnClearLayout = $("#btnClearLayout");
  if (btnClearLayout) btnClearLayout.onclick = () => {
    state.placed = {};
    saveState();
    render();
    toast("Đã reset bố cục");
  };

  // Tasks buttons
  $$("[data-task]").forEach(btn=>{
    btn.onclick = () => {
      const id = btn.getAttribute("data-task");
      const t = TASKS.find(x=>x.id===id);
      if (!t || isTaskDone(id)) return;
      markTaskDone(id);
      setCoins(state.coins + t.reward);
      render();
      toast(`+${t.reward} xu`);
    };
  });

  // Shop category pills
  $$("[data-cat]").forEach(p=>{
    p.onclick = () => goto("shop", {cat: p.getAttribute("data-cat")});
  });

  // Shop buy buttons
  $$("[data-buy]").forEach(btn=>{
    btn.onclick = () => {
      const id = btn.getAttribute("data-buy");
      const item = SHOP_ITEMS.find(x=>x.id===id);
      if (item) buyItem(item);
    };
  });

  const btnGoHome = $("#btnGoHome");
  if (btnGoHome) btnGoHome.onclick = () => goto("home");

  // Spin wheel
  const canvas = $("#wheelCanvas");
  if (canvas) {
    wheel = new SpinWheel(canvas, WHEEL_PRIZES);
    wheel.draw();

    const btnSpin = $("#btnSpin");
    if (btnSpin) btnSpin.onclick = async () => {
      if (state.lastSpinDate === todayKey()) return;

      btnSpin.disabled = true;
      const prize = await wheel.spin();
      applyPrize(prize);
      state.lastSpinDate = todayKey();
      state.lastPrize = prize.label;
      saveState();
      render();
    };
  }

  const btnGoHome2 = $("#btnGoHome2");
  if (btnGoHome2) btnGoHome2.onclick = () => goto("home");

  // Place decorations (Home)
  const room = $("#room");
  if (room) mountDecorations(room);
}

function applyPrize(prize){
  if (!prize) return;
  if (prize.type === "coins") {
    setCoins(state.coins + prize.value);
    toast(`🎉 Trúng ${prize.label}`);
    return;
  }
  toast(`🎉 ${prize.value}`);
}

function mountDecorations(roomEl){
  $$(".decor", roomEl).forEach(n=>n.remove());

  const ownedItems = SHOP_ITEMS.filter(i => ownsItem(i.id));
  ownedItems.forEach(item=>{
    const pos = state.placed[item.id] || item.defaultPos;
    const node = document.createElement("div");
    node.className = "decor";
    node.dataset.item = item.id;
    node.style.left = pos.x + "px";
    node.style.top  = pos.y + "px";
    node.innerHTML = `<span class="em">${item.emoji}</span>${escapeHtml(item.name)}`;

    // drag
    let dragging = false;
    let startX=0, startY=0, originX=0, originY=0;

    node.addEventListener("pointerdown", (e)=>{
      dragging = true;
      startX = e.clientX;
      startY = e.clientY;
      originX = parseFloat(node.style.left);
      originY = parseFloat(node.style.top);
      node.setPointerCapture?.(1);
    });

    node.addEventListener("pointermove", (e)=>{
      if (!dragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      const nx = clamp(originX + dx, 8, roomEl.clientWidth - node.offsetWidth - 8);
      const ny = clamp(originY + dy, 8, roomEl.clientHeight - node.offsetHeight - 8);

      node.style.left = nx + "px";
      node.style.top  = ny + "px";
    });

    node.addEventListener("pointerup", ()=>{
      if (!dragging) return;
      dragging = false;
      state.placed[item.id] = {
        x: parseFloat(node.style.left),
        y: parseFloat(node.style.top)
      };
      saveState();
    });

    roomEl.appendChild(node);
  });
}

/** ---------- Wheel ---------- **/
class SpinWheel {
  constructor(canvas, prizes){
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.prizes = prizes;
    this.angle = 0;     // radians
    this.isSpinning = false;
  }

  draw(){
    const ctx = this.ctx;
    const {width:w, height:h} = this.canvas;
    const cx = w/2, cy = h/2;
    const r = Math.min(w,h)/2 - 10;

    ctx.clearRect(0,0,w,h);

    ctx.save();
    ctx.translate(cx,cy);
    ctx.rotate(this.angle);

    const n = this.prizes.length;
    for (let i=0;i<n;i++){
      const a0 = (i/n) * Math.PI*2;
      const a1 = ((i+1)/n) * Math.PI*2;

      ctx.beginPath();
      ctx.moveTo(0,0);
      ctx.arc(0,0,r,a0,a1);
      ctx.closePath();

      const isEven = i%2===0;
      ctx.fillStyle = isEven ? "rgba(255,79,179,.22)" : "rgba(230,26,141,.12)";
      ctx.fill();

      ctx.strokeStyle = "rgba(240,212,230,.95)";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.save();
      ctx.rotate((a0+a1)/2);
      ctx.textAlign = "right";
      ctx.fillStyle = "rgba(42,27,42,.88)";
      ctx.font = "900 20px ui-sans-serif, system-ui";
      ctx.fillText(this.prizes[i].label, r - 14, 8);
      ctx.restore();
    }

    ctx.beginPath();
    ctx.arc(0,0,70,0,Math.PI*2);
    ctx.fillStyle = "rgba(255,255,255,.92)";
    ctx.fill();
    ctx.strokeStyle = "rgba(240,212,230,.95)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "rgba(230,26,141,.95)";
    ctx.font = "900 22px ui-sans-serif, system-ui";
    ctx.textAlign = "center";
    ctx.fillText("momo", 0, 0);

    ctx.restore();
  }

  spin(){
    if (this.isSpinning) return Promise.resolve(null);
    this.isSpinning = true;

    const n = this.prizes.length;
    const spins = 6 + Math.random()*3; // 6-9 rounds
    const targetIndex = Math.floor(Math.random()*n);

    const segmentAngle = (Math.PI*2)/n;
    const targetAngle = (targetIndex + 0.5) * segmentAngle;
    const finalAngle = spins*Math.PI*2 + (Math.PI*2 - targetAngle) + (-Math.PI/2);

    const start = this.angle;
    const delta = finalAngle - start;
    const dur = 2400 + Math.random()*600;

    return new Promise(resolve=>{
      const t0 = performance.now();
      const tick = (t)=>{
        const p = clamp01((t - t0)/dur);
        const eased = easeOutCubic(p);
        this.angle = start + delta*eased;
        this.draw();
        if (p < 1) requestAnimationFrame(tick);
        else {
          this.isSpinning = false;
          resolve(this.prizes[targetIndex]);
        }
      };
      requestAnimationFrame(tick);
    });
  }
}

/** ---------- Utils ---------- **/
function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }
function clamp01(n){ return clamp(n, 0, 1); }
function easeOutCubic(t){ return 1 - Math.pow(1-t, 3); }
function escapeHtml(s){
  return String(s)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#39;");
}

/** ---------- Boot ---------- **/
(function init(){
  setCoins(state.coins);
  goto("home");

  // quick dev reset: __reset()
  window.__reset = () => {
    localStorage.removeItem(STORAGE_KEY);
    state = loadState();
    render();
    toast("Đã reset dữ liệu");
  };
})();

