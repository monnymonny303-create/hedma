// ==========================================
// 1. إعدادات السيرفر وقاعدة البيانات الحقيقية من حسابك
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyCDt5yVhHtoh-InNyv-NGNBwNdAlHoEiCw",
    authDomain: "hedma-559bf.firebaseapp.com",
    databaseURL: "https://hedma-559bf-default-rtdb.firebaseio.com",
    projectId: "hedma-559bf",
    storageBucket: "hedma-559bf.firebasestorage.app",
    messagingSenderId: "738050128018",
    appId: "1:738050128018:web:f9e9659711752a6cd58e4b"
};

// تهشير وتشغيل الفايربيز
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// تهيئة مكتبة إرسال الإيميلات - EmailJS باستخدام البابلك كي الصحيح
emailjs.init("dwHjyiLnczefKVhpI");

let dbProducts = [];
let base64ImageStr = "";
let isOwnerSession = false;
let currentFilter = "all";

// بيانات العميل المحلي
let customerName = "";
let customerPhone = "";
let cart = [];

// ==========================================
// 2. المزامنة السحابية اللحظية (Realtime Synchronization)
// ==========================================
window.addEventListener("DOMContentLoaded", () => {
    // التحقق مما إذا كانت بيانات العميل محفوظة مسبقاً لعدم إظهار النافذة مجدداً
    const cachedName = localStorage.getItem("cust_name");
    const cachedPhone = localStorage.getItem("cust_phone");
    if (cachedName && cachedPhone) {
        customerName = cachedName;
        customerPhone = cachedPhone;
        document.getElementById("customer-gate").style.display = "none";
    }

    // جلب البيانات من السحابة في ثوانٍ
    database.ref('products').on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            dbProducts = Object.keys(data).map(key => ({
                id: key, 
                ...data[key]
            }));
        } else {
            dbProducts = [];
        }
        refreshCatalogGrid();
        refreshAdminGrid();
    });
});

// حفظ بيانات العميل عند الدخول لأول مرة
function saveCustomerData(e) {
    e.preventDefault();
    customerName = document.getElementById("cust-name").value.trim();
    customerPhone = document.getElementById("cust-phone").value.trim();

    localStorage.setItem("cust_name", customerName);
    localStorage.setItem("cust_phone", customerPhone);

    document.getElementById("customer-gate").style.display = "none";
}

// توجيه الشاشات
function switchScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(`screen-${screenId}`).classList.add('active');
    
    let navActions = document.getElementById("nav-actions");
    if (isOwnerSession) {
        navActions.innerHTML = `
            <button style="margin-right:10px; border-color:var(--neon-magenta); color:var(--neon-magenta)" onclick="switchScreen('owner')">Admin Panel</button>
            <button onclick="logoutSession()">Sign Out</button>
        `;
    } else {
        navActions.innerHTML = `<button id="auth-nav-btn" onclick="switchScreen('login')">Owner Login</button>`;
    }
}

// دالة التحقق من بيانات الأونر
function handleLogin(e) {
    e.preventDefault();
    let email = document.getElementById("login-email").value.trim();
    let pass = document.getElementById("login-pass").value.trim();

    if (email === "owner" && pass === "poktbhez(1)") {
        isOwnerSession = true;
        switchScreen('owner');
        document.getElementById("login-form").reset();
    } else {
        alert("❌ Authentication Denied: Invalid Username or Password.");
    }
}

function logoutSession() {
    isOwnerSession = false;
    switchScreen('catalog');
}

// تحويل ملف الصورة لنص باينري للرفع
function processImage(inputNode) {
    let file = inputNode.files[0];
    let label = document.getElementById("file-label");
    if(file) {
        label.innerText = `Asset Loaded: ${file.name}`;
        label.classList.add("selected");
        let reader = new FileReader();
        reader.onload = function(e) {
            base64ImageStr = e.target.result;
        }
        reader.readAsDataURL(file);
    }
}

