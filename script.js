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

let dbProducts = [];
let base64ImageStr = "";
let isOwnerSession = false;
let currentFilter = "all";

// ==========================================
// 2. المزامنة السحابية اللحظية (Realtime Synchronization)
// ==========================================
window.addEventListener("DOMContentLoaded", () => {
    // جلب البيانات من السحابة في ثوانٍ، وأي تحديث ينعكس فوراً على كل الأجهزة
    database.ref('products').on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            dbProducts = Object.keys(data).map(key => ({
                id: key, // مفتاح المنتج الفريد المخزن بالكامل على السيرفر لتعديله أو مسحه
                ...data[key]
            }));
        } else {
            dbProducts = [];
        }
        refreshCatalogGrid();
        refreshAdminGrid();
    });
});

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

    let productData = { name, category, price, qty };

    if(editIdx === "") {
        // دفع منتج جديد للسيرفر السحابي ليعرض فوراً
        productData.image = base64ImageStr;
        database.ref('products').push(productData);
        msgBox.innerText = "Product Synchronized to Cloud!";
        msgBox.style.color = "var(--neon-cyan)";
    } else {
        // تحديث المنتج الحالي على الفايربيز عن طريق معرفه الفريد (id)
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
                    <button class="btn-buy" onclick="alert('Item added to shopping node processing')">Buy Now</button>
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

// ==========================================
// 4. حذف المنتجات سحابياً بشكل فوري
// ==========================================
function triggerDeleteProduct(idx) {
    if(confirm("Are you sure you want to completely remove this item from the cloud database?")) {
        let productId = dbProducts[idx].id;
        database.ref('products/' + productId).remove();
        resetFormState();
    }
}