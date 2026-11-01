const searchForm = document.querySelector("#searchForm");
const searchInput = document.querySelector("#searchInput");
const statusMessage = document.querySelector("#statusMessage");
const bookList = document.querySelector("#bookList");
const purchaseMessage = document.querySelector("#purchaseMessage");
const ordersSection = document.querySelector("#ordersSection");
const ordersMessage = document.querySelector("#ordersMessage");
const ordersList = document.querySelector("#ordersList");
const guestArea = document.querySelector("#guestArea");
const memberArea = document.querySelector("#memberArea");
const authForm = document.querySelector("#authForm");
const emailInput = document.querySelector("#emailInput");
const passwordInput = document.querySelector("#passwordInput");
const signUpButton = document.querySelector("#signUpButton");
const signInButton = document.querySelector("#signInButton");
const signOutButton = document.querySelector("#signOutButton");
const userEmail = document.querySelector("#userEmail");
const authMessage = document.querySelector("#authMessage");
let activeUserId = null;
let orderRequestVersion = 0;

function setAuthMessage(message, isError = false) {
  authMessage.textContent = message;
  authMessage.classList.toggle("error", isError);
}

function setAuthButtonsDisabled(isDisabled) {
  signUpButton.disabled = isDisabled;
  signInButton.disabled = isDisabled;
  signOutButton.disabled = isDisabled;
}

function setPurchaseMessage(message, type = "") {
  purchaseMessage.textContent = message;
  purchaseMessage.className = "purchase-message";
  if (type) {
    purchaseMessage.classList.add(type);
  }
}

function setOrdersMessage(message, isError = false) {
  ordersMessage.textContent = message;
  ordersMessage.classList.toggle("error", isError);
}

function clearOrders() {
  orderRequestVersion += 1;
  ordersSection.hidden = true;
  ordersList.replaceChildren();
  setOrdersMessage("");
}

function updateAuthView(session) {
  const user = session?.user;
  const isSignedIn = Boolean(user);
  const previousUserId = activeUserId;

  guestArea.hidden = isSignedIn;
  memberArea.hidden = !isSignedIn;
  userEmail.textContent = user?.email ?? "";

  if (!isSignedIn) {
    activeUserId = null;
    clearOrders();
    setPurchaseMessage("");
    return;
  }

  activeUserId = user.id;
  ordersSection.hidden = false;

  if (previousUserId !== user.id) {
    ordersList.replaceChildren();
    setOrdersMessage("주문 내역을 불러오는 중입니다.");
    void loadOrders(user.id);
  }
}

function getCredentials() {
  if (!authForm.reportValidity()) {
    return null;
  }

  return {
    email: emailInput.value.trim(),
    password: passwordInput.value,
  };
}

async function signUp() {
  const credentials = getCredentials();
  if (!credentials) return;

  setAuthButtonsDisabled(true);
  setAuthMessage("회원가입을 처리하는 중입니다.");

  const { data, error } = await sb.auth.signUp(credentials);

  setAuthButtonsDisabled(false);

  if (error) {
    setAuthMessage(`회원가입에 실패했습니다: ${error.message}`, true);
    return;
  }

  passwordInput.value = "";
  updateAuthView(data.session);

  if (data.session) {
    setAuthMessage("회원가입과 로그인이 완료되었습니다.");
  } else {
    setAuthMessage("회원가입되었습니다. 이메일 확인 후 로그인해 주세요.");
  }
}

async function signIn() {
  const credentials = getCredentials();
  if (!credentials) return;

  setAuthButtonsDisabled(true);
  setAuthMessage("로그인하는 중입니다.");

  const { data, error } = await sb.auth.signInWithPassword(credentials);

  setAuthButtonsDisabled(false);

  if (error) {
    setAuthMessage(`로그인에 실패했습니다: ${error.message}`, true);
    return;
  }

  passwordInput.value = "";
  updateAuthView(data.session);
  setAuthMessage("로그인되었습니다.");
}

async function signOut() {
  setAuthButtonsDisabled(true);
  setAuthMessage("로그아웃하는 중입니다.");
  // 로그아웃 요청의 응답을 기다리지 않고 기존 주문 목록부터 숨깁니다.
  clearOrders();

  const { error } = await sb.auth.signOut();

  setAuthButtonsDisabled(false);

  if (error) {
    setAuthMessage(`로그아웃에 실패했습니다: ${error.message}`, true);
    if (activeUserId) {
      ordersSection.hidden = false;
      void loadOrders(activeUserId);
    }
    return;
  }

  updateAuthView(null);
  setAuthMessage("로그아웃되었습니다.");
}

async function restoreSession() {
  const {
    data: { session },
    error,
  } = await sb.auth.getSession();

  if (error) {
    setAuthMessage(`로그인 상태를 확인하지 못했습니다: ${error.message}`, true);
    return;
  }

  updateAuthView(session);
}

function setStatus(message, isError = false) {
  statusMessage.textContent = message;
  statusMessage.classList.toggle("error", isError);
}

function formatPrice(price) {
  return `${new Intl.NumberFormat("ko-KR").format(price)}원`;
}

function formatDateTime(dateTime) {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(dateTime));
}

