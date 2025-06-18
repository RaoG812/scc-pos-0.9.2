// app/page.tsx
// This is your main application file.
// Make sure this file is present at `your-project-root/app/page.tsx`

'use client'; // This is a Client Component

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Flower, Syringe, Cookie, Cigarette, Megaphone, Leaf, ShoppingBag, MoreHorizontal,
    ShoppingCart, Users, History, Settings, Package, Scan, XCircle, Trash2, CheckCircle,
    PlusCircle, Edit2, ChevronDown, ChevronUp, AlertCircle, CircleDashed,
    Grid, Printer, HardDrive, LogIn, PieChart, Coins, CreditCard, QrCode, GripVertical, Atom // Icons for payment and new menu layouts
} from 'lucide-react';

// Corrected import path for the Clock component - assuming it's in app/components/Clock.tsx
import Clock from '../components/Clock';

// Stock Management helper
import { reserveStockForOrder, fulfillStockFromOrder, releaseStockFromOrder, updateStock } from '../components/StockManager'; // Make sure updateStock is also imported

// Import Supabase client
import { createClient } from '@supabase/supabase-js';

// Assuming types are defined in '@/types'
import { InventoryItem, Transaction, Member, PricingOption, AdminUser, Order, MenuLayout } from '@/types';

// Import new AI components
import CategoryIconSuggester from '../components/CategoryIconSuggester';
import SalesReportAI from '../components/SalesReportAI';
import DraggableCategoryLabel from '../components/DraggableCategoryLabel';
// Helper types for the App component's internal state structures, if different from API types
// These are not strictly necessary if type definitions are exhaustive, but can help for clarity
// or if the component uses a slightly different shape derived from the API types.
interface AppMember extends Member {
    total_purchases: number;
}

interface AppInventoryItem extends InventoryItem {
    // InventoryItem already has pricing_options, available_stock, reserved_stock from types/index.ts
}

interface AppTransaction extends Transaction {
    items: Array<{
        id: string; // The ID of the item in the transaction, not necessarily inventory item ID
        name: string;
        price: number;
        unit: string;
        category: string;
        quantity: number;
        subtotal: number;
        selectedOptionId: string; // Store which pricing option was chosen
    }>;
}

interface AppOrder extends Order {
    // Orders will have a similar item structure for display
    items: Array<{
        itemId: string;
        name: string;
        quantity: number;
        price: number;
        unit: string;
        category: string;
        selectedOptionId: string;
    }>;
}

// New interface for Category (to be stored in Supabase)
interface Category {
    id: string;
    name: string;
    icon_name: string; // Storing the icon name as a string
}

// Supabase Configuration
// Your Supabase anon key
const SUPABASE_URL = "https://lhjaomhlyrmohxsjctri.supabase.co";
// Your project URL
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxoamFvbWhseXJtb2h4c2pjdHJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk1MjU0NjAsImV4cCI6MjA2NTEwMTQ2MH0.cS9R5DiW2VUISJ1ypuOAr-ALTfF-NHD-R12-0LVV-1E";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Map of icon names to Lucide React components
const iconMap: { [key: string]: React.ElementType } = {
    Flower: Flower,
    Syringe: Syringe,
    Cookie: Cookie,
    Cigarette: Cigarette,
    Megaphone: Megaphone,
    Leaf: Leaf,
    ShoppingBag: ShoppingBag,
    MoreHorizontal: MoreHorizontal,
    CircleDashed: CircleDashed,
    GripVertical: GripVertical, // For custom/suggested categories
};


// --- Helper Functions ---
    // Moved getDiscountRate to be part of the component state/settings
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(value);
    };

    // Helper function to format date/time from UTC ISO string to Bangkok local time
const formatUtcToBangkok = (utcIsoString: string) => {
    try {
        // Handle null, undefined, or empty string inputs explicitly
        if (!utcIsoString) {
            return "Invalid Date (Missing)";
        }

        // Adjust the string to a format that Date constructor reliably parses as UTC
        // Replace space with 'T', remove microseconds and ensure 'Z' for UTC.
        let isoFormattedString = utcIsoString.replace(' ', 'T');
        if (isoFormattedString.includes('.')) {
            isoFormattedString = isoFormattedString.substring(0, isoFormattedString.indexOf('.'));
        }
        if (!isoFormattedString.endsWith('Z') && !isoFormattedString.includes('+') && !isoFormattedString.includes('-')) {
            isoFormattedString += 'Z'; // Assume UTC if no timezone info and not already Z
        } else if (isoFormattedString.endsWith('+00')) {
            isoFormattedString = isoFormattedString.replace('+00', 'Z');
        }

        const date = new Date(isoFormattedString);

        if (isNaN(date.getTime())) {
            throw new Error("Invalid date string after formatting attempt.");
        }

        // Format to Bangkok time
        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false, // Ensure 24-hour format
            timeZone: 'Asia/Bangkok'
        });
    } catch (e) {
        console.error("Error formatting date:", e, "Original Input:", utcIsoString);
        return "Invalid Date";
    }
};