// ==========================================
// 3. إضافة وتعديل المنتجات سحابياً
// ==========================================
function handleProductSubmit(e) {
    e.preventDefault();
    let name = document.getElementById("prod-name").value.trim();
    let category = document.getElementById("prod-cat").value;
    let price = document.getElementById("prod-price").value.trim();
    let qty = document.getElementById("prod-qty").value.trim();
    let editIdx = document.getElementById("edit-index").value;
    let msgBox = document.getElementById("action-msg");

    if(editIdx === "" && base64ImageStr === "") {
        msgBox.innerText = "Error: Please upload a product image asset!";
        msgBox.style.color = "var(--neon-magenta)";
        return;
    }

    let productData = { name, category, price: Number(price), qty: Number(qty) };

    if(editIdx === "") {
        productData.image = base64ImageStr;
        database.ref('products').push(productData);
        msgBox.innerText = "Product Synchronized to Cloud!";
        msgBox.style.color = "var(--neon-cyan)";
    } else {
        let idx = parseInt(editIdx);
        let productId = dbProducts[idx].id;
        
        if(base64ImageStr === "") {
            productData.image = dbProducts[idx].image;
        } else {
            productData.image = base64ImageStr;
        }
        
        database.ref('products/' + productId).set(productData);
        msgBox.innerText = "Product Updated Globally Across Devices!";
        msgBox.style.color = "var(--neon-cyan)";
        resetFormState();
    }

    document.getElementById("product-form").reset();
    document.getElementById("file-label").innerText = "Upload Product Image Asset";
    document.getElementById("file-label").classList.remove("selected");
    base64ImageStr = "";
}

function resetFormState() {
    document.getElementById("edit-index").value = "";
    document.getElementById("panel-title").innerText = "Product Control Form";
    document.getElementById("btn-submit-prod").innerText = "Save Item To Store";
}

function filterCatalog(category) {
    currentFilter = category;
    switchScreen('catalog');
    refreshCatalogGrid();
}

// عرض كتالوج المنتجات للمستخدم
function refreshCatalogGrid() {
    let grid = document.getElementById("catalog-products-grid");
    grid.innerHTML = "";

    let visibleProducts = dbProducts.filter(p => currentFilter === "all" || p.category === currentFilter);

    if(visibleProducts.length === 0) {
        grid.innerHTML = `<p style="grid-column: 1/-1; text-align:center; color: var(--text-muted); padding: 40px 0;">No items found in this section.</p>`;
        return;
    }

    visibleProducts.forEach(product => {
        grid.innerHTML += `
            <div class="cyber-card">
                <div class="card-img-wrapper">
                    <span class="category-badge">${product.category || 'General'}</span>
                    <img src="${product.image}" alt="${product.name}">
                    <div class="glowing-bar"></div>
                </div>
                <div class="card-body">
                    <h3>${product.name}</h3>
                    <div class="card-details-box">
                        <div class="detail-tag price">
                            <label>Price</label>
                            <span>${product.price} EGP</span>
                        </div>
                        <div class="detail-tag qty">
                            <label>Stock</label>
                            <span>${product.qty} Pcs</span>
                        </div>
                    </div>
                    <button class="btn-buy" onclick="addToCart('${product.id}')">Add to Basket</button>
                </div>
            </div>
        `;
    });
}

// عرض لوحة الإدارة للمالك
function refreshAdminGrid() {
    let tbody = document.getElementById("admin-table-body");
    tbody.innerHTML = "";

    dbProducts.forEach((product, idx) => {
        tbody.innerHTML += `
            <tr>
                <td><img src="${product.image}" class="table-img"></td>
                <td style="font-weight:600;">${product.name}</td>
                <td style="color:var(--neon-magenta); font-weight:700;">${product.category || 'T-Shirts'}</td>
                <td style="color:var(--neon-cyan); font-family:monospace;">${product.price} EGP</td>
                <td style="font-family:monospace;">${product.qty}</td>
                <td>
                    <div class="action-btns">
                        <button class="btn-mini edit" onclick="triggerEditProduct(${idx})">Edit</button>
                        <button class="btn-mini delete" onclick="triggerDeleteProduct(${idx})">Delete</button>
                    </div>
                </td>
            </tr>
        `;
    });
}

function triggerEditProduct(idx) {
    let target = dbProducts[idx];
    document.getElementById("prod-name").value = target.name;
    document.getElementById("prod-cat").value = target.category || "T-Shirts";
    document.getElementById("prod-price").value = target.price;
    document.getElementById("prod-qty").value = target.qty;
    document.getElementById("edit-index").value = idx;
    
    document.getElementById("panel-title").innerText = `Modifying Item #${idx + 1}`;
    document.getElementById("btn-submit-prod").innerText = "Update Store Item";
    document.getElementById("file-label").innerText = "Keep asset or load replacement";
}