function displayOrders(orders) {
  ordersList.replaceChildren();

  orders.forEach((order) => {
    const card = document.createElement("article");
    const title = document.createElement("h3");
    const details = document.createElement("p");
    const total = document.createElement("p");
    const createdAt = document.createElement("p");

    card.className = "order-card";
    title.textContent = order.book_title;
    details.textContent = `수량: ${order.quantity}권 · 단가: ${formatPrice(order.unit_price)}`;
    total.textContent = `주문 금액: ${formatPrice(order.unit_price * order.quantity)}`;
    createdAt.textContent = `주문 시각: ${formatDateTime(order.created_at)}`;

    card.append(title, details, total, createdAt);
    ordersList.append(card);
  });
}

async function loadOrders(userId) {
  const requestVersion = ++orderRequestVersion;

  const { data: orders, error } = await sb
    .from("orders")
    .select("user_id, book_title, quantity, unit_price, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  // 로그아웃하거나 다른 회원으로 바뀐 뒤 도착한 응답은 화면에 쓰지 않습니다.
  if (requestVersion !== orderRequestVersion || activeUserId !== userId) {
    return;
  }

  if (error) {
    setOrdersMessage(`주문 내역을 불러오지 못했습니다: ${error.message}`, true);
    return;
  }

  if (!orders || orders.length === 0) {
    ordersList.replaceChildren();
    setOrdersMessage("주문 내역이 없습니다.");
    return;
  }

  displayOrders(orders);
  setOrdersMessage(`총 ${orders.length}건의 주문 내역입니다.`);
}

async function purchaseBook(book, quantityInput, purchaseButton) {
  if (!activeUserId) {
    setPurchaseMessage("구매하려면 먼저 로그인해 주세요.", "error");
    return;
  }

  const quantityText = quantityInput.value.trim();
  const quantity = Number(quantityText);

  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
    setPurchaseMessage("수량은 1부터 10까지의 정수로 입력해 주세요.", "error");
    quantityInput.focus();
    return;
  }

  const estimatedPrice = book.price * quantity;
  const confirmed = window.confirm(
    `도서명: ${book.title}\n수량: ${quantity}권\n예상 금액: ${formatPrice(estimatedPrice)}\n\n모의 구매를 진행할까요?`
  );

  if (!confirmed) return;

  purchaseButton.disabled = true;
  setPurchaseMessage("모의 구매를 처리하는 중입니다.");

  const { error } = await sb.rpc("purchase_book", {
    p_book_id: book.id,
    p_quantity: quantity,
  });

  purchaseButton.disabled = false;

  if (error) {
    setPurchaseMessage(`모의 구매에 실패했습니다: ${error.message}`, "error");
    return;
  }

  setPurchaseMessage("모의 구매가 완료되었습니다", "success");
  loadOrders(activeUserId);
}

function displayBooks(books) {
  bookList.replaceChildren();

  books.forEach((book) => {
    const card = document.createElement("article");
    const title = document.createElement("h2");
    const author = document.createElement("p");
    const price = document.createElement("p");
    const purchaseControls = document.createElement("div");
    const quantityInput = document.createElement("input");
    const purchaseButton = document.createElement("button");

    card.className = "book-card";
    author.className = "book-author";
    price.className = "book-price";
    purchaseControls.className = "purchase-controls";
    quantityInput.className = "quantity-input";
    quantityInput.type = "number";
    quantityInput.min = "1";
    quantityInput.max = "10";
    quantityInput.step = "1";
    quantityInput.value = "1";
    quantityInput.setAttribute("aria-label", `${book.title} 수량`);
    purchaseButton.type = "button";
    purchaseButton.textContent = "모의 구매";

    // Supabase에서 받은 문자열은 HTML로 넣지 않고 textContent로 표시합니다.
    title.textContent = book.title;
    author.textContent = `저자: ${book.author}`;
    price.textContent = formatPrice(book.price);

    purchaseButton.addEventListener("click", () => {
      purchaseBook(book, quantityInput, purchaseButton);
    });

    purchaseControls.append(quantityInput, purchaseButton);
    card.append(title, author, price, purchaseControls);
    bookList.append(card);
  });
}

async function loadBooks() {
  const keyword = searchInput.value.trim();

  setStatus("도서 목록을 불러오는 중입니다.");
  bookList.replaceChildren();

  let request = sb
    .from("books")
    .select("id, title, author, price")
    .order("id", { ascending: true });

  // 검색어가 있을 때만 제목에 포함되는 도서를 찾습니다.
  if (keyword) {
    request = request.ilike("title", `%${keyword}%`);
  }

  const { data: books, error } = await request;

  if (error) {
    setStatus(`도서 목록을 불러오지 못했습니다: ${error.message}`, true);
    return;
  }

  if (!books || books.length === 0) {
    setStatus("검색 결과가 없습니다.");
    return;
  }

  displayBooks(books);
  setStatus(`총 ${books.length}권의 도서를 찾았습니다.`);
}

searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  loadBooks();
});

signUpButton.addEventListener("click", signUp);
authForm.addEventListener("submit", (event) => {
  event.preventDefault();
  signIn();
});
signOutButton.addEventListener("click", signOut);

// 이 콜백에서는 화면만 즉시 갱신하고, 추가 요청을 기다리지 않습니다.
sb.auth.onAuthStateChange((_event, session) => {
  updateAuthView(session);
});

const configIsMissing =
  SUPABASE_URL === "YOUR_SUPABASE_PROJECT_URL" ||
  SUPABASE_PUBLISHABLE_KEY === "YOUR_SUPABASE_PUBLISHABLE_KEY";

if (configIsMissing) {
  setStatus("config.js에 Supabase Project URL과 Publishable key를 입력해 주세요.", true);
} else {
  loadBooks();
  restoreSession();
}
