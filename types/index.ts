// types/index.ts
// This file defines the TypeScript interfaces for your data models.
// Make sure this file is present at `your-project-root/types/index.ts`

export interface PricingOption {
    id: string; // Unique ID for each pricing option within an item
    name: string; // e.g., "Per Gram", "Per Piece", "Half Ounce"
    price: number; // The price for this specific option
    unit: string; // e.g., "g", "piece", "oz"
}
// Assuming this is defined somewhere accessible, e.g., in '@/types'
export interface MenuLayout {
    id: string;
    name: string;
    categories: string[]; // Array of category names in the desired order
}
export interface InventoryItem {
    id: string;
    name: string;
    pricing_options: PricingOption[]; // Array of detailed pricing options
    description: string;
    category: string;
    available_stock: number; // Added for available quantity
    reserved_stock: number| null; // Added for reserved quantity (for pending orders)
    created_at?: string;
}

export interface Transaction {
    id: string;
    transaction_date: string;
    items_json: Array<{ itemId: string; quantity: number; price: number; selectedOptionId: string; }>; // Store selected option ID
    subtotal: number;
    discount_rate: number;
    discount_amount: number;
    tax_amount: number;
    final_total: number;
    member_uid: string | null;
    payment_method: string; // Explicitly added payment_method
    created_at?: string;
}

export interface Member {
    id: string;
    uid: string;
    card_number: number;
    name: string;
    tier: 'Basic' | 'Gold' | 'Supreme'; // Updated loyalty tiers
    phone?: string;
    email?: string;
    status: 'Active' | 'Inactive' | 'Suspended';
    total_purchases?: number; // Added for tracking member's total purchases
    created_at?: string;
}

export interface AdminUser {
    id: string;
    uid?: string; // NFC card UID for login
    username?: string; // Manual login username
    password?: string; // In production, this should be password_hash
    role: 'admin' | 'staff';
    created_at?: string;
}

export interface Order {
    id: string;
    member_uid: string;
    items_json: Array<{
        itemId: string;
        name: string;
        quantity: number;
        price: number;
        unit: string;
        category: string;
        selectedOptionId: string;
    }>;
    total_price: number;
    comment?: string;
    status: 'pending' | 'fulfilled' | 'cancelled';
    created_at?: string;
    order_date?: string;
}


export type DataType = 'inventory' | 'transactions' | 'members' | 'orders';

export type ExportedData<T> = T[];
export type ImportedData<T> = T[];

// New interface for Menu Layouts
export interface MenuLayout {
    id: string;
    name: string;
    categories: string[]; // Array of category names included in this layout
}