function triggerDeleteProduct(idx) {
    if(confirm("Are you sure you want to completely remove this item from the cloud database?")) {
        let productId = dbProducts[idx].id;
        database.ref('products/' + productId).remove();
        resetFormState();
    }
}

// ==========================================
// 4. نظام سلة المشتريات والخصم وإرسال البريد الإلكتروني
// ==========================================

function toggleCart() {
    document.getElementById("cart-sidebar").classList.toggle("open");
}

function addToCart(productId) {
    const product = dbProducts.find(p => p.id === productId);
    if (!product) return;

    if (product.qty <= 0) {
        alert("⚠️ Sorry, this item is out of stock!");
        return;
    }

    const cartItem = cart.find(item => item.id === productId);
    if (cartItem) {
        if (cartItem.qtyAdded >= product.qty) {
            alert(`⚠️ Only ${product.qty} units available in stock.`);
            return;
        }
        cartItem.qtyAdded += 1;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            image: product.image,
            qtyAdded: 1
        });
    }

    updateCartUI();
    alert("⚡ Added to your shopping node!");
}

function updateCartUI() {
    const container = document.getElementById("cart-items-container");
    container.innerHTML = "";

    let total = 0;
    let count = 0;

    cart.forEach((item, idx) => {
        total += item.price * item.qtyAdded;
        count += item.qtyAdded;

        container.innerHTML += `
            <div class="cart-item">
                <img src="${item.image}" alt="${item.name}">
                <div class="cart-item-details">
                    <h4>${item.name}</h4>
                    <p>${item.price} EGP &times; ${item.qtyAdded}</p>
                </div>
                <button class="remove-cart-item" onclick="removeFromCart(${idx})">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </div>
        `;
    });

    document.getElementById("cart-count").innerText = count;
    document.getElementById("cart-total-price").innerText = `${total} EGP`;
}

function removeFromCart(idx) {
    cart.splice(idx, 1);
    updateCartUI();
}

// إتمام الشراء ونقص الكمية من الفايربيز وإرسال الطلب سحابياً
function processCheckout() {
    if (cart.length === 0) {
        alert("🛒 Your basket is empty.");
        return;
    }

    if (confirm("Are you sure you want to confirm your order and authorize purchase?")) {
        
        let orderSummary = "";
        let totalPrice = 0;
        let stockCheckPassed = true;

        // التحقق أولاً من توفر الكميات المطلوبة لكل المنتجات قبل الخصم الفعلي
        cart.forEach(cartItem => {
            const originalProduct = dbProducts.find(p => p.id === cartItem.id);
            if (!originalProduct || originalProduct.qty < cartItem.qtyAdded) {
                stockCheckPassed = false;
                alert(`⚠️ Sorry, the stock for "${cartItem.name}" has changed and is no longer sufficient.`);
            }
        });

        if (!stockCheckPassed) return;

        // 1. عملية إنقاص الكميات الآمنة من الـ Firebase
        cart.forEach(cartItem => {
            const originalProduct = dbProducts.find(p => p.id === cartItem.id);
            if (originalProduct) {
                const newQty = originalProduct.qty - cartItem.qtyAdded;
                database.ref('products/' + cartItem.id + '/qty').set(newQty >= 0 ? newQty : 0);
            }
            orderSummary += `- ${cartItem.name} (${cartItem.qtyAdded} Pcs) - ${cartItem.price * cartItem.qtyAdded} EGP\n`;
            totalPrice += cartItem.price * cartItem.qtyAdded;
        });

        // 2. إعداد وإرسال البريد الإلكتروني للمالك
        const emailParams = {
            to_name: "Store Owner",
            customer_name: customerName,
            customer_phone: customerPhone,
            order_details: orderSummary,
            total_price: `${totalPrice} EGP`
        };

        emailjs.send("service_sgecnvb", "template_4ma6eyd", emailParams)
            .then(() => {
                alert(`🎉 Order Completed!\nThank you ${customerName}. The owner has been notified.`);
                cart = [];
                updateCartUI();
                toggleCart();
            })
            .catch((error) => {
                console.error("Mail Error:", error);
                alert(`🎉 Order Registered and Stock Updated!\nThank you ${customerName}.`);
                cart = [];
                updateCartUI();
                toggleCart();
            });
    }
}
// دالة فتح وإغلاق القائمة في الموبايل
function toggleMobileMenu() {
    const navMenu = document.getElementById("nav-menu");
    navMenu.classList.toggle("active");
}