// Helper function to generate the HTML content for the receipt
const generateReceiptHtml = (
    transaction: AppTransaction,
    taxRate: number,
    members: AppMember[],
    formatCurrencyFunc: (value: number) => string, // Pass formatCurrency as an argument
    formatUtcToBangkokFunc: (value: string) => string, // Pass formatUtcToBangkok as an argument
    memberDiscountRates: { [key: string]: number } // Pass discount rates
) => {
    const member = members.find(m => m.uid === transaction.member_uid);
    // Ensure the transaction date is formatted to Asia/Bangkok timezone
    const transactionDate = formatUtcToBangkokFunc(transaction.transaction_date);

    let memberInfoHtml = '';
    if (member) {
        memberInfoHtml = `
            <div style="margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px dashed #ccc;">
                <p style="font-weight: 600; font-size: 11px;">Member Information:</p>
                <p style="font-size: 10px; line-height: 1.2;">Name: ${member.name || 'N/A'}</p>
                <p style="font-size: 10px; line-height: 1.2;">Card Number: ${member.card_number || 'N/A'}</p>
                <p style="font-size: 10px; line-height: 1.2;">Tier: ${member.tier || 'N/A'}</p>
            </div>
        `;
    }

    const itemsHtml = transaction.items.map(item => `
        <div style="display: flex; justify-content: space-between; font-size: 10px; line-height: 1.2; margin-bottom: 2px;">
            <span style="max-width: 65%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${item.name} (x${item.quantity} ${item.unit})</span>
            <span>${formatCurrencyFunc(item.price)} each = ${formatCurrencyFunc(item.subtotal)}</span>
        </div>
    `).join('');

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Receipt</title>
            <style>
                body {
                    font-family: 'Inter', sans-serif;
                    margin: 0;
                    padding: 0;
                    color: black; /* Default text color for print */
                }
                .receipt-container {
                    width: 80mm; /* Increased width for a slightly larger receipt */
                    margin: 0 auto; /* Centered, remove default 5px */
                    background: white;
                    color: black;
                    padding: 10px;
                    box-sizing: border-box;
                }
                /* Ensure no element breaks mid-content within the receipt */
                .receipt-container div,
                .receipt-container p,
                .receipt-container span,
                .receipt-container h3,
                .receipt-container ul,
                .receipt-container li {
                    page-break-inside: avoid !important;
                    orphans: 2; /* Keep at least 2 lines of content together */
                    widows: 2;  /* Keep at least 2 lines of content together */
                }
                /* Specific styles for structure */
                h3 {
                    font-size: 16px; /* Slightly larger heading */
                    font-weight: bold;
                    text-align: center;
                    margin-bottom: 8px; /* Adjusted margin */
                    page-break-after: avoid !important;
                }
                p, span, li, div {
                    font-size: 10.5px; /* Slightly increased default font size */
                    line-height: 1.3; /* Adjusted line height */
                    color: black;
                }
                .text-center {
                    text-align: center;
                }
                .flex-between {
                    display: flex;
                    justify-content: space-between;
                }
                .font-semibold {
                    font-weight: 600;
                }
                .total-line {
                    font-size: 18px; /* Larger total font size */
                    font-weight: bold;
                    color: black;
                    padding-top: 8px; /* Adjusted padding */
                    border-top: 1px dashed #ccc;
                    page-break-before: avoid !important;
                }
                .separator {
                    border-top: 1px dashed #ccc;
                    margin: 10px 0; /* Adjusted margin */
                    page-break-after: avoid !important;
                    page-break-before: avoid !important;
                }
                ul {
                    list-style-type: none;
                    padding-left: 0;
                    margin: 0;
                }
                .italic {
                    font-style: italic;
                }
                .capitalize {
                    text-transform: capitalize;
                }

                @media print {
                    html, body {
                        width: 80mm; /* Explicitly set width for print */
                        min-height: auto; /* Allow height to expand */
                        margin: 0;
                        padding: 0;
                        overflow: hidden; /* Prevent scrollbars */
                    }
                    /* Ensure the container truly doesn't break */
                    .receipt-container {
                        width: 80mm;
                        margin: 0 !important; /* Remove auto margins for print */
                        padding: 10px;
                        box-sizing: border-box;
                        page-break-after: avoid !important;
                        page-break-before: avoid !important;
                        page-break-inside: avoid !important;
                    }
                }
            </style>
        </head>
        <body>
            <div class="receipt-container">
                <h3 class="text-center">Samui Cannabis Club</h3>
                <p class="text-center">Transaction Date: ${transactionDate}</p>

                ${memberInfoHtml}

                <div class="separator"></div>

                <p style="font-weight: 600; margin-bottom: 8px;">Items:</p>
                ${itemsHtml}

                <div class="separator"></div>

                <div class="flex-between">
                    <span class="font-semibold">Subtotal:</span>
                    <span>${formatCurrencyFunc(transaction.subtotal)}</span>
                </div>
                <div class="flex-between">
                    <span class="font-semibold">Discount (${(transaction.discount_rate * 100).toFixed(0)}%):</span>
                    <span style="color: #cc0000;">- ${formatCurrencyFunc(transaction.discount_amount)}</span>
                </div>
                <div class="flex-between">
                    <span class="font-semibold">Tax (${(taxRate * 100).toFixed(0)}%):</span>
                    <span>${formatCurrencyFunc(transaction.tax_amount)}</span>
                </div>
                <div class="flex-between">
                    <span class="font-semibold">Payment Method:</span>
                    <span class="capitalize">${transaction.payment_method}</span>
                </div>

                <div class="separator total-line"></div>

                <div class="flex-between total-line">
                    <span>Total:</span>
                    <span>${formatCurrencyFunc(transaction.final_total)}</span>
                </div>

                <p class="text-center italic" style="margin-top: 15px;">Thank you for your business!</p>
            </div>
        </body>
        </html>
    `;
};

// Default categories with their Lucide React icons
const defaultItemCategories: { id: string; name: string; icon: React.ElementType | string }[] = [
    { id: 'default-flower', name: 'Flower', icon: 'Flower' },
    { id: 'default-hash-extracts', name: 'Hash/Extracts', icon: 'Syringe' },
    { id: 'default-edibles', name: 'Edibles', icon: 'Cookie' },
    { id: 'default-prerolls', name: 'Prerolls', icon: 'Cigarette' },
    { id: 'default-promo', name: 'Promo', icon: 'Megaphone' },
    { id: 'default-bahbong', name: 'Bahbong', icon: 'Leaf' },
    { id: 'default-accessories', name: 'Accessories', icon: 'ShoppingBag' },
    { id: 'default-other', name: 'Other', icon: 'MoreHorizontal' }
];

// Default menu layouts
const initialMenuLayouts: MenuLayout[] = [
    { id: 'wholesale-default', name: 'Wholesale', categories: defaultItemCategories.map(c => c.name) },
    { id: 'retail-default', name: 'Retail', categories: defaultItemCategories.map(c => c.name) },
];


function App() {
    // Authentication State
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [loginError, setLoginError] = useState<string | null>(null);
    const [loginNfcInput, setLoginNfcInput] = useState('');
    const [loginUsername, setLoginUsername] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [showLoginModal, setShowLoginModal] = useState(true); // Start with login modal visible

    // App Data States
    const [members, setMembers] = useState<AppMember[]>([]);
    const [transactions, setTransactions] = useState<AppTransaction[]>([]);
    const [inventoryItems, setInventoryItems] = useState<AppInventoryItem[]>([]);
    const [orders, setOrders] = useState<AppOrder[]>([]); // New state for orders

    // PoS & Member Related States
    const [currentMember, setCurrentMember] = useState<AppMember | null>(null);
    const [currentTransactionItems, setCurrentTransactionItems] = useState<AppInventoryItem[]>([]);
    const [transactionSearchTerm, setTransactionSearchTerm] = useState<string>('');
    const [nfcInput, setNfcInput] = useState(''); // For PoS member scan
    const [nfcStatus, setNfcStatus] = useState('Ready to scan...');
    const [taxRate, setTaxRate] = useState(() => {
        if (typeof window !== 'undefined') {
            const storedTaxRate = localStorage.getItem('sccTaxRate');
            return storedTaxRate ? parseFloat(storedTaxRate) : 0;
        }
        return 0;
    }); // Client-side setting, stored in localStorage
    const [showReceipt, setShowReceipt] = useState(false); // Renamed to showReceiptModal to avoid confusion
    const [lastProcessedTransaction, setLastProcessedTransaction] = useState<AppTransaction | null>(null);
    const [activeScreen, setActiveScreen] = useState('pos'); // 'pos', 'members', 'history', 'settings', 'inventory', 'menu', 'reports', 'orders'

    // Modals & Forms (General)
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
    const [confirmMessage, setConfirmMessage] = useState('');
    const [searchTerm, setSearchTerm] = useState(''); // For transaction history search
    const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false); // This will control the visibility of the receipt modal
    const [showAiReportModal, setShowAiReportModal] = useState(false); // State for AI Sales Report Modal

    // Member Management Modals & Forms
    const [editMemberId, setEditMemberId] = useState<string | null>(null);
    const [showMemberModal, setShowMemberModal] = useState(false);
    const [newMemberData, setNewMemberData] = useState({
        uid: '',
        cardNumber: '',
        name: '',
        tier: 'Basic', // Updated default tier
        phone: '',
        email: '',
        status: 'Active'
    });

    // Inventory Management Modals & Forms
    const [showInventoryModal, setShowInventoryModal] = useState(false);
    const [editInventoryItemId, setEditInventoryItemId] = useState<string | null>(null);
    const [newInventoryItemData, setNewInventoryItemData] = useState<{
        name: string;
        description: string;
        category: string;
        pricingOptions: PricingOption[];
        available_stock: number;
        reserved_stock: number;
    }>({
        name: '',
        description: '',
        category: 'Other',
        pricingOptions: [{ id: crypto.randomUUID(), name: 'Piece', price: 0, unit: 'pieces' }], // Default pricing option
        available_stock: 0,
        reserved_stock: 0,
    });
    const [showCategoryIconSuggester, setShowCategoryIconSuggester] = useState(false); // State for icon suggester modal
    const [suggestedIconName, setSuggestedIconName] = useState<string | null>(null); // State to store suggested icon name


    // PoS Item Selection States
    const [showItemSelectionModal, setShowItemSelectionModal] = useState(false);
    const [selectedItemForTransaction, setSelectedItemForTransaction] = useState<AppInventoryItem | null>(null);
    const [selectedPricingOption, setSelectedPricingOption] = useState<PricingOption | null>(null);
    const [itemTransactionQuantity, setItemTransactionQuantity] = useState(1);
    const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | null>(null);

    // State to manage if the current transaction is for fulfilling an order
    const [isFulfillingOrder, setIsFulfillingOrder] = useState(false);
    const [orderBeingFulfilledId, setOrderBeingFulfilledId] = useState<string | null>(null);

    const clearTransaction = useCallback(() => {
        setCurrentTransactionItems([]); // Clear the items in the current transaction/cart
        setTransactionSearchTerm(''); // Clear any search term if applicable
        // Add any other state resets related to the transaction panel here
    }, []); // Empty dependency array means this function is stable and won't recreate unnecessarily

    // Order Management Modals & Forms
    const [showOrderModal, setShowOrderModal] = useState(false);
    const [editOrderId, setEditOrderId] = useState<string | null>(null);
    const [newOrderData, setNewOrderData] = useState<{
        memberUid: string;
        comment: string;
        items: AppOrder['items'];
    }>({
        memberUid: '',
        comment: '',
        items: [],
    });
    const [currentOrderMemberUID, setCurrentOrderMemberUID] = useState<string | null>(null); // To filter orders on PoS by scanned member
    const [orderToCancel, setOrderToCancel] = useState<AppOrder | null>(null);

    // Reports Specific States
    const [selectedReportMemberUid, setSelectedReportMemberUid] = useState<string | null>(null);
    const [reportStartDate, setReportStartDate] = useState<string>(''); //YYYY-MM-DD
    const [reportEndDate, setReportEndDate] = useState<string>('');   //YYYY-MM-DD


    // Settings Specific States
    const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
    const [idleTimeoutMinutes, setIdleTimeoutMinutes] = useState(() => {
        // Initialize from localStorage, default to 30 minutes
        if (typeof window !== 'undefined') {
            const storedTimeout = localStorage.getItem('sccIdleTimeoutMinutes');
            return storedTimeout ? parseInt(storedTimeout) : 30;
        }
        return 30;
    });

    // Custom Categories State (Used for Inventory Item forms and Menu Category buttons)
    const [allItemCategories, setAllItemCategories] = useState<Category[]>([]);

    const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');

    // State for Membership Tier Discounts (New)
    const [membershipDiscountRates, setMembershipDiscountRates] = useState<{ [key: string]: number }>(() => {
        if (typeof window !== 'undefined') {
            const storedDiscounts = localStorage.getItem('sccMembershipDiscountRates');
            return storedDiscounts ? JSON.parse(storedDiscounts) : { 'Basic': 0, 'Gold': 0.10, 'Supreme': 0.30 };
        }
        return { 'Basic': 0, 'Gold': 0.10, 'Supreme': 0.30 };
    });

    // Helper to get discount rate based on tier
    const getDiscountRate = useCallback((tier: string) => {
        return membershipDiscountRates[tier] || 0;
    }, [membershipDiscountRates]);


    // Menu Layouts State (for Menu tab variations)
    const [menuLayouts, setMenuLayouts] = useState<MenuLayout[]>(() => {
        if (typeof window !== 'undefined') {
            const storedLayouts = localStorage.getItem('sccMenuLayouts');
            return storedLayouts ? JSON.parse(storedLayouts) : initialMenuLayouts;
        }
        return initialMenuLayouts;
    });
    const [activeMenuLayoutId, setActiveMenuLayoutId] = useState<string>(() => {
        if (typeof window !== 'undefined') {
            const storedLayouts = localStorage.getItem('sccMenuLayouts');
            const parsedLayouts = storedLayouts ? JSON.parse(storedLayouts) : initialMenuLayouts;
            const storedActiveId = localStorage.getItem('sccActiveMenuLayoutId');
            // Ensure the stored active ID refers to an existing layout, otherwise default to first.
            const initialId = storedActiveId && parsedLayouts.some((l: MenuLayout) => l.id === storedActiveId)
                ? storedActiveId
                : (parsedLayouts.length > 0 ? parsedLayouts[0].id : ''); // Default to first existing or empty
            return initialId;
        }
        return initialMenuLayouts[0].id;
    });
    const [showMenuLayoutModal, setShowMenuLayoutModal] = useState(false);
    const [editMenuLayoutData, setEditMenuLayoutData] = useState<MenuLayout | null>(null);


    // Payment Modal State
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
    const [paymentPromiseResolve, setPaymentPromiseResolve] = useState<((value: string) => void) | null>(null);
    const [paymentPromiseReject, setPaymentPromiseReject] = useState<((reason?: any) => void) | null>(null);


    // Loading & Error States
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Helper to get icon component by category name
    const getCategoryIcon = (categoryName: string) => {
        const category = allItemCategories.find(cat => cat.name === categoryName);
        return category && iconMap[category.icon_name] ? iconMap[category.icon_name] : CircleDashed;
    };

    // --- Authentication Logic ---
    const handleLogin = async () => {
        setLoginError(null);
        if (!loginNfcInput && (!loginUsername || !loginPassword)) {
            // Using a simple message box instead of alert()
            alert('Please enter NFC UID or Username and Password.');
            return;
        }

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    uid: loginNfcInput,
                    username: loginUsername,
                    password: loginPassword,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                setLoginError(errorData.error || 'Login failed. Please check your credentials.');
                return;
            }

            const userData: AdminUser = await response.json();
            setIsLoggedIn(true);
            setShowLoginModal(false);
            setLoginNfcInput('');
            setLoginUsername('');
            setLoginPassword('');
            // Using a simple message box instead of alert()
            alert(`Welcome, ${userData.username || 'User'}! You are logged in as ${userData.role}.`);
            refreshData(); // Refresh data after successful login
            resetIdleTimer(); // Start idle timer on login
        } catch (err: any) {
            console.error('Login error:', err);
            setLoginError(err.message || 'An error occurred during login.');
        }
    };

    const handleLogout = () => {
        setIsLoggedIn(false);
        setShowLoginModal(true); // Show login modal on logout
        setCurrentMember(null); // Clear current member on logout
        handleClearTransaction(); // Clear any ongoing transaction
        setMembers([]); // Clear data on logout for security
        setTransactions([]);
        setInventoryItems([]);
        setOrders([]); // Clear orders on logout
        if (idleTimerRef.current) {
            clearTimeout(idleTimerRef.current);
            idleTimerRef.current = null;
        }
        // Using a simple message box instead of alert()
        alert('You have been logged out due to inactivity.');
    };

    // --- Idle Timeout Logic ---
    const resetIdleTimer = useCallback(() => {
        if (idleTimerRef.current) {
            clearTimeout(idleTimerRef.current);
        }
        if (isLoggedIn && idleTimeoutMinutes > 0) {
            idleTimerRef.current = setTimeout(() => {
                handleLogout();
            }, idleTimeoutMinutes * 60 * 1000); // Convert minutes to milliseconds
        }
    }, [isLoggedIn, idleTimeoutMinutes, handleLogout]);

    useEffect(() => {
        // Save timeout to localStorage whenever it changes
        if (typeof window !== 'undefined') {
            localStorage.setItem('sccIdleTimeoutMinutes', idleTimeoutMinutes.toString());
        }
        resetIdleTimer(); // Reset timer on mount or timeout change

        const events = ['mousemove', 'keydown', 'click', 'scroll'];
        events.forEach(event => window.addEventListener(event, resetIdleTimer));

        return () => {
            // Cleanup event listeners and timer
            if (idleTimerRef.current) {
                clearTimeout(idleTimerRef.current);
            }
            events.forEach(event => window.removeEventListener(event, resetIdleTimer));
        };
    }, [idleTimeoutMinutes, isLoggedIn, resetIdleTimer]);


    // --- Data Fetching & Refresh ---
       const fetchCategoriesFromSupabase = useCallback(async () => {
        const { data, error } = await supabase
            .from('categories')
            .select('*');
        if (error) {
            console.error('Error fetching categories:', error);
            setError('Failed to load categories.');
            return [];
        }
        // Directly return fetched categories; default categories should be pre-populated in Supabase if desired.
        const fetchedCategories: Category[] = data.map((d: any) => ({
            id: d.id,
            name: d.name,
            icon_name: d.icon_name || 'CircleDashed' // Default icon if not specified in DB
        }));
        return fetchedCategories;
    }, []);


    const refreshData = useCallback(async () => {
        if (!isLoggedIn) {
            setLoading(false);
            return;
            }
        setLoading(true);
        setError(null);
        try {
            const [membersRes, transactionsRes, inventoryRes, ordersRes, categoriesData] = await Promise.all([
                fetch('/api/members'),
                fetch('/api/transactions'),
                fetch('/api/inventory'),
                fetch('/api/orders'), // Fetch orders
                fetchCategoriesFromSupabase(), // Fetch categories from Supabase
            ]);

            const membersData: Member[] = await membersRes.json();
            const transactionsData: Transaction[] = await transactionsRes.json();
            const inventoryData: InventoryItem[] = await inventoryRes.json();
            const ordersData: Order[] = await ordersRes.json(); // Process orders data

            setAllItemCategories(categoriesData);

            // Ensure data is an array before mapping
            setMembers(Array.isArray(membersData) ? membersData.map(m => ({
                ...m,
                total_purchases: (m as any).total_purchases || 0, // Ensure total_purchases is always a number
            })) : []);

            // Create a map for quick lookup of inventory items for display
            const inventoryMap = new Map<string, AppInventoryItem>();
            if (Array.isArray(inventoryData)) {
                inventoryData.forEach(item => {
                    inventoryMap.set(item.id, {
                        ...item,
                        pricing_options: Array.isArray(item.pricing_options) ? item.pricing_options : [],
                        description: item.description || '',
                        category: item.category || 'Other',
                        available_stock: item.available_stock ?? 0, // Ensure numeric default
                        reserved_stock: item.reserved_stock ?? 0,   // Ensure numeric default
                    });
                });
            }
            setInventoryItems(Array.from(inventoryMap.values()));


            // Map transaction items to the full AppTransaction['items'] structure
            setTransactions(Array.isArray(transactionsData) ? transactionsData.map(t => {
                const transactionItems = (Array.isArray(t.items_json) ? t.items_json : []).map(txItem => {
                    const fullItem = inventoryMap.get(txItem.itemId);
                    const selectedOption = fullItem?.pricing_options.find(option => option.id === txItem.selectedOptionId);

                    return {
                        id: txItem.itemId,
                        name: fullItem?.name || 'Unknown Item',
                        price: txItem.price,
                        unit: selectedOption?.unit || fullItem?.pricing_options[0]?.unit || 'unit',
                        category: fullItem?.category || 'Other',
                        quantity: txItem.quantity,
                        subtotal: txItem.quantity * txItem.price,
                        selectedOptionId: txItem.selectedOptionId
                    };
                });
                return {
                    ...t,
                    items: transactionItems,
                    payment_method: t.payment_method || 'Unknown' // Ensure payment method is set
                };
            }) : []);

            // Process orders data
            setOrders(Array.isArray(ordersData) ? ordersData.map(o => {
                const orderItems = (Array.isArray(o.items_json) ? o.items_json : []).map(ordItem => {
                    const fullItem = inventoryMap.get(ordItem.itemId);
                    const selectedOption = fullItem?.pricing_options.find(option => option.id === ordItem.selectedOptionId);
                    return {
                        itemId: ordItem.itemId,
                        name: fullItem?.name || ordItem.name || 'Unknown Item', // Fallback to name in items_json
                        quantity: ordItem.quantity,
                        price: ordItem.price,
                        unit: selectedOption?.unit || ordItem.unit || 'unit',
                        category: fullItem?.category || ordItem.category || 'Other',
                        selectedOptionId: ordItem.selectedOptionId,
                    };
                });
                return {
                    ...o,
                    items: orderItems,
                };
            }) : []);

        } catch (err: any) {
            console.error('Error fetching data:', err);
            setError(err.message || 'Failed to load data.');
        } finally {
            setLoading(false);
        }
    }, [isLoggedIn, fetchCategoriesFromSupabase]);

    // Initial Data Load on Mount
    useEffect(() => {
        // Tax rate is already initialized from localStorage
        // Membership discounts are already initialized from localStorage
        if (!isLoggedIn) {
            setShowLoginModal(true);
        }
    }, []);

    // Effect to refetch data when login state changes
    useEffect(() => {
        refreshData();
    }, [isLoggedIn, refreshData]);


    // Save client-side settings to localStorage
    useEffect(() => {
        localStorage.setItem('sccTaxRate', taxRate.toString());
    }, [taxRate]);

    // Save menu layouts to localStorage
    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('sccMenuLayouts', JSON.stringify(menuLayouts));
            localStorage.setItem('sccActiveMenuLayoutId', activeMenuLayoutId);
        }
    }, [menuLayouts, activeMenuLayoutId]);

    // Save membership discount rates to localStorage
    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('sccMembershipDiscountRates', JSON.stringify(membershipDiscountRates));
        }
    }, [membershipDiscountRates]);


    // --- Transaction Logic ---
    const handleAddItemToTransaction = () => {
        if (!selectedItemForTransaction || !selectedPricingOption || isNaN(itemTransactionQuantity) || itemTransactionQuantity <= 0) {
            // Using a simple message box instead of alert()
            alert("Please select an item, a pricing option, and enter a valid quantity.");
            return;
        }

        // Check for sufficient available stock before adding to transaction
        const currentReservedStock = selectedItemForTransaction.reserved_stock ?? 0;
        const currentAvailableStock = selectedItemForTransaction.available_stock - currentReservedStock;
        if (itemTransactionQuantity > currentAvailableStock) {
            // Using a simple message box instead of alert()
            alert(`Not enough available stock for ${selectedItemForTransaction.name}. Only ${currentAvailableStock} ${selectedPricingOption.unit} available.`);
            return;
        }

        setCurrentTransactionItems(prevItems => [
            ...prevItems,
            {
                id: selectedItemForTransaction.id, // Inventory item ID
                name: selectedItemForTransaction.name,
                price: selectedPricingOption.price, // Price from selected option
                unit: selectedPricingOption.unit, // Unit from selected option
                category: selectedItemForTransaction.category,
                quantity: parseInt(itemTransactionQuantity.toString()),
                subtotal: selectedPricingOption.price * parseInt(itemTransactionQuantity.toString()),
                selectedOptionId: selectedPricingOption.id, // ID of the chosen pricing option
            }
        ]);

        setShowItemSelectionModal(false);
        setSelectedItemForTransaction(null);
        setSelectedPricingOption(null); // Reset selected pricing option
        setItemTransactionQuantity(1);
        setSelectedCategoryFilter(null); // Reset filter
    };

    const handleRemoveItem = (indexToRemove: number) => {
        setCurrentTransactionItems(prevItems => prevItems.filter((_, index) => index !== indexToRemove));
    };

    const handleClearTransaction = () => {
        setCurrentTransactionItems([]);
        setCurrentMember(null);
        setNfcInput('');
        setNfcStatus('Ready to scan...');
        setCurrentOrderMemberUID(null); // Clear pending orders for this member
        setShowItemSelectionModal(false);
        setSelectedItemForTransaction(null);
        setSelectedPricingOption(null);
        setItemTransactionQuantity(1);
        setSelectedCategoryFilter(null); // Reset filter
        setIsFulfillingOrder(false); // Reset order fulfillment state
        setOrderBeingFulfilledId(null); // Reset order ID
    };

    const calculateTotals = () => {
        const subtotal = currentTransactionItems.reduce((acc, item) => acc + item.subtotal, 0);
        const discountRate = currentMember ? getDiscountRate(currentMember.tier) : 0;
        const discountAmount = subtotal * discountRate;
        const subtotalAfterDiscount = subtotal - discountAmount;
        const taxAmount = subtotalAfterDiscount * taxRate;
        const finalTotal = subtotalAfterDiscount + taxAmount;

        return {
            subtotal,
            discountRate,
            discountAmount,
            taxAmount,
            finalTotal
        };
    };

    const handleInitiatePayment = async (): Promise<string> => {
        if (currentTransactionItems.length === 0) {
            throw new Error("No items in the transaction to process payment.");
        }

        return new Promise<string>((resolve, reject) => {
            setShowPaymentModal(true);
            setSelectedPaymentMethod(null); // Reset selection
            setPaymentPromiseResolve(() => resolve);
            setPaymentPromiseReject(() => reject);
        });
    };

    const handlePaymentMethodSelected = (method: string) => {
        setSelectedPaymentMethod(method);
        if (paymentPromiseResolve) {
            paymentPromiseResolve(method);
        }
        setShowPaymentModal(false);
        setPaymentPromiseResolve(null);
        setPaymentPromiseReject(null);
    };

    const handlePaymentModalClose = () => {
        if (paymentPromiseReject) {
            paymentPromiseReject(new Error("Payment selection cancelled."));
        }
        setShowPaymentModal(false);
        setSelectedPaymentMethod(null);
        setPaymentPromiseResolve(null);
        setPaymentPromiseReject(null);
    };


    const handleProcessPayment = async () => {
        let paymentMethod: string;
        try {
            paymentMethod = await handleInitiatePayment();
        } catch (error: any) {
            // Payment initiation was cancelled or failed
            console.error("Payment initiation cancelled or failed:", error.message);
            alert(`Payment initiation failed: ${error.message}`);
            return;
        }

        const { subtotal, discountRate, discountAmount, taxAmount, finalTotal } = calculateTotals();

        const newTransaction: Transaction = {
            id: crypto.randomUUID(),
            member_uid: currentMember ? currentMember.uid : null,
            transaction_date: new Date().toISOString(), // Stores in UTC
            items_json: currentTransactionItems.map(item => ({
                itemId: item.id,
                quantity: item.quantity,
                price: item.price,
                selectedOptionId: item.selectedOptionId
            })),
            subtotal: parseFloat(subtotal.toFixed(2)),
            discount_rate: discountRate,
            discount_amount: parseFloat(discountAmount.toFixed(2)),
            tax_amount: parseFloat(taxAmount.toFixed(2)),
            final_total: parseFloat(finalTotal.toFixed(2)),
            payment_method: paymentMethod,
        };

        try {
            let stockUpdateSuccess = true;
            let stockUpdateMessage = "Stock updated successfully.";

            if (isFulfillingOrder && orderBeingFulfilledId) {
                // This is an order fulfillment
                const fulfillResult = await fulfillStockFromOrder(
                    currentTransactionItems.map(item => ({ itemId: item.id, quantity: item.quantity })),
                    inventoryItems
                );
                stockUpdateSuccess = fulfillResult.success;
                stockUpdateMessage = fulfillResult.message || "Failed to fulfill reserved stock.";

                if (stockUpdateSuccess) {
                    // Delete the fulfilled order from the backend
                    const deleteOrderResponse = await fetch(`/api/orders/${orderBeingFulfilledId}`, {
                        method: 'DELETE',
                    });
                    if (!deleteOrderResponse.ok) {
                        const errorData = await deleteOrderResponse.json();
                        console.error('Failed to delete fulfilled order:', errorData.error || deleteOrderResponse.statusText);
                        alert(`Order processed and stock fulfilled, but failed to delete order record: ${errorData.error || deleteOrderResponse.statusText}.`);
                    }
                } else {
                    alert(`Transaction failed: ${stockUpdateMessage}. Reserved stock not fully fulfilled.`);
                    console.error('Order fulfillment stock update failed:', stockUpdateMessage);
                    return; // Stop transaction process if stock fulfillment fails
                }
            } else {
                // This is a direct sale
                const stockUpdates: Partial<InventoryItem>[] = [];
                for (const item of currentTransactionItems) {
                    const currentInvItem = inventoryItems.find(inv => inv.id === item.id);
                    if (currentInvItem) {
                        stockUpdates.push({
                            ...currentInvItem,
                            id: item.id,
                            available_stock: (currentInvItem.available_stock ?? 0) - item.quantity,
                        });
                    }
                }
                const directSaleStockUpdateResult = await updateStock(stockUpdates);
                stockUpdateSuccess = directSaleStockUpdateResult.success;
                stockUpdateMessage = directSaleStockUpdateResult.message || "Failed to update available stock during direct sale.";

                if (!stockUpdateSuccess) {
                    alert(`Transaction processed, but failed to update available stock: ${stockUpdateMessage}. Please check inventory manually.`);
                }
            }

            // Proceed with transaction record creation if stock update was successful (or partially successful for direct sales)
            const response = await fetch('/api/transactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...newTransaction, items_json: JSON.stringify(newTransaction.items_json) }),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Failed to process transaction record: ${errorData.error || response.statusText}`);
            }

            // Update Member's Total Purchases
            if (currentMember) {
                const updatedTotalPurchases = (currentMember.total_purchases || 0) + finalTotal;
                const updatedMember: Partial<AppMember> = {
                    id: currentMember.id,
                    uid: currentMember.uid,
                    total_purchases: parseFloat(updatedTotalPurchases.toFixed(2)),
                };

                const memberUpdateResponse = await fetch('/api/members', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify([updatedMember]),
                });

                if (!memberUpdateResponse.ok) {
                    const errorData = await memberUpdateResponse.json();
                    console.error('Failed to update member purchases:', errorData.error || memberUpdateResponse.statusText);
                    alert(`Transaction processed, but failed to update member purchases: ${errorData.error || memberUpdateResponse.statusText}.`);
                }
            }

           //* alert("Transaction processed successfully!");
            setLastProcessedTransaction({
                ...newTransaction,
                items: currentTransactionItems.map(item => ({
                    id: item.id,
                    name: item.name,
                    price: item.price,
                    unit: item.unit,
                    category: item.category,
                    quantity: item.quantity,
                    subtotal: item.subtotal,
                    selectedOptionId: item.selectedOptionId,
                })),
            });
            handleClearTransaction(); // Clears all transaction related states, including order fulfillment flags
            refreshData(); // Re-fetch all data including updated inventory and orders
            setIsReceiptModalOpen(true); // Open the receipt modal

        } catch (error: any) {
            alert(`Transaction failed: ${error.message}`);
            console.error('Transaction error:', error);
        }
    };
    // New function for printing logic, usable from multiple places
    const triggerPrint = useCallback(() => {
        if (!lastProcessedTransaction) {
            alert("No receipt data available to print.");
            return;
        }

        // Generate the HTML content for the receipt, passing formatCurrency
        const receiptHtml = generateReceiptHtml(
            lastProcessedTransaction,
            taxRate,
            members,
            formatCurrency,
            formatUtcToBangkok,
            membershipDiscountRates // Pass membership discount rates
        );

        // Open a new window and print the generated HTML
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(receiptHtml);
            printWindow.document.close();
            printWindow.focus();
            printWindow.print();
            // Close the window instantly after print is initiated
            printWindow.onafterprint = () => {
                printWindow.close();
                setIsReceiptModalOpen(false); // Close the receipt modal after print is initiated
            };
            // Fallback for browsers that don't support onafterprint
            setTimeout(() => {
                if (!printWindow.closed) {
                    printWindow.close();
                    setIsReceiptModalOpen(false);
                }
            }, 500); // Give a small delay before attempting to close
        } else {
            alert("Could not open print window. Please allow pop-ups for this site.");
        }

        setShowReceipt(false); // Hide the modal after print dialog is initiated
    }, [lastProcessedTransaction, taxRate, members, formatUtcToBangkok, membershipDiscountRates]);


    // Original PoS screen print button
    const handlePrintReceipt = () => {
        if (!lastProcessedTransaction) {
            // Using a simple message box instead of alert()
            alert("No receipt available to print. Complete a transaction first.");
            return;
        }
        triggerPrint();
    };

    // --- New: Handle delete transaction from history ---
    const handleDeleteTransaction = (transactionId: string) => {
        setConfirmMessage("Are you sure you want to delete this transaction? This action cannot be undone.");
        setConfirmAction(() => async () => {
            try {
                const response = await fetch(`/api/transactions/${transactionId}`, {
                    method: 'DELETE',
                });
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(`Failed to delete transaction: ${errorData.error || response.statusText}`);
                }
                alert("Transaction deleted successfully!");
                setShowConfirmModal(false);
                refreshData(); // Refresh data to show updated history
            } catch (error: any) {
                alert(`Failed to delete transaction: ${error.message}`);
                console.error('Delete transaction error:', error);
            }
        });
        setShowConfirmModal(true);
    };

    // --- New: Handle clear all transactions ---
    const handleClearAllTransactions = () => {
        setConfirmMessage("Are you sure you want to delete ALL transaction history? This action cannot be undone.");
        setConfirmAction(() => async () => {
            try {
                const response = await fetch('/api/transactions/clear', {
                    method: 'DELETE',
                });
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(`Failed to clear all transactions: ${errorData.error || response.statusText}`);
                }
                alert("All transaction history cleared successfully!");
                setShowConfirmModal(false);
                refreshData(); // Refresh data
            } catch (error: any) {
                alert(`Failed to clear all transactions: ${error.message}`);
                console.error('Clear all transactions error:', error);
            }
        });
        setShowConfirmModal(true);
    };


    // --- NFC Simulation Logic ---
    const handleNfcScan = async () => {
        if (!nfcInput) {
            setNfcStatus('Please enter a UID to simulate scan.');
            return;
        }

        setNfcStatus('Scanning...');
        await new Promise(resolve => setTimeout(resolve, 500));

        const foundMember = members.find(m => m.uid === nfcInput);

        if (foundMember) {
            setCurrentMember(foundMember);
            setCurrentOrderMemberUID(foundMember.uid); // Set UID for pending orders
            setNfcStatus(`Card Detected: ${foundMember.name} (${foundMember.tier})`);
        } else {
            setCurrentMember(null);
            setCurrentOrderMemberUID(null);
            setNfcStatus('Member not found. Please enter a valid UID.');
        }
    };

    const handleNfcRemove = () => {
        setCurrentMember(null);
        setNfcInput('');
        setNfcStatus('Card removed. Ready to scan...');
        setCurrentOrderMemberUID(null); // Clear pending orders
    };

    // --- Member Management Logic ---
    const handleAddMember = async () => {
        if (!newMemberData.uid || !newMemberData.cardNumber || !newMemberData.name) {
            // Using a simple message box instead of alert()
            alert("UID, Card Number, and Name are required for a new member.");
            return;
        }
        try {
            const checkRes = await fetch(`/api/members`);
            const existingMembers = await checkRes.json();
            if (Array.isArray(existingMembers) && existingMembers.some((m: Member) => m.uid === newMemberData.uid || m.card_number === parseInt(newMemberData.cardNumber))) {
                // Using a simple message box instead of alert()
                alert("Member with this UID or Card Number already exists.");
                return;
            }
        } catch (error) {
            console.error("Error checking existing members:", error);
            // Using a simple message box instead of alert()
            alert("Failed to check for existing members. Please try again.");
            return;
        }


        const memberToAdd: Member = {
            id: crypto.randomUUID(),
            uid: newMemberData.uid,
            card_number: parseInt(newMemberData.cardNumber),
            name: newMemberData.name,
            tier: newMemberData.tier as Member['tier'],
            phone: newMemberData.phone,
            email: newMemberData.email,
            status: newMemberData.status as Member['status'],
            total_purchases: 0.00,
        };

        try {
            const response = await fetch('/api/members', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(memberToAdd),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Failed to add member: ${errorData.error || response.statusText}`);
            }
            // Using a simple message box instead of alert()
            alert("Member added successfully!");
            closeMemberModal();
            refreshData();
        } catch (error: any) {
            // Using a simple message box instead of alert()
            alert(`Failed to add member: ${error.message}`);
            console.error('Add member error:', error);
        }
    };

    const handleUpdateMember = async () => {
        if (!editMemberId) return;

        const memberToUpdate: Partial<Member> = {
            id: editMemberId,
            uid: newMemberData.uid,
            card_number: parseInt(newMemberData.cardNumber),
            name: newMemberData.name,
            tier: newMemberData.tier as Member['tier'],
            phone: newMemberData.phone,
            email: newMemberData.email,
            status: newMemberData.status as Member['status'],
        };

        try {
            const response = await fetch('/api/members', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify([memberToUpdate]),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Failed to update member: ${errorData.error || response.statusText}`);
            }
            // Using a simple message box instead of alert()
            alert("Member updated successfully!");
            closeMemberModal();
            refreshData();
        } catch (error: any) {
            // Using a simple message box instead of alert()
            alert(`Failed to update member: ${error.message}`);
            console.error('Update member error:', error);
        }
    };

    const handleDeleteMember = (memberId: string) => {
        setConfirmMessage("Are you sure you want to delete this member? This action cannot be undone.");
        setConfirmAction(() => async () => {
            try {
                const response = await fetch(`/api/members/${memberId}`, {
                    method: 'DELETE',
                });
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(`Failed to delete member: ${errorData.error || response.statusText}`);
                }
                // Using a simple message box instead of alert()
                alert("Member deleted successfully!");
                setShowConfirmModal(false);
                refreshData();
            } catch (error: any) {
                // Using a simple message box instead of alert()
                alert(`Failed to delete member: ${error.message}`);
                console.error('Delete member error:', error);
            }
        });
        setShowConfirmModal(true);
    };

    const openMemberForm = (member: AppMember | null = null) => {
        if (member) {
            setEditMemberId(member.id);
            setNewMemberData({
                uid: member.uid,
                cardNumber: member.card_number.toString(),
                name: member.name,
                tier: member.tier,
                phone: member.phone || '',
                email: member.email || '',
                status: member.status || 'Active'
            });
        } else {
            setEditMemberId(null);
            setNewMemberData({
                uid: '', cardNumber: '', name: '', tier: 'Basic', phone: '', email: '', status: 'Active'
            });
        }
        setShowMemberModal(true);
    };

    const closeMemberModal = () => {
        setShowMemberModal(false);
        setEditMemberId(null);
        setNewMemberData({
            uid: '', cardNumber: '', name: '', tier: 'Basic', phone: '', email: '', status: 'Active'
        });
    };

    // --- Inventory Management Logic ---
    const handleAddInventoryItem = async () => {
        if (!newInventoryItemData.name || newInventoryItemData.pricingOptions.length === 0 || newInventoryItemData.pricingOptions.some(p => !p.name || isNaN(p.price) || p.price <= 0 || !p.unit)) {
            // Using a simple message box instead of alert()
            alert("Item Name and at least one valid pricing option (with name, positive price, and unit) are required.");
            return;
        }

        const itemToSave: InventoryItem = {
            id: editInventoryItemId || crypto.randomUUID(),
            name: newInventoryItemData.name,
            description: newInventoryItemData.description,
            category: newInventoryItemData.category,
            pricing_options: newInventoryItemData.pricingOptions,
            available_stock: newInventoryItemData.available_stock ?? 0,
            reserved_stock: newInventoryItemData.reserved_stock ?? 0,
        };

        const method = editInventoryItemId ? 'PUT' : 'POST';
        const body = method === 'PUT' ? JSON.stringify([itemToSave]) : JSON.stringify(itemToSave);

        try {
            const response = await fetch('/api/inventory', {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: body,
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Failed to ${editInventoryItemId ? 'update' : 'add'} inventory item: ${errorData.error || response.statusText}`);
            }
            // Using a simple message box instead of alert()
            alert(`Inventory item ${editInventoryItemId ? 'updated' : 'added'} successfully!`);
            closeInventoryModal();
            refreshData();
        } catch (error: any) {
            // Using a simple message box instead of alert()
            alert(`Failed to ${editInventoryItemId ? 'update' : 'add'} item: ${error.message}`);
            console.error('Inventory item save error:', error);
        }
    };

    const handleDeleteInventoryItem = (itemId: string) => {
        setConfirmMessage("Are you sure you want to delete this inventory item? This action cannot be undone. This will also clear any associated reserved stock.");
        setConfirmAction(() => async () => {
            try {
                const itemToDelete = inventoryItems.find(item => item.id === itemId);
                if (!itemToDelete) {
                    throw new Error("Item not found.");
                }

                const response = await fetch(`/api/inventory/${itemId}`, {
                    method: 'DELETE',
                });
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(`Failed to delete inventory item: ${errorData.error || response.statusText}`);
                }
                // Using a simple message box instead of alert()
                alert("Inventory item deleted successfully!");
                setShowConfirmModal(false);
                refreshData();
            }
            catch (error: any) {
                // Using a simple message box instead of alert()
                alert(`Failed to delete item: ${error.message}`);
                console.error('Delete inventory item error:', error);
            }
        });
        setShowConfirmModal(true);
    };

    const openInventoryForm = (item: AppInventoryItem | null) => { // Updated to accept null
        if (item) {
            setEditInventoryItemId(item.id);
            setNewInventoryItemData({
                name: item.name,
                description: item.description,
                category: item.category,
                pricingOptions: item.pricing_options.length > 0 ? item.pricing_options : [{ id: crypto.randomUUID(), name: 'Piece', price: 0, unit: 'pieces' }],
                available_stock: item.available_stock ?? 0,
                reserved_stock: item.reserved_stock || 0,
            });
        } else {
            setEditInventoryItemId(null);
            setNewInventoryItemData({
                name: '',
                description: '',
                category: 'Other',
                pricingOptions: [{ id: crypto.randomUUID(), name: 'Piece', price: 0, unit: 'pieces' }],
                available_stock: 0,
                reserved_stock: 0,
            });
        }
        setShowInventoryModal(true);
    };

    const closeInventoryModal = () => {
        setShowInventoryModal(false);
        setEditInventoryItemId(null);
        setNewInventoryItemData({
            name: '',
            description: '',
            category: 'Other',
            pricingOptions: [{ id: crypto.randomUUID(), name: 'Piece', price: 0, unit: 'pieces' }],
            available_stock: 0,
            reserved_stock: 0,
        });
        setSuggestedIconName(null); // Clear suggested icon when closing modal
    };

    const handleAddPricingOption = () => {
        setNewInventoryItemData(prev => ({
            ...prev,
            pricingOptions: [...prev.pricingOptions, { id: crypto.randomUUID(), name: '', price: 0, unit: 'pieces' }]
        }));
    };

    const handleRemovePricingOption = (index: number) => {
        setNewInventoryItemData(prev => ({
            ...prev,
            pricingOptions: prev.pricingOptions.filter((_, i) => i !== index)
        }));
    };

    const handlePricingOptionChange = (index: number, field: keyof PricingOption, value: string | number) => {
        setNewInventoryItemData(prev => {
            const updatedOptions = [...prev.pricingOptions];
            if (field === 'price' && typeof value === 'string') {
                updatedOptions[index] = { ...updatedOptions[index], [field]: parseFloat(value) || 0 };
            } else {
                updatedOptions[index] = { ...updatedOptions[index], [field]: value };
            }
            return { ...prev, pricingOptions: updatedOptions };
        });
    };


    // --- Custom Category Logic ---
    const handleAddCategory = async () => {
        if (newCategoryName.trim() === '') {
            alert('Category name cannot be empty.');
            return;
        }
        if (allItemCategories.some(cat => cat.name.toLowerCase() === newCategoryName.trim().toLowerCase())) {
            alert('Category already exists.');
            return;
        }

        const newCategory: Category = {
            id: crypto.randomUUID(),
            name: newCategoryName.trim(),
            icon_name: suggestedIconName || 'CircleDashed', // Use suggested icon name or default
        };

        try {
            const { data, error } = await supabase
                .from('categories')
                .insert([newCategory])
                .select(); // Use .select() to return the inserted data

            if (error) {
                throw new Error(error.message);
            }
            if (data && data.length > 0) {
                // Add the new category to the local state
                setAllItemCategories(prev => [...prev, data[0]]); // Supabase returns the inserted row
                alert("Category added successfully!");
                setNewCategoryName('');
                setSuggestedIconName(null); // Clear suggested icon name
                setShowAddCategoryModal(false);
            } else {
                 throw new Error("Category insertion failed, no data returned.");
            }
        } catch (e: any) {
            console.error('Error adding category:', e);
            alert(`Failed to add category: ${e.message}`);
        }
    };

    const handleDeleteCategory = async (categoryId: string) => {
        setConfirmMessage("Are you sure you want to delete this category? Items assigned to this category will revert to 'Other'. This action cannot be undone.");
        setConfirmAction(() => async () => {
            try {
                // First, reassign any inventory items in this category to 'Other'
                const itemsToUpdate = inventoryItems.filter(item => item.category === allItemCategories.find(cat => cat.id === categoryId)?.name);
                const updatePromises = itemsToUpdate.map(item =>
                    fetch('/api/inventory', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify([{ ...item, id: item.id, category: 'Other' }]), // Pass item.id for update
                    })
                );
                await Promise.all(updatePromises);


                const { error } = await supabase
                    .from('categories')
                    .delete()
                    .eq('id', categoryId);

                if (error) {
                    throw new Error(error.message);
                }

                alert("Category deleted successfully!");
                setShowConfirmModal(false);
                refreshData(); // Refresh all data to reflect category and inventory changes
            } catch (e: any) {
                console.error('Error deleting category:', e);
                alert(`Failed to delete category: ${e.message}`);
            }
        });
        setShowConfirmModal(true);
    };


    // --- Order Management Logic ---

    const handleAddOrder = async () => {
    if (!newOrderData.memberUid || newOrderData.items.length === 0) {
        alert("A member UID and at least one item are required for an order.");
        return;
    }

    // Check if there's enough available stock for each item in the order
    for (const orderItem of newOrderData.items) {
        const inventoryItem = inventoryItems.find(inv => inv.id === orderItem.itemId);
        // Displaying available_stock correctly without subtracting reserved_stock for order creation check
        if (!inventoryItem || (inventoryItem.available_stock ?? 0) < orderItem.quantity) {
            alert(`Not enough available stock for ${orderItem.name}. Only ${(inventoryItem?.available_stock ?? 0)}, Requested: ${orderItem.quantity}`);
            return;
        }
    }

    // Reserve stock for the order
    const reservationResult = await reserveStockForOrder(
        newOrderData.items.map(item => ({ itemId: item.itemId, quantity: item.quantity })),
        inventoryItems
    );

    if (!reservationResult.success) {
        alert(`Failed to create order: ${reservationResult.message}`);
        return;
    }

    const orderTotal = newOrderData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const orderToSave: Order = {
        id: crypto.randomUUID(),
        member_uid: newOrderData.memberUid,
        items_json: newOrderData.items.map(item => ({
            itemId: item.itemId,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            unit: item.unit,
            category: item.category,
            selectedOptionId: item.selectedOptionId,
        })),
        total_price: parseFloat(orderTotal.toFixed(2)),
        status: 'pending', // Set initial status to pending
        order_date: new Date().toISOString(),
    };

    try {
        const response = await fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...orderToSave, items_json: JSON.stringify(orderToSave.items_json) }),
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Failed to add order: ${errorData.error || response.statusText}`);
        }
        alert("Order added successfully!");
        closeOrderModal();
        refreshData();
    } catch (error: any) {
        // If order creation fails, attempt to release the reserved stock
        await releaseStockFromOrder(
            newOrderData.items.map(item => ({ itemId: item.itemId, quantity: item.quantity })),
            inventoryItems
        );
        alert(`Failed to add order: ${error.message}. Reserved stock has been released.`);
        console.error('Add order error:', error);
    }
};

    const handleDeleteOrder = (orderId: string) => {
    setConfirmMessage("Are you sure you want to delete this order? This action cannot be undone. Reserved stock for this order will be returned to available stock.");
    setConfirmAction(() => async () => {
        try {
            const orderToDelete = orders.find(order => order.id === orderId);
            if (!orderToDelete) {
                alert("Order not found.");
                return;
            }

            const response = await fetch(`/api/orders/${orderId}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Failed to delete order: ${errorData.error || response.statusText}`);
            }
console.log("Order items for release:", orderToDelete.items);
console.log("Mapped order items for release:", orderToDelete.items.map(item => ({ itemId: item.itemId, quantity: item.quantity })));
console.log("Current inventory being passed:", inventoryItems);
            // This is the crucial line:
            const releaseResult = await releaseStockFromOrder(
                orderToDelete.items.map(item => ({ itemId: item.itemId, quantity: item.quantity })), // <-- Source of items
                inventoryItems // <-- Source of current inventory
            );

            if (!releaseResult.success) {
                console.error('Failed to release stock for deleted order:', releaseResult.message);
                alert(`Order deleted, but failed to release stock: ${releaseResult.message}. Please check inventory manually.`);
            } else {
                alert("Order deleted successfully and stock released!");
            }
            setShowConfirmModal(false);
            refreshData(); // Re-fetch data to reflect changes
        } catch (error: any) {
            alert(`Failed to delete order: ${error.message}`);
            console.error('Delete order error:', error);
        }
    });
    setShowConfirmModal(true);
};
const handleCancelOrder = (order: AppOrder) => {
    setOrderToCancel(order);
    setConfirmMessage(`Are you sure you want to cancel order ${order.id}? This will release reserved stock.`);
    setConfirmAction(() => async () => {
        if (!orderToCancel) return;

        const releaseResult = await releaseStockFromOrder(
            orderToCancel.items.map(item => ({ itemId: item.itemId, quantity: item.quantity })),
            inventoryItems
        );

        if (releaseResult.success) {
            // Now delete the order from the backend
            try {
                const response = await fetch(`/api/orders/${orderToCancel.id}`, {
                    method: 'DELETE',
                });
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(`Failed to delete order from backend: ${errorData.error || response.statusText}`);
                }
                alert("Order cancelled and stock released successfully!");
                refreshData();
            } catch (error: any) {
                alert(`Failed to cancel order: ${error.message}`);
                console.error('Order cancellation error:', error);
            }
        } else {
            alert(`Failed to cancel order: ${releaseResult.message}`);
        }
        setShowConfirmModal(false);
        setOrderToCancel(null);
    });
    setShowConfirmModal(true);
};
    // Modified handleFulfillOrder to load items to PoS
    const handleFulfillOrder = (orderToFulfill: AppOrder) => {
        const orderMember = members.find(m => m.uid === orderToFulfill.member_uid);
        if (!orderMember) {
            alert("Member associated with this order not found. Cannot fulfill.");
            return;
        }

        setConfirmMessage(`Are you sure you want to load order #${orderToFulfill.id.substring(0, 8)} for ${orderMember.name || 'Unknown Member'} into the PoS for fulfillment?`);
        setConfirmAction(() => () => {
            // Set transaction items from the order
            setCurrentTransactionItems(orderToFulfill.items.map(orderItem => {
                const invItem = inventoryItems.find(inv => inv.id === orderItem.itemId);
                const selectedOpt = invItem?.pricing_options.find(opt => opt.id === orderItem.selectedOptionId);
                return {
                    id: orderItem.itemId,
                    name: orderItem.name,
                    price: orderItem.price,
                    unit: orderItem.unit,
                    category: orderItem.category,
                    quantity: orderItem.quantity,
                    subtotal: orderItem.price * orderItem.quantity,
                    selectedOptionId: orderItem.selectedOptionId,
                };
            }));

            // Set current member
            setCurrentMember(orderMember);

            // Set flags for order fulfillment
            setIsFulfillingOrder(true);
            setOrderBeingFulfilledId(orderToFulfill.id);

            // Navigate to PoS screen
            setActiveScreen('pos');
            setShowConfirmModal(false); // Close confirmation modal
            alert(`Order #${orderToFulfill.id.substring(0, 8)} loaded into PoS. Click 'Process Payment' to complete fulfillment.`);
        });
        setShowConfirmModal(true);
    };


    const openOrderForm = (order: AppOrder | null = null) => {
        if (order) {
            setEditOrderId(order.id);
            setNewOrderData({
                memberUid: order.member_uid,
                comment: order.comment || '',
                items: order.items,
            });
        } else {
            setEditOrderId(null);
            setNewOrderData({
                memberUid: '',
                comment: '',
                items: [],
            });
        }
        setShowOrderModal(true);
    };

    const closeOrderModal = () => {
        setShowOrderModal(false);
        setEditOrderId(null);
        setNewOrderData({
            memberUid: '',
            comment: '',
            items: [],
        });
    };

    const handleAddOrderItem = (item: AppInventoryItem, selectedOption: PricingOption, quantity: number) => {
        setNewOrderData(prev => ({
            ...prev,
            items: [...prev.items, {
                itemId: item.id,
                name: item.name,
                quantity: quantity,
                price: selectedOption.price,
                unit: selectedOption.unit,
                category: item.category,
                selectedOptionId: selectedOption.id,
            }]
        }));
    };

    const handleRemoveOrderItem = (indexToRemove: number) => {
        setNewOrderData(prev => ({
            ...prev,
            items: prev.items.filter((_, index) => index !== indexToRemove),
        }));
    };


    // --- UI Calculations for Current Transaction ---
    const { subtotal, discountRate, discountAmount, taxAmount, finalTotal } = calculateTotals();

    // --- Filtered Transaction History ---
    const filteredTransactions = transactions.filter(t => {
        const member = members.find(m => m.uid === t.member_uid);
        const memberName = member ? member.name.toLowerCase() : '';
        const transactionItemsNames = Array.isArray(t.items) ? t.items.map(item => item.name.toLowerCase()).join(' ') : '';
        const searchLower = searchTerm.toLowerCase();

        return (
            JSON.stringify(t).toLowerCase().includes(searchLower) ||
            memberName.includes(searchLower) ||
            transactionItemsNames.includes(searchLower)
        );
    }).sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime());


    // Filtered Pending Orders for Current Member (on PoS screen)
    const pendingOrdersForCurrentMember = orders.filter(order =>
        order.status === 'pending' && order.member_uid === currentOrderMemberUID
    );

    // Filtered Transactions for Reports Screen
    const filteredReportTransactions = transactions.filter(t => {
        // Filter by member UID
        const matchesMember = selectedReportMemberUid ? t.member_uid === selectedReportMemberUid : true;

        // Filter by date range
        const transactionDate = new Date(t.transaction_date);
        const start = reportStartDate ? new Date(reportStartDate) : null;
        const end = reportEndDate ? new Date(reportEndDate) : null;

        const matchesDateRange = (!start || transactionDate >= start) &&
                                 (!end || transactionDate <= end); // End date inclusive

        return matchesMember && matchesDateRange;
    }).sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime());

    // Calculate totals for filtered report transactions
    const totalReportTransactions = filteredReportTransactions.length;
    const totalReportRevenue = filteredReportTransactions.reduce((acc, t) => acc + t.final_total, 0);

    // Calculate sales by category for filtered report transactions
    const reportCategorySales = allItemCategories.map(cat => { // Use allItemCategories here
        const categorySales = filteredReportTransactions.reduce((acc, t) => {
            const itemsInCat = t.items.filter(item => item.category === cat.name);
            return acc + itemsInCat.reduce((sum, item) => sum + item.subtotal, 0);
        }, 0);
        return { name: cat.name, sales: categorySales };
    });

    // Calculate top selling items for filtered report transactions
    const reportItemSalesMap = new Map<string, { quantity: number; revenue: number; name: string }>();
    filteredReportTransactions.forEach(t => {
        t.items.forEach(item => {
            const current = reportItemSalesMap.get(item.id) || { quantity: 0, revenue: 0, name: item.name };
            current.quantity += item.quantity;
            current.revenue += item.subtotal;
            reportItemSalesMap.set(item.id, current);
        });
    });
    const sortedReportItems = Array.from(reportItemSalesMap.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

    // Calculate total available and reserved stock for the Inventory tab header
    const totalAvailableStock = inventoryItems.reduce((sum, item) => sum + item.available_stock, 0);
    const totalReservedStock = inventoryItems.reduce((sum, item) => sum + (item.reserved_stock ?? 0), 0);
// THESE ARE THE LINES THAT MUST BE INSIDE THE App FUNCTION
    const [draggedCategoryIndex, setDraggedCategoryIndex] = useState<number | null>(null);
    const [dragOverCategoryIndex, setDragOverCategoryIndex] = useState<number | null>(null);


    // --- Menu Layout Management Logic ---
    const handleAddMenuLayout = () => {
        if (!editMenuLayoutData?.name.trim()) {
            // Using a simple message box instead of alert()
            alert('Menu layout name cannot be empty.');
            return;
        }
        if (menuLayouts.some(l => l.name.toLowerCase() === editMenuLayoutData.name.trim().toLowerCase() && l.id !== editMenuLayoutData.id)) {
            // Using a simple message box instead of alert()
            alert('A menu layout with this name already exists.');
            return;
        }

        if (editMenuLayoutData.id) { // Editing existing layout
            setMenuLayouts(prev => prev.map(l => l.id === editMenuLayoutData.id ? editMenuLayoutData : l));
        } else { // Adding new layout
            setMenuLayouts(prev => [...prev, { ...editMenuLayoutData, id: crypto.randomUUID() }]);
        }
        setShowMenuLayoutModal(false);
        setEditMenuLayoutData(null);
    };

    const handleDeleteMenuLayout = (layoutId: string) => {
        setConfirmMessage("Are you sure you want to delete this menu layout? This action cannot be undone.");
        setConfirmAction(() => () => {
            setMenuLayouts(prev => prev.filter(l => l.id !== layoutId));
            // If the deleted layout was active, switch to the first available layout
            if (activeMenuLayoutId === layoutId && menuLayouts.length > 1) {
                // Ensure the new active ID is from the filtered list, not the old state.
                const remainingLayouts = menuLayouts.filter(l => l.id !== layoutId);
                setActiveMenuLayoutId(remainingLayouts.length > 0 ? remainingLayouts[0].id : '');
            } else if (menuLayouts.length === 1 && activeMenuLayoutId === layoutId) {
                setActiveMenuLayoutId(''); // No layouts left
            }
            setShowConfirmModal(false);
        });
        setShowConfirmModal(true);
    };

    const openMenuLayoutForm = (layout: MenuLayout | null = null) => {
        setEditMenuLayoutData(layout ? { ...layout } : { id: '', name: '', categories: allItemCategories.map(c => c.name) }); // Default new layout to all categories
        setShowMenuLayoutModal(true);
    };

    const toggleCategoryInLayout = (categoryName: string) => {
        setEditMenuLayoutData(prev => {
            if (!prev) return null;
            const updatedCategories = prev.categories.includes(categoryName)
                ? prev.categories.filter(cat => cat !== categoryName)
                : [...prev.categories, categoryName];
            return { ...prev, categories: updatedCategories };
        });
    };

    // Get categories for the currently active menu layout
    const activeMenuCategories = activeMenuLayoutId
        ? menuLayouts.find(l => l.id === activeMenuLayoutId)?.categories || []
        : allItemCategories.map(c => c.name);

    // Handler for when an icon is suggested from the CategoryIconSuggester
    const handleIconSuggested = (iconName: string) => {
        setSuggestedIconName(iconName);
        setShowCategoryIconSuggester(false); // Close the suggester modal
    };


    if (!isLoggedIn) {
        return (
            <div className="fixed inset-0 bg-gray-950 flex items-center justify-center z-50 p-4">
                <div className="bg-gray-900 p-8 rounded-lg shadow-xl max-w-sm w-full border border-gray-700">
                    <h3 className="text-2xl font-semibold mb-6 text-yellow-400 text-center flex items-center justify-center">
                        <LogIn className="w-7 h-7 mr-2" />
                        Login
                    </h3>
                    {loginError && (
                        <p className="text-red-500 text-sm mb-4 text-center">{loginError}</p>
                    )}
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="loginNfcInput" className="block text-gray-300 text-sm font-medium mb-2">NFC UID (Scan or Enter)</label>
                            <input
                                type="text"
                                id="loginNfcInput"
                                value={loginNfcInput}
                                onChange={(e) => {
                                    setLoginNfcInput(e.target.value);
                                    if (e.target.value) { // Clear username/password if UID is entered
                                        setLoginUsername('');
                                        setLoginPassword('');
                                    }
                                }}
                                placeholder="e.g., 0410C5D7A93F"
                                className="w-full px-4 py-2 border border-gray-600 rounded-lg focus:ring-yellow-400 focus:border-yellow-400 transition duration-150 ease-in-out bg-gray-800 text-gray-200 shadow-sm"
                            />
                        </div>
                        <div className="text-center text-gray-400">- OR -</div>
                        <div>
                            <label htmlFor="loginUsername" className="block text-gray-300 text-sm font-medium mb-2">Username</label>
                            <input
                                type="text"
                                id="loginUsername"
                                value={loginUsername}
                                onChange={(e) => {
                                    setLoginUsername(e.target.value);
                                    if (e.target.value) setLoginNfcInput(''); // Clear UID if username is entered
                                }}
                                placeholder="Enter username"
                                className="w-full px-4 py-2 border border-gray-600 rounded-lg focus:ring-yellow-400 focus:border-yellow-400 transition duration-150 ease-in-out bg-gray-800 text-gray-200 shadow-sm"
                            />
                        </div>
                        <div>
                            <label htmlFor="loginPassword" className="block text-gray-300 text-sm font-medium mb-2">Password</label>
                            <input
                                type="password"
                                id="loginPassword"
                                value={loginPassword}
                                onChange={(e) => {
                                    setLoginPassword(e.target.value);
                                    if (e.target.value) setLoginNfcInput(''); // Clear UID if password is entered
                                }}
                                placeholder="Enter password"
                                className="w-full px-4 py-2 border border-gray-600 rounded-lg focus:ring-yellow-400 focus:border-yellow-400 transition duration-150 ease-in-out bg-gray-800 text-gray-200 shadow-sm"
                            />
                        </div>
                        <button
                            onClick={handleLogin}
                            className="w-full px-5 py-3 rounded-lg bg-yellow-400 text-gray-900 font-semibold hover:bg-yellow-500 transition-colors duration-200 shadow-md flex items-center justify-center mt-6"
                        >
                            <LogIn className="w-5 h-5 mr-2" />
                            Login
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-950 text-gray-200 flex items-center justify-center">
                <p className="text-xl text-yellow-400">Loading data...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-950 text-red-400 flex items-center justify-center">
                <p className="text-xl">Error: {error}. Please refresh the page.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-950 text-gray-200 font-inter p-4 flex flex-col">
            {/* Confirmation Modal */}
            {showConfirmModal && (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
                    <div className="bg-gray-800 p-8 rounded-lg shadow-xl max-w-sm w-full border border-gray-700">
                        <h3 className="text-xl font-semibold mb-4 text-yellow-400">Confirm Action</h3>
                        <p className="text-gray-200 mb-6">{confirmMessage}</p>
                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={() => setShowConfirmModal(false)}
                                className="px-5 py-2 rounded-lg bg-gray-700 text-gray-200 font-medium hover:bg-gray-600 transition-colors duration-200 shadow"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    if (confirmAction) confirmAction();
                                }}
                                className="px-5 py-2 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 transition-colors duration-200 shadow"
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header Section */}
            <div className="flex justify-between items-center bg-gray-900 p-4 rounded-lg shadow-md mb-4 border border-gray-700">
                <h1 className="text-3xl font-bold text-yellow-400 flex items-center">
                    <ShoppingCart className="w-8 h-8 mr-2 text-yellow-500" />
                    SCC Member PoS
                </h1>
                <Clock />
                <div className="text-md text-gray-500 flex items-center">
                    <span className="font-semibold text-gray-400 mr-2">Storage:</span> Supabase
                    <button
                        onClick={handleLogout}
                        className="ml-4 px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm font-medium"
                    >
                        Logout
                    </button>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex justify-center mb-6">
                <button
                    onClick={() => setActiveScreen('menu')}
                    className={`px-6 py-3 rounded-l-lg font-semibold transition-all duration-200 ${activeScreen === 'menu' ? 'bg-yellow-400 text-gray-900 shadow-lg' : 'bg-gray-800 text-gray-200 hover:bg-gray-700 hover:text-yellow-400'}`}
                >
                    <Grid className="w-5 h-5 inline-block mr-2" />
                    Menu
                </button>
                <button
                    onClick={() => setActiveScreen('pos')}
                    className={`px-6 py-3 font-semibold transition-all duration-200 ${activeScreen === 'pos' ? 'bg-yellow-400 text-gray-900 shadow-lg' : 'bg-gray-800 text-gray-200 hover:bg-gray-700 hover:text-yellow-400'}`}
                >
                    <ShoppingCart className="w-5 h-5 inline-block mr-2" />
                    PoS
                </button>
                <button
                    onClick={() => setActiveScreen('members')}
                    className={`px-6 py-3 font-semibold transition-all duration-200 ${activeScreen === 'members' ? 'bg-yellow-400 text-gray-900 shadow-lg' : 'bg-gray-800 text-gray-200 hover:bg-gray-700 hover:text-yellow-400'}`}
                >
                    <Users className="w-5 h-5 inline-block mr-2" />
                    Members
                </button>
                <button
                    onClick={() => setActiveScreen('history')}
                    className={`px-6 py-3 font-semibold transition-all duration-200 ${activeScreen === 'history' ? 'bg-yellow-400 text-gray-900 shadow-lg' : 'bg-gray-800 text-gray-200 hover:bg-gray-700 hover:text-yellow-400'}`}
                >
                    <History className="w-5 h-5 inline-block mr-2" />
                    History
                </button>
                <button
                    onClick={() => setActiveScreen('inventory')}
                    className={`px-6 py-3 font-semibold transition-all duration-200 ${activeScreen === 'inventory' ? 'bg-yellow-400 text-gray-900 shadow-lg' : 'bg-gray-800 text-gray-200 hover:bg-gray-700 hover:text-yellow-400'}`}
                >
                    <Package className="w-5 h-5 inline-block mr-2" />
                    Inventory
                </button>
                <button
                    onClick={() => setActiveScreen('orders')}
                    className={`px-6 py-3 font-semibold transition-all duration-200 ${activeScreen === 'orders' ? 'bg-yellow-400 text-gray-900 shadow-lg' : 'bg-gray-800 text-gray-200 hover:bg-gray-700 hover:text-yellow-400'}`}
                >
                    <ShoppingBag className="w-5 h-5 inline-block mr-2" /> {/* Reusing ShoppingBag for orders */}
                    Orders
                </button>
                <button
                    onClick={() => setActiveScreen('reports')}
                    className={`px-6 py-3 font-semibold transition-all duration-200 ${activeScreen === 'reports' ? 'bg-yellow-400 text-gray-900 shadow-lg' : 'bg-gray-800 text-gray-200 hover:bg-gray-700 hover:text-yellow-400'}`}
                >
                    <PieChart className="w-5 h-5 inline-block mr-2" /> {/* New icon for reports */}
                    Reports
                </button>
                <button
                    onClick={() => setActiveScreen('settings')}
                    className={`px-6 py-3 rounded-r-lg font-semibold transition-all duration-200 ${activeScreen === 'settings' ? 'bg-yellow-400 text-gray-900 shadow-lg' : 'bg-gray-800 text-gray-200 hover:bg-gray-700 hover:text-yellow-400'}`}
                >
                    <Settings className="w-5 h-5 inline-block mr-2" />
                    Settings
                </button>
            </div>

            {/* Main Content Area - Menu Screen */}
            {activeScreen === 'menu' && (
                <div className="flex-1 bg-gray-900 p-6 rounded-lg shadow-md border border-gray-700 flex flex-col">
                    <h2 className="text-2xl font-bold text-yellow-400 mb-6 flex items-center justify-between">
                        <span className="flex items-center">
                            <Grid className="w-6 h-6 mr-2" />
                            Select a Menu Category
                        </span>
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 flex-1 overflow-y-auto pb-4">
                        {/* Display allItemCategories, filtered by activeMenuCategories */}
                        {allItemCategories
                            .filter(category => activeMenuCategories.includes(category.name))
                            .map(category => {
                                const IconComponent = getCategoryIcon(category.name);
                                return (
                                    <button
                                        key={category.id} // Use category.id as key
                                        onClick={() => {
                                            setSelectedCategoryFilter(category.name);
                                            setShowItemSelectionModal(true);
                                        }}
                                        className="flex flex-col items-center justify-center p-6 bg-gray-800 rounded-xl shadow-lg hover:bg-gray-700 transition-colors duration-200 transform hover:scale-105 text-yellow-400 border border-gray-700"
                                    >
                                        <IconComponent className="w-16 h-16 mb-3" />
                                        <span className="text-xl font-semibold text-gray-100">{category.name}</span>
                                    </button>
                                );
                            })}
                    </div>
                    {/* Menu Layout Switcher Buttons */}
                    <div className="mt-6 flex flex-wrap justify-center gap-3 p-4 bg-gray-800 rounded-lg border border-gray-700">
                        <span className="text-lg font-semibold text-gray-300 mr-2">Switch Layout:</span>
                        {menuLayouts.map(layout => (
                            <button
                                key={layout.id}
                                onClick={() => setActiveMenuLayoutId(layout.id)}
                                className={`px-5 py-2 rounded-lg font-semibold transition-all duration-200 ${activeMenuLayoutId === layout.id ? 'bg-yellow-400 text-gray-900 shadow-md' : 'bg-gray-700 text-gray-200 hover:bg-gray-600'}`}
                            >
                                {layout.name}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Main Content Area - PoS Screen */}
            {activeScreen === 'pos' && (
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Member Info Panel */}
                    <div className="lg:col-span-1 flex flex-col bg-gray-900 p-6 rounded-lg shadow-md border border-gray-700">
                        <h2 className="text-2xl font-bold text-yellow-400 mb-4 flex items-center">
                            <Users className="w-6 h-6 mr-2" />
                            Member Information
                        </h2>
                        <div className="mb-4">
                            <label className="block text-gray-300 text-sm font-medium mb-2">Simulate NFC Scan (Enter UID):</label>
                            <input
                                type="text"
                                value={nfcInput}
                                onChange={(e) => setNfcInput(e.target.value)}
                                placeholder="e.g., 0410C5D7A93F"
                                className="w-full px-4 py-2 border border-gray-600 rounded-lg focus:ring-yellow-400 focus:border-yellow-400 transition duration-150 ease-in-out bg-gray-800 text-gray-200 shadow-sm"
                            />
                            <div className="flex space-x-2 mt-3">
                                <button
                                    onClick={handleNfcScan}
                                    className="flex-1 bg-yellow-400 text-gray-900 px-5 py-2 rounded-lg font-semibold hover:bg-yellow-500 transition-colors duration-200 shadow-md flex items-center justify-center"
                                >
                                    <Scan className="w-5 h-5 mr-2" />
                                    Scan Card
                                </button>
                                <button
                                    onClick={handleNfcRemove}
                                    className="flex-1 bg-gray-700 text-gray-200 px-5 py-2 rounded-lg font-semibold hover:bg-gray-600 transition-colors duration-200 shadow-md flex items-center justify-center"
                                >
                                    <XCircle className="w-5 h-5 mr-2" />
                                    Remove Card
                                </button>
                            </div>
                        </div>
                        <div className="text-sm font-medium text-gray-400 mb-4">
                            NFC Status: <span className={nfcStatus.includes('Detected') ? 'text-green-400' : 'text-orange-400'}>{nfcStatus}</span>
                        </div>
                        <div className="border-t border-gray-700 pt-4 flex-1 overflow-y-auto">
                            {currentMember ? (
                                <div className="space-y-3">
                                    <p className="text-xl font-bold text-yellow-400">Name: {currentMember.name}</p>
                                    <p className="text-lg text-gray-300">Card No: {currentMember.card_number}</p>
                                    <p className="text-lg text-gray-300">Tier: <span className={`font-semibold ${currentMember.tier === 'Gold' ? 'text-yellow-400' : currentMember.tier === 'Supreme' ? 'text-blue-400' : 'text-green-400'}`}>{currentMember.tier}</span></p>
                                    <p className="text-lg text-gray-300">Discount: <span className="font-semibold text-red-400">{getDiscountRate(currentMember.tier) * 100}%</span></p>
                                    <p className="text-lg text-gray-300">Total Purchases: <span className="font-semibold">{formatCurrency(currentMember.total_purchases || 0)}</span></p>

                                    {/* Display Pending Orders for Current Member */}
                                    {pendingOrdersForCurrentMember.length > 0 && (
                                        <div className="mt-6 pt-4 border-t border-gray-700">
                                            <h3 className="text-xl font-bold text-orange-400 mb-3">Pending Orders:</h3>
                                            <div className="space-y-3">
                                                {pendingOrdersForCurrentMember.map(order => (
                                                    <div key={order.id} className="bg-gray-800 p-3 rounded-lg border border-gray-700">
                                                        <p className="text-lg font-semibold text-gray-100">Order ID: {order.id.substring(0, 8)}</p>
                                                        <p className="text-sm text-gray-300">Total: {formatCurrency(order.total_price)}</p>
                                                        <ul className="list-disc list-inside text-sm text-gray-400 mb-2">
                                                            {order.items.map((item, idx) => (
                                                                <li key={idx}>{item.name} ({item.quantity} {item.unit})</li>
                                                            ))}
                                                        </ul>
                                                        {order.comment && <p className="text-sm text-gray-400 italic">Comment: {order.comment}</p>}
                                                        <button
                                                            onClick={() => handleFulfillOrder(order)}
                                                            className="mt-2 w-full bg-green-600 text-white px-3 py-2 rounded-lg font-semibold hover:bg-green-700 transition-colors"
                                                        >
                                                            Fulfill Order
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <p className="text-center text-gray-500 py-8">No member card scanned.</p>
                            )}
                        </div>
                    </div>

                    {/* Transaction Panel */}
                    <div className="lg:col-span-2 bg-gray-900 p-6 rounded-lg shadow-md border border-gray-700 flex flex-col">
                        <h2 className="text-2xl font-bold text-yellow-400 mb-4 flex items-center">
                            <ShoppingCart className="w-6 h-6 mr-2" />
                            Current Transaction
                            {isFulfillingOrder && orderBeingFulfilledId && (
                                <span className="ml-3 px-3 py-1 bg-blue-500 text-white text-sm rounded-full">Fulfilling Order #{orderBeingFulfilledId.substring(0, 8)}</span>
                            )}
                        </h2>

                        {/* Current Items List */}
                        <div className="flex-1 overflow-y-auto border border-gray-700 rounded-lg mb-4 bg-gray-800">
                            {currentTransactionItems.length === 0 ? (
                                <p className="text-center text-gray-500 py-10">No items added yet. Select from menu or directly below.</p>
                            ) : (
                                <table className="min-w-full divide-y divide-gray-700">
                                    <thead className="bg-gray-700">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Item</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Price</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Qty ({'Unit'})</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Subtotal</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-gray-800 divide-y divide-gray-700">
                                        {currentTransactionItems.map((item, index) => (
                                            <tr key={index}>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-100">{item.name}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{formatCurrency(item.price)}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{item.quantity} {item.unit}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-400">{formatCurrency(item.subtotal)}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-left text-sm font-medium"> {/* Adjusted text-align */}
                                                    <button
                                                        onClick={() => handleRemoveItem(index)}
                                                        className="text-red-500 hover:text-red-400 transition duration-150 ease-in-out"
                                                    >
                                                        Remove
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        {/* Totals Display */}
                        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 space-y-2 mb-4">
                            <div className="flex justify-between text-lg font-medium text-gray-300">
                                <span>Subtotal:</span>
                                <span>{formatCurrency(subtotal)}</span>
                            </div>
                            <div className="flex justify-between text-lg font-medium text-gray-300">
                                <span>Discount ({currentMember ? (getDiscountRate(currentMember.tier) * 100).toFixed(0) : 0}%):</span>
                                <span className="text-red-400">- {formatCurrency(discountAmount)}</span>
                            </div>
                            <div className="flex justify-between text-lg font-medium text-gray-300">
                                <span>Tax ({(taxRate * 100).toFixed(0)}%):</span>
                                <span>{formatCurrency(taxAmount)}</span>
                            </div>
                            <div className="flex justify-between text-lg font-medium text-gray-300">
                                <span>Payment Method:</span>
                                <span className="capitalize">{selectedPaymentMethod || 'N/A'}</span> {/* Display selected payment method */}
                            </div>
                            <div className="flex justify-between text-3xl font-bold text-yellow-400 pt-2 border-t border-gray-700">
                                <span>Final Total:</span>
                                <span>{formatCurrency(finalTotal)}</span>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <button
                                onClick={handleClearTransaction}
                                className="bg-orange-600 text-white px-5 py-3 rounded-lg font-semibold hover:bg-orange-700 transition-colors duration-200 shadow-md flex items-center justify-center"
                            >
                                <Trash2 className="w-5 h-5 inline-block mr-2" />
                                Clear Transaction
                            </button>
                            <button
                                onClick={handleProcessPayment}
                                className="bg-yellow-400 text-gray-900 px-5 py-3 rounded-lg font-semibold hover:bg-yellow-500 transition-colors duration-200 shadow-md flex items-center justify-center"
                            >
                                <CheckCircle className="w-5 h-5 inline-block mr-2" />
                                Process Payment
                            </button>
                            <button
                                onClick={handlePrintReceipt}
                                className="bg-gray-700 text-gray-200 px-5 py-3 rounded-lg font-semibold hover:bg-gray-600 transition-colors duration-200 shadow-md flex items-center justify-center"
                            >
                                <Printer className="w-5 h-5 inline-block mr-2" />
                                Print Last Receipt
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content Area - Members Screen */}
            {activeScreen === 'members' && (
                <div className="flex-1 bg-gray-900 p-6 rounded-lg shadow-md border border-gray-700 flex flex-col">
                    <h2 className="text-2xl font-bold text-yellow-400 mb-4 flex items-center">
                        <Users className="w-6 h-6 mr-2" />
                        Member Management
                    </h2>
                    <div className="flex flex-wrap gap-4 mb-4">
                        <button
                            onClick={() => openMemberForm()}
                            className="bg-yellow-400 text-gray-900 px-5 py-2 rounded-lg font-semibold hover:bg-yellow-500 transition-colors duration-200 shadow-md w-fit flex items-center justify-center"
                        >
                            <PlusCircle className="w-5 h-5 inline-block mr-2" />
                            Add New Member
                        </button>
                        <label className="px-4 py-2 bg-green-500 text-white rounded-md cursor-pointer hover:bg-green-600 transition-colors">
                            Import Members
                            <input type="file" accept=".json" onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                try {
                                    const fileContent = await file.text();
                                    const importedData: Member[] = JSON.parse(fileContent);
                                    if (!Array.isArray(importedData) || importedData.some(item => !item.id)) {
                                        throw new Error('Invalid JSON format. Expected an array of objects with an "id" field.');
                                    }
                                    const response = await fetch(`/api/members`, {
                                        method: 'PUT',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify(importedData),
                                    });
                                    if (!response.ok) {
                                        const errorData = await response.json();
                                        throw new Error(`Failed to import members: ${errorData.error || response.statusText}`);
                                    }
                                    // Using a simple message box instead of alert()
                                    alert("Members imported successfully! Data refreshed.");
                                    refreshData();
                                } catch (err: any) {
                                    console.error("Error importing members:", err);
                                    // Using a simple message box instead of alert()
                                    alert(`Failed to import members: ${err.message}`);
                                } finally {
                                    e.target.value = '';
                                }
                            }} className="hidden" />
                        </label>
                        <button
                            onClick={async () => {
                                try {
                                    const response = await fetch(`/api/members`);
                                    if (!response.ok) {
                                        throw new Error(`Failed to fetch members for export: ${response.statusText}`);
                                    }
                                    const dataToExport: Member[] = await response.json();
                                    const jsonString = JSON.stringify(dataToExport, null, 2);
                                    const blob = new Blob([jsonString], { type: 'application/json' });
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = `members.json`;
                                    document.body.appendChild(a);
                                    a.click();
                                    document.body.removeChild(a);
                                    URL.revokeObjectURL(url);
                                    // Using a simple message box instead of alert()
                                    alert("Members exported successfully!");
                                } catch (err: any) {
                                    console.error("Error exporting members:", err);
                                    // Using a simple message box instead of alert()
                                    alert(`Failed to export members: ${err.message}`);
                                }
                            }}
                            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                        >
                            Export Members
                        </button>
                        <button
                            onClick={refreshData}
                            className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                        >
                            Refresh
                        </button>
                    </div>
                    {members.length === 0 ? (
                        <p className="text-center text-gray-500 py-10">No members registered yet.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-700">
                                <thead className="bg-gray-800">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Card No.</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">UID</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Name</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Tier</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Total Purchases</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-gray-900 divide-y divide-gray-700">
                                    {members.map((member) => (
                                        <tr key={member.id}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-100">{member.card_number}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{member.uid}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-100">{member.name}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{member.tier}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{member.status}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{formatCurrency(member.total_purchases || 0)}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-left text-sm font-medium"> {/* Changed to text-left */}
                                                <button
                                                    onClick={() => openMemberForm(member)}
                                                    className="text-yellow-400 hover:text-yellow-300 mr-3 transition duration-150 ease-in-out"
                                                >
                                                    <Edit2 className="w-4 h-4 inline-block mr-1" /> Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteMember(member.id)}
                                                    className="text-red-500 hover:text-red-400 transition duration-150 ease-in-out"
                                                >
                                                    <Trash2 className="w-4 h-4 inline-block mr-1" /> Delete
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Main Content Area - History Screen */}
            {activeScreen === 'history' && (
                <div className="flex-1 bg-gray-900 p-6 rounded-lg shadow-md border border-gray-700 flex flex-col">
                    <h2 className="text-2xl font-bold text-yellow-400 mb-4 flex items-center">
                        <History className="w-6 h-6 mr-2" />
                        Transaction History
                    </h2>
                    <div className="flex flex-wrap gap-4 mb-4">
                        <input
                            type="text"
                            placeholder="Search transactions (UID, member name, item name, etc.)"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="px-4 py-2 border border-gray-600 rounded-lg focus:ring-yellow-400 focus:border-yellow-400 shadow-sm bg-gray-800 text-gray-200"
                        />
                        <label className="px-4 py-2 bg-green-500 text-white rounded-md cursor-pointer hover:bg-green-600 transition-colors">
                            Import Transactions
                            <input type="file" accept=".json" onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                try {
                                    const fileContent = await file.text();
                                    const importedData: Transaction[] = JSON.parse(fileContent).map((t: any) => ({
                                        ...t,
                                        items_json: typeof t.items_json === 'string' ? JSON.parse(t.items_json) : t.items_json
                                    }));
                                    if (!Array.isArray(importedData) || importedData.some(item => !item.id)) {
                                        throw new Error('Invalid JSON format. Expected an array of objects with an "id" field.');
                                    }
                                    const response = await fetch(`/api/transactions`, {
                                        method: 'PUT',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify(importedData.map(t => ({ ...t, items_json: JSON.stringify(t.items_json) }))),
                                    });
                                    if (!response.ok) {
                                        const errorData = await response.json();
                                        throw new Error(`Failed to import transactions: ${errorData.error || response.statusText}`);
                                    }
                                    // Using a simple message box instead of alert()
                                    alert("Transactions imported successfully! Data refreshed.");
                                    refreshData();
                                } catch (err: any) {
                                    console.error("Error importing transactions:", err);
                                    // Using a simple message box instead of alert()
                                    alert(`Failed to import transactions: ${err.message}`);
                                } finally {
                                    e.target.value = '';
                                }
                            }} className="hidden" />
                        </label>
                        <button
                            onClick={async () => {
                                try {
                                    const response = await fetch(`/api/transactions`);
                                    if (!response.ok) {
                                        throw new Error(`Failed to fetch transactions for export: ${response.statusText}`);
                                    }
                                    const dataToExport: Transaction[] = await response.json();
                                    const jsonString = JSON.stringify(dataToExport, null, 2);
                                    const blob = new Blob([jsonString], { type: 'application/json' });
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = `transactions.json`;
                                    document.body.appendChild(a);
                                    a.click();
                                    document.body.removeChild(a);
                                    URL.revokeObjectURL(url);
                                    // Using a simple message box instead of alert()
                                    alert("Transactions exported successfully!");
                                } catch (err: any) {
                                    console.error("Error exporting transactions:", err);
                                    // Using a simple message box instead of alert()
                                    alert(`Failed to export transactions: ${err.message}`);
                                }
                            }}
                            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                        >
                            Export Transactions
                        </button>
                        <button
                            onClick={refreshData}
                            className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                        >
                            Refresh
                        </button>
                    </div>
                    {filteredTransactions.length === 0 ? (
                        <p className="text-center text-gray-500 py-10">No transactions found.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-700">
                                <thead className="bg-gray-800">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Date</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Member</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Subtotal</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Discount</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Tax</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Total</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Items</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Payment</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-gray-900 divide-y divide-gray-700">
                                    {filteredTransactions.map((transaction) => {
                                        const member = members.find(m => m.uid === transaction.member_uid);
                                        return (
                                            <tr key={transaction.id}>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-100">
                                                    {formatUtcToBangkok(transaction.transaction_date)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-100">
                                                    {member ? `${member.name} (${member.card_number})` : 'N/A'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{formatCurrency(transaction.subtotal)}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-red-400">- {formatCurrency(transaction.discount_amount)}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{formatCurrency(transaction.tax_amount)}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-yellow-400">{formatCurrency(transaction.final_total)}</td>
                                                <td className="px-6 py-4 text-sm text-gray-300">
                                                    <ul className="list-disc list-inside">
                                                        {Array.isArray(transaction.items) && transaction.items.map((item, i) => (
                                                            <li key={i}>{item.name} (x{item.quantity} {item.unit})</li>
                                                        ))}
                                                    </ul>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300 capitalize">{transaction.payment_method}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-left text-sm font-medium"> {/* Changed to text-left */}
                                                    <button
                                                        onClick={() => {
                                                            setLastProcessedTransaction(transaction);
                                                            setIsReceiptModalOpen(true);
                                                        }}
                                                        className="text-blue-500 hover:text-blue-400 mr-3 transition duration-150 ease-in-out"
                                                    >
                                                        <Printer className="w-4 h-4 inline-block mr-1" /> Print
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteTransaction(transaction.id)}
                                                        className="text-red-500 hover:text-red-400 transition duration-150 ease-in-out"
                                                    >
                                                        <Trash2 className="w-4 h-4 inline-block mr-1" /> Delete
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Main Content Area - Inventory Screen */}
            {activeScreen === 'inventory' && (
                <div className="flex-1 bg-gray-900 p-6 rounded-lg shadow-md border border-gray-700 flex flex-col">
                    <h2 className="text-2xl font-bold text-yellow-400 mb-4 flex items-center justify-between">
                        <span className="flex items-center">
                            <Package className="w-6 h-6 mr-2" />
                            Inventory Management
                        </span>
                        <div className="text-base font-normal text-gray-300 flex items-center space-x-4">
                            <span>Total Available: <span className="font-semibold text-green-400">{totalAvailableStock}</span></span>
                            <span>Total Reserved: <span className="font-semibold text-orange-400">{totalReservedStock}</span></span>
                        </div>
                    </h2>
                    <div className="flex flex-wrap gap-4 mb-4">
                        <button
                            onClick={() => openInventoryForm(null)}
                            className="bg-yellow-400 text-gray-900 px-5 py-2 rounded-lg font-semibold hover:bg-yellow-500 transition-colors duration-200 shadow-md w-fit flex items-center justify-center"
                        >
                            <PlusCircle className="w-5 h-5 inline-block mr-2" />
                            Add New Item
                        </button>
                        <button
                            onClick={() => setShowAddCategoryModal(true)}
                            className="bg-purple-600 text-white px-5 py-2 rounded-lg font-semibold hover:bg-purple-700 transition-colors duration-200 shadow-md w-fit flex items-center justify-center"
                        >
                            <PlusCircle className="w-5 h-5 inline-block mr-2" />
                            Add New Category
                        </button>
                        <label className="px-4 py-2 bg-green-500 text-white rounded-md cursor-pointer hover:bg-green-600 transition-colors">
                            Import Inventory
                            <input type="file" accept=".json" onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                try {
                                    const fileContent = await file.text();
                                    const importedData: InventoryItem[] = JSON.parse(fileContent);
                                    if (!Array.isArray(importedData) || importedData.some(item => !item.id)) {
                                        throw new Error('Invalid JSON format. Expected an array of objects with an "id" field.');
                                    }
                                    const response = await fetch(`/api/inventory`, {
                                        method: 'PUT',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify(importedData),
                                    });
                                    if (!response.ok) {
                                        const errorData = await response.json();
                                        throw new Error(`Failed to import inventory: ${errorData.error || response.statusText}`);
                                    }
                                    // Using a simple message box instead of alert()
                                    alert("Inventory imported successfully! Data refreshed.");
                                    refreshData();
                                } catch (err: any) {
                                    console.error("Error importing inventory:", err);
                                    // Using a simple message box instead of alert()
                                    alert(`Failed to import inventory: ${err.message}`);
                                } finally {
                                    e.target.value = '';
                                }
                            }} className="hidden" />
                        </label>
                        <button
                            onClick={async () => {
                                try {
                                    const response = await fetch(`/api/inventory`);
                                    if (!response.ok) {
                                        throw new Error(`Failed to fetch inventory for export: ${response.statusText}`);
                                    }
                                    const dataToExport: InventoryItem[] = await response.json();
                                    const jsonString = JSON.stringify(dataToExport, null, 2);
                                    const blob = new Blob([jsonString], { type: 'application/json' });
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = `inventory.json`;
                                    document.body.appendChild(a);
                                    a.click();
                                    document.body.removeChild(a);
                                    URL.revokeObjectURL(url);
                                    // Using a simple message box instead of alert()
                                    alert("Inventory exported successfully!");
                                } catch (err: any) {
                                    console.error("Error exporting inventory:", err);
                                    // Using a simple message box instead of alert()
                                    alert(`Failed to export inventory: ${err.message}`);
                                }
                            }}
                            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                        >
                            Export Inventory
                        </button>
                        <button
                            onClick={refreshData}
                            className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                        >
                            Refresh
                        </button>
                    </div>
                    {inventoryItems.length === 0 ? (
                        <p className="text-center text-gray-500 py-10">No inventory items added yet.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-700">
                                <thead className="bg-gray-800">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Item Name</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Price Options</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Category</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Available</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Reserved</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-gray-900 divide-y divide-gray-700">
                                    {inventoryItems.map((item) => {
                                        const ItemIcon = getCategoryIcon(item.category);
                                        return (
                                            <tr key={item.id}>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-100 flex items-center">
                                                    <ItemIcon className="w-5 h-5 mr-2 text-yellow-400" />
                                                    {item.name}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-300">
                                                    {item.pricing_options.map((option, idx) => (
                                                        <div key={option.id || idx}>
                                                            {option.name}: {formatCurrency(option.price)} / {option.unit}
                                                        </div>
                                                    ))}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{item.category}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-green-400">{item.available_stock}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-orange-400">{item.reserved_stock}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-left text-sm font-medium"> {/* Adjusted text-align */}
                                                    <button
                                                        onClick={() => openInventoryForm(item)}
                                                        className="text-yellow-400 hover:text-yellow-300 mr-3 transition duration-150 ease-in-out"
                                                    >
                                                        <Edit2 className="w-4 h-4 inline-block mr-1" /> Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteInventoryItem(item.id)}
                                                        className="text-red-500 hover:text-red-400 transition duration-150 ease-in-out"
                                                    >
                                                        <Trash2 className="w-4 h-4 inline-block mr-1" /> Delete
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Main Content Area - Orders Screen */}
            {activeScreen === 'orders' && (
                <div className="flex-1 bg-gray-900 p-6 rounded-lg shadow-md border border-gray-700 flex flex-col">
                    <h2 className="text-2xl font-bold text-yellow-400 mb-4 flex items-center">
                        <ShoppingBag className="w-6 h-6 mr-2" />
                        Order Management
                    </h2>
                    <div className="flex flex-wrap gap-4 mb-4">
                        <button
                            onClick={() => openOrderForm()}
                            className="bg-yellow-400 text-gray-900 px-5 py-2 rounded-lg font-semibold hover:bg-yellow-500 transition-colors duration-200 shadow-md w-fit flex items-center justify-center"
                        >
                            <PlusCircle className="w-5 h-5 inline-block mr-2" />
                            Create New Order
                        </button>
                        <button
                            onClick={refreshData}
                            className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                        >
                            Refresh
                        </button>
                    </div>
                    {orders.length === 0 ? (
                        <p className="text-center text-gray-500 py-10">No orders currently.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-700">
                                <thead className="bg-gray-800">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Order ID</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Member</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Items</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Total Price</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Comment</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-gray-900 divide-y divide-gray-700">
                                    {orders.map((order) => {
                                        const member = members.find(m => m.uid === order.member_uid);
                                        return (
                                            <tr key={order.id}>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-100">{order.id.substring(0, 8)}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-100">
                                                    {member ? `${member.name} (${member.card_number})` : `UID: ${order.member_uid}`}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-300">
                                                    <ul className="list-disc list-inside">
                                                        {order.items.map((item, i) => (
                                                            <li key={i}>{item.name} ({item.quantity} {item.unit})</li>
                                                        ))}
                                                    </ul>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-400">{formatCurrency(order.total_price)}</td>
                                                <td className="px-6 py-4 text-sm text-gray-300 max-w-xs overflow-hidden text-ellipsis">{order.comment}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${order.status === 'pending' ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'}`}>
                                                        {order.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-left text-sm font-medium"> {/* Adjusted to text-left */}
                                                    {order.status === 'pending' && (
                                                        <button
                                                            onClick={() => handleFulfillOrder(order)}
                                                            className="text-green-500 hover:text-green-400 mr-3 transition duration-150 ease-in-out"
                                                        >
                                                            Fulfill
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleDeleteOrder(order.id)}
                                                        className="text-red-500 hover:text-red-400 transition duration-150 ease-in-out"
                                                    >
                                                        Delete
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Main Content Area - Reports Screen */}
            {activeScreen === 'reports' && (
                <div className="flex-1 bg-gray-900 p-6 rounded-lg shadow-md border border-gray-700 flex flex-col">
                    <h2 className="text-2xl font-bold text-yellow-400 mb-6 flex items-center">
                        <PieChart className="w-6 h-6 mr-2" />
                        Sales Reports
                    </h2>

                    {/* Filter Controls */}
                    <div className="flex flex-wrap items-end gap-4 mb-6 p-4 bg-gray-800 rounded-lg border border-gray-700">
                        <div>
                            <label htmlFor="memberFilter" className="block text-gray-300 text-sm font-medium mb-2">Filter by Member:</label>
                            <select
                                id="memberFilter"
                                value={selectedReportMemberUid || ''}
                                onChange={(e) => setSelectedReportMemberUid(e.target.value || null)}
                                className="px-4 py-2 border border-gray-600 rounded-lg focus:ring-yellow-400 focus:border-yellow-400 shadow-sm bg-gray-900 text-gray-200"
                            >
                                <option value="">All Members</option>
                                {members.map(member => (
                                    <option key={member.uid} value={member.uid}>{member.name} ({member.card_number})</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="startDate" className="block text-gray-300 text-sm font-medium mb-2">Start Date:</label>
                            <input
                                type="date"
                                id="startDate"
                                value={reportStartDate}
                                onChange={(e) => setReportStartDate(e.target.value)}
                                className="px-4 py-2 border border-gray-600 rounded-lg focus:ring-yellow-400 focus:border-yellow-400 shadow-sm bg-gray-900 text-gray-200"
                            />
                        </div>
                        <div>
                            <label htmlFor="endDate" className="block text-gray-300 text-sm font-medium mb-2">End Date:</label>
                            <input
                                type="date"
                                id="endDate"
                                value={reportEndDate}
                                onChange={(e) => setReportEndDate(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-600 rounded-lg focus:ring-yellow-400 focus:border-yellow-400 shadow-sm bg-gray-900 text-gray-200"
                            />
                        </div>
                        <button
                            onClick={() => {
                                setSelectedReportMemberUid(null);
                                setReportStartDate('');
                                setReportEndDate('');
                            }}
                            className="px-5 py-2 rounded-lg bg-gray-700 text-gray-200 font-semibold hover:bg-gray-600 transition-colors duration-200 shadow-md flex items-center justify-center h-fit"
                        >
                            Clear Filters
                        </button>
                    </div>

                    <div className="space-y-6">
                        {/* Total Sales Summary */}
                        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 shadow-lg">
                            <h3 className="text-xl font-semibold text-gray-200 mb-3">Overall Sales Summary (Filtered)</h3>
                            <p className="text-3xl font-bold text-yellow-400">
                                Total Transactions: {totalReportTransactions}
                            </p>
                            <p className="text-3xl font-bold text-yellow-400 mt-2">
                                Total Revenue: {formatCurrency(totalReportRevenue)}
                            </p>
                        </div>

                        {/* Sales by Category */}
                        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 shadow-lg">
                            <h3 className="text-xl font-semibold text-gray-200 mb-3">Sales by Category (Filtered)</h3>
                            {reportCategorySales.length === 0 ? (
                                <p className="text-gray-400">No sales data for categories with current filters.</p>
                            ) : (
                                reportCategorySales.map(cat => (
                                    <div key={cat.name} className="flex justify-between items-center text-lg text-gray-300 py-1">
                                        <span className="font-medium">{cat.name}:</span>
                                        <span>{formatCurrency(cat.sales)}</span>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Top Selling Items */}
                        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 shadow-lg">
                            <h3 className="text-xl font-semibold text-gray-200 mb-3">Top 5 Selling Items (Filtered)</h3>
                            {sortedReportItems.length === 0 ? (
                                <p className="text-gray-400">No sales data for top items with current filters.</p>
                            ) : (
                                <ul className="space-y-2">
                                    {sortedReportItems.map((item, index) => (
                                        <li key={index} className="flex justify-between items-center text-lg text-gray-300">
                                            <span className="font-medium">{item.name} (Qty: {item.quantity})</span>
                                            <span>{formatCurrency(item.revenue)}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content Area - Settings Screen */}
            {activeScreen === 'settings' && (
                <div className="flex-1 bg-gray-900 p-6 rounded-lg shadow-md border border-gray-700 flex flex-col">
                    <h2 className="text-2xl font-bold text-yellow-400 mb-4 flex items-center">
                        <Settings className="w-6 h-6 mr-2" />
                        Settings
                    </h2>
                    <div className="space-y-6">
                        {/* General Settings */}
                        <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                            <h3 className="text-xl font-semibold text-gray-200 mb-4">General Settings</h3>
                            <div className="space-y-4">
                                <div>
                                    <label htmlFor="taxRate" className="block text-gray-300 text-sm font-medium mb-2">Tax Rate (%)</label>
                                    <input
                                        type="number"
                                        id="taxRate"
                                        value={taxRate * 100}
                                        onChange={(e) => setTaxRate(parseFloat(e.target.value) / 100 || 0)}
                                        min="0"
                                        max="100"
                                        step="0.1"
                                        className="w-full md:w-1/2 px-4 py-2 border border-gray-600 rounded-lg focus:ring-yellow-400 focus:border-yellow-400 shadow-sm bg-gray-800 text-gray-200"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="idleTimeout" className="block text-gray-300 text-sm font-medium mb-2">Idle Logout Timeout (minutes)</label>
                                    <input
                                        type="number"
                                        id="idleTimeout"
                                        value={idleTimeoutMinutes}
                                        onChange={(e) => setIdleTimeoutMinutes(parseInt(e.target.value) || 0)}
                                        min="0"
                                        step="1"
                                        className="w-full md:w-1/2 px-4 py-2 border border-gray-600 rounded-lg focus:ring-yellow-400 focus:border-yellow-400 shadow-sm bg-gray-800 text-gray-200"
                                    />
                                    <p className="text-xs text-gray-400 mt-1">Set to 0 to disable automatic logout.</p>
                                </div>
                                <div>
                                    <p className="text-gray-300 text-sm font-medium mb-2">Storage Status:</p>
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-700 text-blue-200">
                                        <HardDrive className="w-4 h-4 mr-1" />
                                        Supabase (Cloud)
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Membership Discount Settings (New) */}
                        <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                            <h3 className="text-xl font-semibold text-gray-200 mb-4">Membership Discount Rates (%)</h3>
                            <div className="space-y-4">
                                {Object.keys(membershipDiscountRates).map(tier => (
                                    <div key={tier} className="flex items-center">
                                        <label htmlFor={`discount-${tier}`} className="block text-gray-300 text-sm font-medium w-32">{tier} Tier:</label>
                                        <input
                                            type="number"
                                            id={`discount-${tier}`}
                                            value={(membershipDiscountRates[tier] * 100).toFixed(0)} // Display as percentage
                                            onChange={(e) => setMembershipDiscountRates(prev => ({
                                                ...prev,
                                                [tier]: parseFloat(e.target.value) / 100 || 0
                                            }))}
                                            min="0"
                                            max="100"
                                            step="1"
                                            className="w-24 px-4 py-2 border border-gray-600 rounded-lg focus:ring-yellow-400 focus:border-yellow-400 shadow-sm bg-gray-800 text-gray-200"
                                           //* disabled={tier === 'Basic'} // Basic tier always 0%
                                        />
                                        <span className="ml-2 text-gray-400">%</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Menu Layout Management */}
                        <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                            <h3 className="text-xl font-semibold text-gray-200 mb-4 flex justify-between items-center">
                                Menu Layouts
                                <button
                                    onClick={() => openMenuLayoutForm()}
                                    className="px-4 py-2 bg-yellow-400 text-gray-900 rounded-lg text-sm font-semibold hover:bg-yellow-500 transition-colors"
                                >
                                    <PlusCircle className="w-4 h-4 inline-block mr-1" /> Add Layout
                                </button>
                            </h3>
                            {menuLayouts.length === 0 ? (
                                <p className="text-center text-gray-500 py-4">No menu layouts defined.</p>
                            ) : (
                                <ul className="space-y-3">
                                    {menuLayouts.map(layout => (
                                        <li key={layout.id} className="flex items-center justify-between bg-gray-700 p-3 rounded-lg border border-gray-600">
                                            <span className="text-lg font-medium text-gray-100 flex items-center">
                                                {layout.name}
                                                {activeMenuLayoutId === layout.id && (
                                                    <span className="ml-2 px-2 py-0.5 text-xs bg-green-500 text-white rounded-full">Active</span>
                                                )}
                                            </span>
                                            <div className="flex items-center space-x-3">
                                                <button
                                                    onClick={() => setActiveMenuLayoutId(layout.id)}
                                                    className={`px-3 py-1 rounded-md text-sm font-medium ${activeMenuLayoutId === layout.id ? 'bg-green-600 text-white cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                                                    disabled={activeMenuLayoutId === layout.id}
                                                >
                                                    Set Active
                                                </button>
                                                <button
                                                    onClick={() => openMenuLayoutForm(layout)}
                                                    className="text-yellow-400 hover:text-yellow-300"
                                                >
                                                    <Edit2 className="w-5 h-5" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteMenuLayout(layout.id)}
                                                    className="text-red-500 hover:text-red-400"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        {/* Category Management (New section) */}
                         <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                            <h3 className="text-xl font-semibold text-gray-200 mb-4 flex justify-between items-center">
                                Custom Categories
                                <button
                                    onClick={() => setShowAddCategoryModal(true)}
                                    className="px-4 py-2 bg-yellow-400 text-gray-900 rounded-lg text-sm font-semibold hover:bg-yellow-500 transition-colors"
                                >
                                    <PlusCircle className="w-4 h-4 inline-block mr-1" /> Add Category
                                </button>
                            </h3>
                            {/* Changed filter logic to compare by ID, assuming default categories have specific IDs */}
                            {allItemCategories.filter(cat => !defaultItemCategories.some(d => d.id === cat.id)).length === 0 ? (
                                <p className="text-center text-gray-500 py-4">No custom categories defined.</p>
                            ) : (
                                <ul className="space-y-3">
                                    {/* Changed filter logic to compare by ID */}
                                    {allItemCategories
                                        .filter(cat => !defaultItemCategories.some(d => d.id === cat.id))
                                        .map(cat => {
                                            const IconComponent = getCategoryIcon(cat.name);
                                            return (
                                                <li key={cat.id} className="flex items-center justify-between bg-gray-700 p-3 rounded-lg border border-gray-600">
                                                    <span className="text-lg font-medium text-gray-100 flex items-center">
                                                        <IconComponent className="w-5 h-5 mr-2" />
                                                        {cat.name}
                                                    </span>
                                                    <button
                                                        onClick={() => handleDeleteCategory(cat.id)}
                                                        className="text-red-500 hover:text-red-400"
                                                    >
                                                        <Trash2 className="w-5 h-5" />
                                                    </button>
                                                </li>
                                            );
                                        })}
                                </ul>
                            )}
                        </div>


                        {/* AI Reports Section */}
                        <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                            <h3 className="text-xl font-semibold text-gray-200 mb-4 flex items-center">
                                <Atom className="w-5 h-5 mr-2" />
                                AI Reports
                            </h3>
                            <button
                                onClick={() => setShowAiReportModal(true)}
                                className="px-5 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors duration-200 shadow-md flex items-center justify-center"
                            >
                                <PieChart className="w-5 h-5 mr-2" />
                                Generate AI Sales/Stock Report
                            </button>
                        </div>


                        {/* Danger Zone */}
                        <div className="p-4 bg-red-900 bg-opacity-20 rounded-lg border border-red-700">
                            <h3 className="text-xl font-semibold text-red-400 mb-4">Danger Zone</h3>
                            <button
                                onClick={() => {
                                    setConfirmMessage("Are you sure you want to delete ALL data (Members, Transactions, Inventory, Orders)? This action cannot be undone and will clear your entire database.");
                                    setConfirmAction(() => async () => {
                                        try {
                                            const [res1, res2, res3, res4, res5] = await Promise.all([
                                                fetch('/api/members/clear', { method: 'DELETE' }),
                                                fetch('/api/transactions/clear', { method: 'DELETE' }),
                                                fetch('/api/inventory/clear', { method: 'DELETE' }),
                                                fetch('/api/orders/clear', { method: 'DELETE' }), // Clear orders too
                                                supabase.from('categories').delete().neq('id', 'dummy') // Clear categories, assuming a dummy row won't exist
                                            ]);

                                            if (!res1.ok || !res2.ok || !res3.ok || !res4.ok || res5.error) {
                                                const errorText = await Promise.all([res1.text(), res2.text(), res3.text(), res4.text()]);
                                                throw new Error(`Failed to clear all data: ${errorText.join('; ')} ${res5.error ? res5.error.message : ''}`);
                                            }

                                            // Using a simple message box instead of alert()
                                            alert("All data cleared successfully!");
                                            setShowConfirmModal(false);
                                            refreshData();
                                        } catch (err: any) {
                                            // Using a simple message box instead of alert()
                                            alert(`Failed to clear all data: ${err.message}`);
                                            console.error('Clear all data error:', err);
                                            setShowConfirmModal(false);
                                        }
                                    });
                                    setShowConfirmModal(true);
                                }}
                                className="px-5 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors duration-200 shadow-md flex items-center justify-center mb-2"
                            >
                                <Trash2 className="w-5 h-5 inline-block mr-2" />
                                Clear All Data
                            </button>
                            <button
                                onClick={handleClearAllTransactions}
                                className="px-5 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors duration-200 shadow-md flex items-center justify-center"
                            >
                                <Trash2 className="w-5 h-5 inline-block mr-2" />
                                Clear All Transactions
                            </button>
                        </div>
                    </div>
                </div>
            )}


            {/* Member Add/Edit Modal */}
            {showMemberModal && (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-900 p-8 rounded-lg shadow-xl max-w-lg w-full border border-gray-700">
                        <h3 className="text-2xl font-semibold mb-6 text-yellow-400">{editMemberId ? 'Edit Member' : 'Add New Member'}</h3>
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="memberUid" className="block text-gray-300 text-sm font-medium mb-2">Card UID (Hexadecimal)</label>
                                <input
                                    type="text"
                                    id="memberUid"
                                    value={newMemberData.uid}
                                    onChange={(e) => setNewMemberData({ ...newMemberData, uid: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-600 rounded-lg focus:ring-yellow-400 focus:border-yellow-400 shadow-sm bg-gray-800 text-gray-200"
                                    placeholder="e.g., 0410C5D7A93F"
                                    readOnly={!!editMemberId}
                                />
                                {editMemberId && <p className="text-sm text-gray-500 mt-1">Card UID cannot be changed after creation.</p>}
                            </div>
                            <div>
                                <label htmlFor="memberCardNumber" className="block text-gray-300 text-sm font-medium mb-2">Card Number (1-300)</label>
                                <input
                                    type="number"
                                    id="memberCardNumber"
                                    value={newMemberData.cardNumber}
                                    onChange={(e) => setNewMemberData({ ...newMemberData, cardNumber: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-600 rounded-lg focus:ring-yellow-400 focus:border-yellow-400 shadow-sm bg-gray-800 text-gray-200"
                                    min="1" max="300"
                                />
                            </div>
                            <div>
                                <label htmlFor="memberName" className="block text-gray-300 text-sm font-medium mb-2">Member Name</label>
                                <input
                                    type="text"
                                    id="memberName"
                                    value={newMemberData.name}
                                    onChange={(e) => setNewMemberData({ ...newMemberData, name: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-600 rounded-lg focus:ring-yellow-400 focus:border-yellow-400 shadow-sm bg-gray-800 text-gray-200"
                                />
                            </div>
                            <div>
                                <label htmlFor="memberTier" className="block text-gray-300 text-sm font-medium mb-2">Membership Tier</label>
                                <select
                                    id="memberTier"
                                    value={newMemberData.tier}
                                    onChange={(e) => setNewMemberData({ ...newMemberData, tier: e.target.value as Member['tier'] })}
                                    className="w-full px-4 py-2 border border-gray-600 rounded-lg focus:ring-yellow-400 focus:border-yellow-400 shadow-sm bg-gray-800 text-gray-200"
                                >
                                    <option value="Basic">Basic</option>
                                    <option value="Gold">Gold</option>
                                    <option value="Supreme">Supreme</option>
                                </select>
                            </div>
                            <div>
                                <label htmlFor="memberPhone" className="block text-gray-300 text-sm font-medium mb-2">Phone (Optional)</label>
                                <input
                                    type="text"
                                    id="memberPhone"
                                    value={newMemberData.phone}
                                    onChange={(e) => setNewMemberData({ ...newMemberData, phone: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-600 rounded-lg focus:ring-yellow-400 focus:border-yellow-400 shadow-sm bg-gray-800 text-gray-200"
                                />
                            </div>
                            <div>
                                <label htmlFor="memberEmail" className="block text-gray-300 text-sm font-medium mb-2">Email (Optional)</label>
                                <input
                                    type="email"
                                    id="memberEmail"
                                    value={newMemberData.email}
                                    onChange={(e) => setNewMemberData({ ...newMemberData, email: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-600 rounded-lg focus:ring-yellow-400 focus:border-yellow-400 shadow-sm bg-gray-800 text-gray-200"
                                />
                            </div>
                            <div>
                                <label htmlFor="memberStatus" className="block text-gray-300 text-sm font-medium mb-2">Status</label>
                                <select
                                    id="memberStatus"
                                    value={newMemberData.status}
                                    onChange={(e) => setNewMemberData({ ...newMemberData, status: e.target.value as Member['status'] })}
                                    className="w-full px-4 py-2 border border-gray-600 rounded-lg focus:ring-yellow-400 focus:border-yellow-400 shadow-sm bg-gray-800 text-gray-200"
                                >
                                    <option value="Active">Active</option>
                                    <option value="Inactive">Inactive</option>
                                    <option value="Suspended">Suspended</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex justify-end space-x-3 mt-6">
                            <button
                                onClick={closeMemberModal}
                                className="px-5 py-2 rounded-lg bg-gray-700 text-gray-200 font-medium hover:bg-gray-600 transition-colors duration-200 shadow"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={editMemberId ? handleUpdateMember : handleAddMember}
                                className="px-5 py-2 rounded-lg bg-yellow-400 text-gray-900 font-medium hover:bg-yellow-500 transition-colors duration-200 shadow"
                            >
                                {editMemberId ? 'Update Member' : 'Add Member'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Inventory Add/Edit Modal */}
            {showInventoryModal && (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-900 p-8 rounded-lg shadow-xl max-w-lg w-full border border-gray-700">
                        <h3 className="text-2xl font-semibold mb-6 text-yellow-400">{editInventoryItemId ? 'Edit Inventory Item' : 'Add New Inventory Item'}</h3>
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="inventoryItemName" className="block text-gray-300 text-sm font-medium mb-2">Item Name</label>
                                <input
                                    type="text"
                                    id="inventoryItemName"
                                    value={newInventoryItemData.name}
                                    onChange={(e) => setNewInventoryItemData({ ...newInventoryItemData, name: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-600 rounded-lg focus:ring-yellow-400 focus:border-yellow-400 shadow-sm bg-gray-800 text-gray-200"
                                    placeholder="e.g., Coffee Mug"
                                />
                            </div>

                            {/* Stock Fields (only for existing items to adjust, or initial for new) */}
                            {/* For simplicity, allow initial stock setting during add, and adjustment during edit */}
                            {(editInventoryItemId || !editInventoryItemId) && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="availableStock" className="block text-gray-300 text-sm font-medium mb-2">Available Stock</label>
                                        <input
                                            type="number"
                                            id="availableStock"
                                            value={newInventoryItemData.available_stock}
                                            onChange={(e) => setNewInventoryItemData({ ...newInventoryItemData, available_stock: parseInt(e.target.value) || 0 })}
                                            className="w-full px-4 py-2 border border-gray-600 rounded-lg focus:ring-yellow-400 focus:border-yellow-400 shadow-sm bg-gray-800 text-gray-200"
                                            min="0"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="reservedStock" className="block text-gray-300 text-sm font-medium mb-2">Reserved Stock</label>
                                        <input
                                            type="number"
                                            id="reservedStock"
                                            value={newInventoryItemData.reserved_stock}
                                            onChange={(e) => setNewInventoryItemData({ ...newInventoryItemData, reserved_stock: parseInt(e.target.value) || 0 })}
                                            className="w-full px-4 py-2 border border-gray-600 rounded-lg focus:ring-yellow-400 focus:border-yellow-400 shadow-sm bg-gray-800 text-gray-200"
                                            min="0"
                                            readOnly={true} // Reserved stock primarily managed by order lifecycle
                                            disabled={true}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Dynamic Pricing Options */}
                            <h4 className="text-lg font-semibold text-gray-300 mt-6 mb-3">Pricing Options</h4>
                            {newInventoryItemData.pricingOptions.map((option, index) => (
                                <div key={option.id} className="flex flex-wrap items-end gap-3 p-3 bg-gray-800 rounded-lg border border-gray-700">
                                    <div className="flex-1 min-w-[120px]">
                                        <label htmlFor={`priceOptionName-${index}`} className="block text-gray-400 text-xs font-medium mb-1">Option Name</label>
                                        <input
                                            type="text"
                                            id={`priceOptionName-${index}`}
                                            value={option.name}
                                            onChange={(e) => handlePricingOptionChange(index, 'name', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-600 rounded-lg bg-gray-900 text-gray-200"
                                            placeholder="e.g., Gram, Piece"
                                        />
                                    </div>
                                    <div className="flex-1 min-w-[100px]">
                                        <label htmlFor={`priceOptionPrice-${index}`} className="block text-gray-400 text-xs font-medium mb-1">Price (THB)</label>
                                        <input
                                            type="number"
                                            id={`priceOptionPrice-${index}`}
                                            value={option.price}
                                            onChange={(e) => handlePricingOptionChange(index, 'price', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-600 rounded-lg bg-gray-900 text-gray-200"
                                            step="0.01"
                                            min="0"
                                        />
                                    </div>
                                    <div className="flex-1 min-w-[80px]">
                                        <label htmlFor={`priceOptionUnit-${index}`} className="block text-gray-400 text-xs font-medium mb-1">Unit</label>
                                        <select
                                            id={`priceOptionUnit-${index}`}
                                            value={option.unit}
                                            onChange={(e) => handlePricingOptionChange(index, 'unit', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-600 rounded-lg bg-gray-900 text-gray-200"
                                        >
                                            <option value="pieces">pieces</option>
                                            <option value="grams">grams</option>
                                            <option value="kg">kg</option>
                                            <option value="ml">ml</option>
                                            <option value="liter">liter</option>
                                            <option value="unit">unit</option>
                                        </select>
                                    </div>
                                    {newInventoryItemData.pricingOptions.length > 1 && (
                                        <button
                                            onClick={() => handleRemovePricingOption(index)}
                                            className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                                            title="Remove this pricing option"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            ))}
                            <button
                                onClick={handleAddPricingOption}
                                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                            >
                                <PlusCircle className="w-5 h-5 mr-2" /> Add Pricing Option
                            </button>
                            {/* End Dynamic Pricing Options */}

                            <div>
                                <label htmlFor="inventoryItemCategory" className="block text-gray-300 text-sm font-medium mb-2">Category</label>
                                <div className="flex items-center space-x-2">
                                    <select
                                        id="inventoryItemCategory"
                                        value={newInventoryItemData.category}
                                        onChange={(e) => setNewInventoryItemData({ ...newInventoryItemData, category: e.target.value })}
                                        className="flex-1 px-4 py-2 border border-gray-600 rounded-lg focus:ring-yellow-400 focus:border-yellow-400 shadow-sm bg-gray-800 text-gray-200"
                                    >
                                        {allItemCategories.map(cat => ( // Use allItemCategories here
                                            <option key={cat.id} value={cat.name}>{cat.name}</option> // Use cat.id as key
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label htmlFor="inventoryItemDescription" className="block text-gray-300 text-sm font-medium mb-2">Description (Optional)</label>
                                <div className="flex items-center space-x-2">
                                    <textarea
                                        id="inventoryItemDescription"
                                        value={newInventoryItemData.description}
                                        onChange={(e) => setNewInventoryItemData({ ...newInventoryItemData, description: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-600 rounded-lg focus:ring-yellow-400 focus:border-yellow-400 shadow-sm bg-gray-800 text-gray-200 resize-y"
                                        rows={3}
                                    ></textarea>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end space-x-3 mt-6">
                            <button
                                onClick={closeInventoryModal}
                                className="px-5 py-2 rounded-lg bg-gray-700 text-gray-200 font-medium hover:bg-gray-600 transition-colors duration-200 shadow"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddInventoryItem}
                                className="px-5 py-2 rounded-lg bg-yellow-400 text-gray-900 font-medium hover:bg-yellow-500 transition-colors duration-200 shadow"
                            >
                                {editInventoryItemId ? 'Update Item' : 'Add Item'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add New Category Modal */}
            {showAddCategoryModal && (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-900 p-8 rounded-lg shadow-xl max-w-sm w-full border border-gray-700">
                        <h3 className="text-2xl font-semibold mb-6 text-yellow-400">Add New Category</h3>
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="newCategoryName" className="block text-gray-300 text-sm font-medium mb-2">Category Name</label>
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="text"
                                        id="newCategoryName"
                                        value={newCategoryName}
                                        onChange={(e) => setNewCategoryName(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-600 rounded-lg focus:ring-yellow-400 focus:border-yellow-400 shadow-sm bg-gray-800 text-gray-200"
                                        placeholder="e.g., Drinks"
                                    />
                                    <button
                                        onClick={() => setShowCategoryIconSuggester(true)}
                                        className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                        title="Suggest Icon"
                                    >
                                        <Atom className="w-5 h-5" />
                                    </button>
                                </div>
                                {suggestedIconName && (
                                    <p className="text-sm text-green-400 mt-2 flex items-center">
                                        Suggested Icon: {React.createElement(iconMap[suggestedIconName] || CircleDashed, { className: "w-4 h-4 mr-1" })} Icon Applied!
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="flex justify-end space-x-3 mt-6">
                            <button
                                onClick={() => setShowAddCategoryModal(false)}
                                className="px-5 py-2 rounded-lg bg-gray-700 text-gray-200 font-medium hover:bg-gray-600 transition-colors duration-200 shadow"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddCategory}
                                className="px-5 py-2 rounded-lg bg-yellow-400 text-gray-900 font-medium hover:bg-yellow-500 transition-colors duration-200 shadow"
                            >
                                Add Category
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Category Icon Suggester Modal */}
            {showCategoryIconSuggester && (
                <CategoryIconSuggester
                    categoryName={newCategoryName}
                    onIconSuggested={handleIconSuggested}
                    onClose={() => setShowCategoryIconSuggester(false)}
                />
            )}

            {/* Sales Report AI Modal */}
            {showAiReportModal && (
                <SalesReportAI
                    members={members}
                    supabaseUrl={SUPABASE_URL}
                    supabaseAnonKey={SUPABASE_ANON_KEY}
                    transactions={transactions}
                    inventoryItems={inventoryItems}
                    orders={orders}
                    onClose={() => setShowAiReportModal(false)}
                    formatCurrency={formatCurrency}
                />
            )}

            {/* Item Selection Modal (for PoS Screen) */}
            {showItemSelectionModal && (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-900 p-8 rounded-lg shadow-xl max-w-5xl w-full h-4/5 flex flex-col border border-gray-700">
                        <h3 className="text-2xl font-semibold mb-6 text-yellow-400">Select Item from Inventory {selectedCategoryFilter && `(${selectedCategoryFilter})`}</h3>

                        {/* Category Filter Buttons */}
                        <div className="flex flex-wrap gap-3 mb-6 justify-center">
                            {allItemCategories
                                .filter(cat => activeMenuCategories.includes(cat.name)) // Filter by active menu layout categories
                                .map(cat => {
                                    const IconComponent = getCategoryIcon(cat.name);
                                    return (
                                        <button
                                            key={cat.id} // Use category.id as key
                                            onClick={() => setSelectedCategoryFilter(cat.name)}
                                            className={`px-4 py-2 rounded-lg font-semibold flex items-center transition-colors duration-200 ${selectedCategoryFilter === cat.name ? 'bg-yellow-500 text-gray-900' : 'bg-gray-700 text-gray-200 hover:bg-gray-600'}`}
                                        >
                                            <IconComponent className="w-5 h-5 mr-2" />
                                            {cat.name}
                                        </button>
                                    );
                                })}
                            <button
                                onClick={() => setSelectedCategoryFilter(null)}
                                className={`px-4 py-2 rounded-lg font-semibold flex items-center transition-colors duration-200 ${selectedCategoryFilter === null ? 'bg-yellow-500 text-gray-900' : 'bg-gray-700 text-gray-200 hover:bg-gray-600'}`}
                            >
                                <Grid className="w-5 h-5 mr-2" />
                                All Categories
                            </button>
                        </div>

                        {inventoryItems.length === 0 ? (
                            <p className="text-center text-gray-500 py-10">No items in inventory. Please add items in the 'Inventory' tab.</p>
                        ) : (
                            <div className="flex-1 overflow-y-auto mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {inventoryItems.filter(item =>
                                    (!selectedCategoryFilter || item.category === selectedCategoryFilter) &&
                                    activeMenuCategories.includes(item.category) // Also filter by active menu layout categories
                                ).map((item) => {
                                    const ItemIcon = getCategoryIcon(item.category);
                                    return (
                                        <div
                                            key={item.id}
                                            className={`bg-gray-800 p-4 rounded-lg shadow-lg border-2 ${selectedItemForTransaction?.id === item.id ? 'border-yellow-400' : 'border-gray-700'} flex flex-col`}
                                        >
                                            <div className="flex items-center mb-3">
                                                <ItemIcon className="w-8 h-8 mr-3 text-yellow-400" />
                                                <h4 className="text-xl font-semibold text-gray-100">{item.name}</h4>
                                            </div>
                                            <p className="text-sm text-gray-400 mb-4 flex-1">{item.description}</p>
                                            {/* Removed - (item.reserved_stock ?? 0) for display, it only shows available stock now. */}
                                            <p className="text-sm text-gray-300 mb-2">Available: <span className="text-green-400 font-semibold">{(item.available_stock ?? 0)}</span></p>
                                            <div className="border-t border-gray-700 pt-3 mt-auto">
                                                <h5 className="text-md font-semibold text-gray-300 mb-2">Pricing:</h5>
                                                {item.pricing_options.length === 0 ? (
                                                    <p className="text-red-400 text-sm">No pricing options set.</p>
                                                ) : (
                                                    <div className="grid grid-cols-2 gap-2">
                                                        {item.pricing_options.map((option, idx) => (
                                                            <button
                                                                key={option.id || idx}
                                                                onClick={() => {
                                                                    setSelectedItemForTransaction(item);
                                                                    setSelectedPricingOption(option);
                                                                }}
                                                                className={`p-2 rounded-lg text-sm font-medium transition-colors duration-200 border ${selectedItemForTransaction?.id === item.id && selectedPricingOption?.id === option.id ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600 hover:border-blue-500'}`}
                                                            >
                                                                {option.name}: {formatCurrency(option.price)} / {option.unit}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {selectedItemForTransaction && selectedPricingOption && (
                            <div className="mt-4 p-4 border border-gray-700 rounded-lg bg-gray-800 flex items-center justify-between">
                                <div>
                                    <h4 className="text-lg font-semibold text-yellow-400 mb-1">Add "{selectedItemForTransaction.name}" to Transaction</h4>
                                    <p className="text-gray-200">Selected Option: {selectedPricingOption.name} - {formatCurrency(selectedPricingOption.price)} / {selectedPricingOption.unit}</p>
                                </div>
                                <div className="flex items-center space-x-4">
                                    <label htmlFor="itemQuantity" className="text-gray-300 font-medium">Quantity:</label>
                                    <input
                                        type="number"
                                        id="itemQuantity"
                                        value={itemTransactionQuantity}
                                        onChange={(e) => setItemTransactionQuantity(parseInt(e.target.value) || 1)}
                                        min="1"
                                        className="w-24 px-3 py-2 border border-gray-600 rounded-lg focus:ring-yellow-400 focus:border-yellow-400 shadow-sm bg-gray-900 text-gray-200"
                                    />
                                    <span className="text-gray-400">{selectedPricingOption.unit}</span>
                                    <button
                                        onClick={handleAddItemToTransaction}
                                        className="bg-green-600 text-white px-5 py-2 rounded-lg font-semibold hover:bg-green-700 transition-colors duration-200 shadow-md flex items-center"
                                    >
                                        <PlusCircle className="w-5 h-5 inline-block mr-2" />
                                        Add to List
                                    </button>
                                </div>
                            </div>
                        )}
                        {!selectedPricingOption && selectedItemForTransaction && (
                            <p className="text-orange-400 mt-4 text-center">Please select a pricing option for "{selectedItemForTransaction.name}" to add it to the transaction.</p>
                        )}


                        <div className="flex justify-end space-x-3 mt-6">
                            <button
                                onClick={() => {
                                    setShowItemSelectionModal(false);
                                    setSelectedItemForTransaction(null);
                                    setSelectedPricingOption(null);
                                    setItemTransactionQuantity(1);
                                    setSelectedCategoryFilter(null);
                                }}
                                className="px-5 py-2 rounded-lg bg-gray-700 text-gray-200 font-medium hover:bg-gray-600 transition-colors duration-200 shadow"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Order Create/Edit Modal */}
            {showOrderModal && (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-900 p-8 rounded-lg shadow-xl max-w-2xl w-full border border-gray-700">
                        <h3 className="text-2xl font-semibold mb-6 text-yellow-400">{editOrderId ? 'Edit Order' : 'Create New Order'}</h3>
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="orderMemberUid" className="block text-gray-300 text-sm font-medium mb-2">Member UID</label>
                                <input
                                    type="text"
                                    id="orderMemberUid"
                                    value={newOrderData.memberUid}
                                    onChange={(e) => setNewOrderData({ ...newOrderData, memberUid: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-600 rounded-lg focus:ring-yellow-400 focus:border-yellow-400 shadow-sm bg-gray-800 text-gray-200"
                                    placeholder="Enter member UID"
                                    readOnly={!!editOrderId} // Can't change member of existing order for simplicity
                                />
                                {editMemberId && <p className="text-sm text-gray-500 mt-1">Member UID cannot be changed for existing orders.</p>}
                            </div>
                            <div>
                                <label htmlFor="orderComment" className="block text-gray-300 text-sm font-medium mb-2">Comment (Optional)</label>
                                <textarea
                                    id="orderComment"
                                    value={newOrderData.comment}
                                    onChange={(e) => setNewOrderData({ ...newOrderData, comment: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-600 rounded-lg focus:ring-yellow-400 focus:border-yellow-400 shadow-sm bg-gray-800 text-gray-200 resize-y"
                                    rows={2}
                                ></textarea>
                            </div>

                            <h4 className="text-lg font-semibold text-gray-300 mt-6 mb-3">Order Items</h4>
                            {newOrderData.items.length === 0 ? (
                                <p className="text-gray-500 text-center py-4">No items added to this order yet.</p>
                            ) : (
                                <div className="max-h-60 overflow-y-auto border border-gray-700 rounded-lg bg-gray-800">
                                    <table className="min-w-full divide-y divide-gray-700">
                                        <thead className="bg-gray-700">
                                            <tr>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase">Item</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase">Qty</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase">Price</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-700">
                                            {newOrderData.items.map((item, index) => (
                                                <tr key={index}>
                                                    <td className="px-4 py-2 text-sm text-gray-100">{item.name} ({item.unit})</td>
                                                    <td className="px-4 py-2 text-sm text-gray-300">{item.quantity}</td>
                                                    <td className="px-4 py-2 text-sm text-gray-300">{formatCurrency(item.price)}</td>
                                                    <td className="px-4 py-2 text-left"> {/* Adjusted to text-left */}
                                                        <button
                                                            onClick={() => handleRemoveOrderItem(index)}
                                                            className="text-red-500 hover:text-red-400"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            <div className="mt-4 p-4 border border-gray-700 rounded-lg bg-gray-800">
                                <h5 className="text-md font-semibold text-yellow-400 mb-3">Add Item to Order:</h5>
                                <div className="grid grid-cols-2 gap-4 mb-3">
                                    <div>
                                        <label className="block text-gray-300 text-sm font-medium mb-1">Select Item</label>
                                        <select
                                            value={selectedItemForTransaction?.id || ''}
                                            onChange={(e) => {
                                                const selected = inventoryItems.find(item => item.id === e.target.value);
                                                setSelectedItemForTransaction(selected || null);
                                                setSelectedPricingOption(selected?.pricing_options[0] || null);
                                                setItemTransactionQuantity(1);
                                            }}
                                            className="w-full px-3 py-2 border border-gray-600 rounded-lg bg-gray-900 text-gray-200"
                                        >
                                            <option value="">-- Select Item --</option>
                                            {inventoryItems.map(item => (
                                                <option key={item.id} value={item.id}>
                                                    {/* Removed - (item.reserved_stock ?? 0) here */}
                                                    {`${item.name} (Avail: ${(item.available_stock ?? 0)})`}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-gray-300 text-sm font-medium mb-1">Pricing Option</label>
                                        <select
                                            value={selectedPricingOption?.id || ''}
                                            onChange={(e) => {
                                                const selected = selectedItemForTransaction?.pricing_options.find(option => option.id === e.target.value);
                                                setSelectedPricingOption(selected || null);
                                            }}
                                            className="w-full px-3 py-2 border border-gray-600 rounded-lg bg-gray-900 text-gray-200"
                                            disabled={!selectedItemForTransaction || selectedItemForTransaction.pricing_options.length === 0}
                                        >
                                            <option value="">-- Select Option --</option>
                                            {selectedItemForTransaction?.pricing_options.map(option => (
                                                <option key={option.id} value={option.id}>
                                                    {option.name}: {formatCurrency(option.price)} / {option.unit}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-3">
                                    <label htmlFor="orderItemQuantity" className="text-gray-300 font-medium">Quantity:</label>
                                    <input
                                        type="number"
                                        id="orderItemQuantity"
                                        value={itemTransactionQuantity}
                                        onChange={(e) => setItemTransactionQuantity(parseInt(e.target.value) || 1)}
                                        min="1"
                                        className="w-20 px-3 py-2 border border-gray-600 rounded-lg focus:ring-yellow-400 focus:border-yellow-400 shadow-sm bg-gray-900 text-gray-200"
                                    />
                                    <span className="text-gray-400">{selectedPricingOption?.unit || 'unit'}</span>
                                    <button
                                        onClick={() => {
                                            if (selectedItemForTransaction && selectedPricingOption && itemTransactionQuantity > 0) {
                                                // Removed - (selectedItemForTransaction.reserved_stock ?? 0) here
                                                if (itemTransactionQuantity > (selectedItemForTransaction.available_stock ?? 0)) {
                                                    // Using a simple message box instead of alert()
                                                    alert(`Cannot add ${itemTransactionQuantity} of ${selectedItemForTransaction.name}. Only ${(selectedItemForTransaction.available_stock ?? 0)} available.`);
                                                    return;
                                                }
                                                handleAddOrderItem(selectedItemForTransaction, selectedPricingOption, itemTransactionQuantity);
                                                // Reset selection for next item
                                                setSelectedItemForTransaction(null);
                                                setSelectedPricingOption(null);
                                                setItemTransactionQuantity(1);
                                            } else {
                                                // Using a simple message box instead of alert()
                                                alert('Please select an item, pricing option and valid quantity to add.');
                                            }
                                        }}
                                        className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                                    >
                                        Add Item
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end space-x-3 mt-6">
                            <button
                                onClick={closeOrderModal}
                                className="px-5 py-2 rounded-lg bg-gray-700 text-gray-200 font-medium hover:bg-gray-600 transition-colors duration-200 shadow"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddOrder}
                                className="px-5 py-2 rounded-lg bg-yellow-400 text-gray-900 font-medium hover:bg-yellow-500 transition-colors duration-200 shadow"
                            >
                                Create Order
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Payment Method Selection Modal */}
            {showPaymentModal && (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-900 p-8 rounded-lg shadow-xl max-w-sm w-full border border-gray-700">
                        <h3 className="text-2xl font-semibold mb-6 text-yellow-400 text-center">Select Payment Method</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => handlePaymentMethodSelected('cash')}
                                className="flex flex-col items-center justify-center p-4 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors shadow-md"
                            >
                                <Coins className="w-8 h-8 mb-2" />
                                Cash
                            </button>
                            <button
                                onClick={() => handlePaymentMethodSelected('credit_card')}
                                className="flex flex-col items-center justify-center p-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-md"
                            >
                                <CreditCard className="w-8 h-8 mb-2" />
                                Credit Card
                            </button>
                            <button
                                onClick={() => handlePaymentMethodSelected('qr_code')}
                                className="flex flex-col items-center justify-center p-4 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors shadow-md"
                            >
                                <QrCode className="w-8 h-8 mb-2" />
                                QR Code
                            </button>
                            <button
                                onClick={() => handlePaymentMethodSelected('crypto')}
                                className="flex flex-col items-center justify-center p-4 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition-colors shadow-md"
                            >
                                <Atom className="w-8 h-8 mb-2" />
                                Crypto
                            </button>
                        </div>
                        <div className="mt-6 text-center">
                            <button
                                onClick={handlePaymentModalClose}
                                className="px-5 py-2 rounded-lg bg-gray-700 text-gray-200 font-medium hover:bg-gray-600 transition-colors duration-200 shadow"
                            >
                                Cancel Transaction
                            </button>
                        </div>
                    </div>
                </div>
            )}



            {/* Receipt Modal - Now primarily for display, printing handled by separate function */}
            {isReceiptModalOpen && lastProcessedTransaction && (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-900 p-8 rounded-lg shadow-xl max-w-lg w-full relative">
                        <button
                            onClick={() => setIsReceiptModalOpen(false)}
                            className="absolute top-4 right-4 text-gray-500 hover:text-gray-400"
                        >
                            <XCircle className="w-6 h-6" />
                        </button>
                        <h3 className="text-3xl font-bold text-center text-yellow-400 mb-6">Receipt Preview</h3>

                        <div className="text-center text-gray-300 mb-6">
                            <p className="font-semibold text-lg">Samui Cannabis Club</p>
                            {/* Ensure consistent timezone for display */}
                            <p>Transaction Date: {new Date(lastProcessedTransaction.transaction_date).toLocaleString('en-US', { timeZone: 'Asia/Bangkok' })}</p>
                        </div>

                        {lastProcessedTransaction.member_uid && (
                            <div className="mb-4 border-b border-gray-700 pb-4">
                                <p className="font-semibold">Member Information:</p>
                                <p>Name: {members.find(m => m.uid === lastProcessedTransaction.member_uid)?.name || 'N/A'}</p>
                                <p>Card Number: {members.find(m => m.uid === lastProcessedTransaction.member_uid)?.card_number || 'N/A'}</p>
                                <p>Tier: {members.find(m => m.uid === lastProcessedTransaction.member_uid)?.tier || 'N/A'}</p>
                            </div>
                        )}

                        <div className="mb-4">
                            <p className="font-semibold mb-2">Items:</p>
                            {Array.isArray(lastProcessedTransaction.items) && lastProcessedTransaction.items.map((item, index) => (
                                <div key={index} className="flex justify-between text-gray-200 text-sm mb-1">
                                    <span>{item.name} (x{item.quantity} {item.unit})</span>
                                    <span>{formatCurrency(item.price)} each = {formatCurrency(item.subtotal)}</span>
                                </div>
                            ))}
                        </div>

                        <div className="border-t border-b border-gray-700 py-4 mb-4 space-y-2">
                            <div className="flex justify-between font-medium text-gray-300">
                                <span>Subtotal:</span>
                                <span>{formatCurrency(lastProcessedTransaction.subtotal)}</span>
                            </div>
                            <div className="flex justify-between font-medium text-gray-300">
                                <span>Discount ({lastProcessedTransaction.discount_rate * 100}%):</span>
                                <span className="text-red-400">- {formatCurrency(lastProcessedTransaction.discount_amount)}</span>
                            </div>
                            <div className="flex justify-between font-medium text-gray-300">
                                <span>Tax ({taxRate * 100}%):</span>
                                <span>{formatCurrency(lastProcessedTransaction.tax_amount)}</span>
                            </div>
                            <div className="flex justify-between font-medium text-gray-300">
                                <span>Payment Method:</span>
                                <span className="capitalize">{lastProcessedTransaction.payment_method}</span>
                            </div>
                        </div>

                        <div className="flex justify-between text-3xl font-bold text-yellow-400 mb-6">
                            <span>Total:</span>
                            <span>{formatCurrency(lastProcessedTransaction.final_total)}</span>
                        </div>

                        <p className="text-center text-gray-400 italic">Thank you for your business!</p>

                        <div className="mt-6 text-center">
                            <button
                                onClick={triggerPrint} // This will now trigger the new print function
                                className="bg-blue-600 text-white px-5 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors duration-200 shadow-md flex items-center justify-center mx-auto"
                            >
                                <Printer className="w-5 h-5 inline-block mr-2" />
                                Print Receipt
                            </button>
                        </div>
                    </div>
                </div>
            )}


                                 {/* Menu Layout Management Modal */}
            {showMenuLayoutModal && editMenuLayoutData && (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-900 p-8 rounded-lg shadow-xl max-w-lg w-full border border-gray-700">
                        <h3 className="text-2xl font-semibold mb-6 text-yellow-400">{editMenuLayoutData.id ? 'Edit Menu Layout' : 'Add New Menu Layout'}</h3>
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="layoutName" className="block text-gray-300 text-sm font-medium mb-2">Layout Name</label>
                                <input
                                    type="text"
                                    id="layoutName"
                                    value={editMenuLayoutData.name}
                                    onChange={(e) => setEditMenuLayoutData(prev => prev ? { ...prev, name: e.target.value } : null)}
                                    className="w-full px-4 py-2 border border-gray-600 rounded-lg focus:ring-yellow-400 focus:border-yellow-400 shadow-sm bg-gray-800 text-gray-200"
                                    placeholder="e.g., Retail Layout"
                                />
                            </div>
                            <div>
                                <label className="block text-gray-300 text-sm font-medium mb-2">Select and Reorder Categories for this Layout:</label>
                                <div className="grid grid-cols-2 gap-2 bg-gray-800 p-4 rounded-lg border border-gray-700 max-h-60 overflow-y-auto">
                                    {/* Map over the categories currently selected in the layout for reordering */}
                                    {(editMenuLayoutData.categories || []) // <-- Defensive check here
                                        .map((categoryNameInLayout, layoutCategoryIndex) => {
                                            const cat = allItemCategories.find(c => c.name === categoryNameInLayout);
                                            if (!cat) return null; // Should not happen if data is consistent

                                            return (
                                                <DraggableCategoryLabel
                                                    key={cat.id} // Use category ID for a stable key
                                                    categoryName={cat.name}
                                                    isChecked={true} // It's always checked if it's in this array
                                                    layoutCategoryIndex={layoutCategoryIndex}
                                                    allCategories={allItemCategories} // Pass all categories for icon resolution
                                                    currentLayoutCategories={editMenuLayoutData.categories || []} // <-- Defensive check here again for the prop
                                                    toggleCategoryInLayout={toggleCategoryInLayout}
                                                    onReorderCategories={(fromIndex, toIndex) => {
                                                        setEditMenuLayoutData(prev => {
                                                            if (!prev) return null;
                                                            const updatedCategories = [...prev.categories];
                                                            const [movedItem] = updatedCategories.splice(fromIndex, 1);
                                                            updatedCategories.splice(toIndex, 0, movedItem);
                                                            return { ...prev, categories: updatedCategories };
                                                        });
                                                    }}
                                                />
                                            );
                                        })
                                        .filter(Boolean) // Filter out any nulls if a category wasn't found
                                    }

                                    {/* Then, add unselected categories at the bottom, not draggable/reorderable */}
                                    {allItemCategories
                                        .filter(cat => !(editMenuLayoutData.categories || []).includes(cat.name)) // <-- Defensive check here
                                        .sort((a, b) => a.name.localeCompare(b.name)) // Keep unselected sorted
                                        .map(cat => (
                                            <label
                                                key={cat.id}
                                                className="flex items-center text-gray-200 p-2 rounded-md bg-gray-800 opacity-60 cursor-not-allowed"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={false} // Unchecked
                                                    onChange={() => toggleCategoryInLayout(cat.name)} // Allows selecting them
                                                    className="form-checkbox h-5 w-5 text-yellow-400 rounded focus:ring-yellow-400 bg-gray-700 border-gray-600 cursor-pointer"
                                                />
                                                <span className="ml-2">{cat.name}</span>
                                            </label>
                                        ))}
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end space-x-3 mt-6">
                            <button
                                onClick={() => setShowMenuLayoutModal(false)}
                                className="px-5 py-2 rounded-lg bg-gray-700 text-gray-200 font-medium hover:bg-gray-600 transition-colors duration-200 shadow"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddMenuLayout}
                                className="px-5 py-2 rounded-lg bg-yellow-400 text-gray-900 font-medium hover:bg-yellow-500 transition-colors duration-200 shadow"
                            >
                                {editMenuLayoutData.id ? 'Update Layout' : 'Add Layout'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}

export default App;
