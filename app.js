// 1. SUPABASE INITIALIZATION
const SUPABASE_URL = 'https://fdxtrrpleeszmitahigb.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_PjTIhL1WHyWnFORdzH0P6g_T8osHYfA';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 2. DOM ELEMENTS
const loginScreen = document.getElementById('login-screen');
const dashboardScreen = document.getElementById('dashboard-screen');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const logoutBtn = document.getElementById('logout-btn');

const userRoleBadge = document.getElementById('user-role-badge');
const currentBalanceEl = document.getElementById('current-balance');
const transactionForm = document.getElementById('transaction-form');
const transactionTypeContainer = document.getElementById('transaction-type-container');
const ledgerTableBody = document.getElementById('ledger-table-body');
const refreshBtn = document.getElementById('refresh-btn');

const adminPanel = document.getElementById('admin-panel');
const adminSignupForm = document.getElementById('admin-signup-form');
const adminMsg = document.getElementById('admin-msg');

let currentUser = null;
let currentUserRole = null;

// 3. AUTHENTICATION & ROLE MANAGEMENT
supabase.auth.onAuthStateChange(async (event, session) => {
    if (session) {
        currentUser = session.user;
        await fetchUserRole(currentUser.id);
        showDashboard();
        fetchTransactions();
    } else {
        currentUser = null;
        currentUserRole = null;
        showLogin();
    }
});

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.classList.add('hidden');
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    const { error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
    });

    if (error) {
        loginError.textContent = error.message;
        loginError.classList.remove('hidden');
    }
});

logoutBtn.addEventListener('click', async () => {
    await supabase.auth.signOut();
});

async function fetchUserRole(userId) {
    const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

    if (data) {
        currentUserRole = data.role;
        userRoleBadge.textContent = currentUserRole;
        
        if (currentUserRole === 'OSD') {
            transactionTypeContainer.classList.remove('hidden'); 
            adminPanel.classList.remove('hidden'); 
        } else {
            transactionTypeContainer.classList.add('hidden'); 
            adminPanel.classList.add('hidden'); 
            document.getElementById('type').value = 'Site_Expense'; 
        }
    } else if (error) {
        console.error('Error fetching profile:', error);
        userRoleBadge.textContent = 'NO ROLE';
    }
}

// 4. UI TOGGLING
function showLogin() {
    loginScreen.classList.remove('hidden');
    loginScreen.classList.add('flex');
    dashboardScreen.classList.add('hidden');
}

function showDashboard() {
    loginScreen.classList.add('hidden');
    loginScreen.classList.remove('flex');
    dashboardScreen.classList.remove('hidden');
}

// 5. LEDGER DATA MANAGEMENT
transactionForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const type = document.getElementById('type').value;
    const amount = parseFloat(document.getElementById('amount').value);
    const description = document.getElementById('description').value;
    const paid_by = document.getElementById('paid_by').value;
    const cheque_no = document.getElementById('cheque_no').value;

    const { error } = await supabase
        .from('site_ledger')
        .insert([{
            type: type,
            amount: amount,
            description: description,
            paid_by_or_to: paid_by,
            cheque_ref_no: cheque_no,
            entered_by: currentUser.id
        }]);

    if (error) {
        alert('Error saving transaction: ' + error.message);
    } else {
        transactionForm.reset();
        if (currentUserRole !== 'OSD') {
            document.getElementById('type').value = 'Site_Expense';
        }
        fetchTransactions(); 
    }
});

async function fetchTransactions() {
    const { data, error } = await supabase
        .from('site_ledger')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching transactions:', error);
        return;
    }

    renderTable(data);
    calculateBalance(data);
}

function calculateBalance(transactions) {
    let balance = 0;
    
    transactions.forEach(tx => {
        if (tx.type === 'Transfer_From_OSD') {
            balance += Number(tx.amount);
        } else if (tx.type === 'Site_Expense') {
            balance -= Number(tx.amount);
        }
    });

    currentBalanceEl.textContent = balance.toLocaleString('en-IN', { minimumFractionDigits: 2 });
}

function renderTable(transactions) {
    ledgerTableBody.innerHTML = '';

    transactions.forEach(tx => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-100';
        
        const isExpense = tx.type === 'Site_Expense';
        const typeColor = isExpense ? 'text-red-600' : 'text-green-600';
        const amountPrefix = isExpense ? '-' : '+';
        const dateFormatted = new Date(tx.created_at).toLocaleDateString('en-IN');

        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap">${dateFormatted}</td>
            <td class="px-6 py-4 whitespace-nowrap font-medium ${typeColor}">
                ${isExpense ? 'Expense' : 'Fund Transfer'}
            </td>
            <td class="px-6 py-4">${tx.description}</td>
            <td class="px-6 py-4">
                <div>${tx.paid_by_or_to}</div>
                <div class="text-xs text-gray-500">${tx.cheque_ref_no ? 'Chq: ' + tx.cheque_ref_no : 'Cash'}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right font-bold ${typeColor}">
                ${amountPrefix}₹${Number(tx.amount).toLocaleString('en-IN')}
            </td>
        `;
        
        ledgerTableBody.appendChild(row);
    });
}

refreshBtn.addEventListener('click', fetchTransactions);

// 6. ADMIN PANEL LOGIC
if (adminSignupForm) {
    adminSignupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        adminMsg.classList.remove('hidden');
        adminMsg.className = "text-sm text-yellow-500 mt-2";
        adminMsg.textContent = "Creating account... please wait.";

        const newEmail = document.getElementById('new-staff-email').value;
        const newPassword = document.getElementById('new-staff-password').value;

        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: newEmail,
            password: newPassword,
        });

        if (authError) {
            adminMsg.className = "text-sm text-red-500 mt-2";
            adminMsg.textContent = "Error: " + authError.message;
            return;
        }

        const newUserId = authData.user.id;
        const { error: profileError } = await supabase
            .from('profiles')
            .insert([{ id: newUserId, role: 'STAFF' }]);

        if (profileError) {
            adminMsg.className = "text-sm text-red-500 mt-2";
            adminMsg.textContent = "Account created, but failed to assign STAFF badge.";
        } else {
            adminMsg.className = "text-sm text-green-500 mt-2";
            adminMsg.textContent = "Success! You are now logged in as the new staff. Please logout and log back in as OSD.";
            adminSignupForm.reset();
        }
    });
}