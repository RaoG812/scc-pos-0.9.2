// utils/receiptGenerator.js
// This script provides a function to generate a print-ready HTML string for a transaction receipt.

/**
 * Formats a number as currency (Thai Baht).
 * @param {number} value The numeric value to format.
 * @returns {string} The formatted currency string.
 */
const formatCurrency = (value) => {
    return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(value);
};

/**
 * Generates a full HTML string for a transaction receipt, optimized for printing.
 * @param {object} transaction The transaction object containing details like items, totals, payment method.
 * @param {number} taxRate The current tax rate (e.g., 0.07 for 7%).
 * @param {Array<object>} members The array of member objects to look up member details.
 * @returns {string} A complete HTML document string representing the receipt.
 */
export const generateReceiptHtml = (transaction, taxRate, members) => {
    const transactionDate = new Date(transaction.transaction_date);
    const memberInfo = transaction.member_uid
        ? members.find(m => m.uid === transaction.member_uid)
        : null;

    const receiptItemsHtml = transaction.items.map(item => `
        <div style="display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 2px;">
            <span>${item.name} (x${item.quantity} ${item.unit})</span>
            <span>${formatCurrency(item.price)} ea = ${formatCurrency(item.subtotal)}</span>
        </div>
    `).join('');

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Receipt - Transaction ${transaction.id.substring(0, 8)}</title>
            <style>
                body {
                    font-family: 'monospace', 'Inter', sans-serif; /* Use monospace for receipt-like feel, fallback to Inter */
                    margin: 0;
                    padding: 5mm; /* Small padding for the print area */
                    color: black; /* Ensure all text is black */
                    font-size: 10px; /* Base font size for receipt */
                    line-height: 1.2; /* Compact line height */
                    box-sizing: border-box; /* Include padding in width */
                    width: 78mm; /* Standard thermal printer width */
                }
                .receipt-container {
                    width: 100%;
                    max-width: 78mm;
                    margin: 0 auto; /* Center the content if printed on wider paper */
                    background: white;
                }
                .text-center { text-align: center; }
                .font-bold { font-weight: bold; }
                .font-semibold { font-weight: 600; }
                .text-lg { font-size: 12px; }
                .text-xl { font-size: 14px; }
                .text-3xl { font-size: 16px; font-weight: bold; }
                .mb-1 { margin-bottom: 1px; }
                .mb-2 { margin-bottom: 2px; }
                .mb-4 { margin-bottom: 4px; }
                .mb-6 { margin-bottom: 6px; }
                .py-2 { padding-top: 2px; padding-bottom: 2px; }
                .py-4 { padding-top: 4px; padding-bottom: 4px; }
                .border-bottom { border-bottom: 1px dashed black; padding-bottom: 4px; margin-bottom: 4px; }
                .border-top { border-top: 1px dashed black; padding-top: 4px; margin-top: 4px; }
                .flex-between { display: flex; justify-content: space-between; }
                .indent { margin-left: 10px; }
                ul { list-style-type: none; padding: 0; margin: 0; }
                li { font-size: 9px; line-height: 1.1; }
                .italic { font-style: italic; }
                .capitalize { text-transform: capitalize; }
            </style>
        </head>
        <body>
            <div class="receipt-container">
                <h1 class="text-xl font-bold text-center mb-4">Your Store Name</h1>
                <p class="text-center mb-2">Transaction ID: ${transaction.id.substring(0, 8)}</p>
                <p class="text-center mb-6">Date: ${transactionDate.toLocaleDateString()} ${transactionDate.toLocaleTimeString()}</p>

                ${memberInfo ? `
                    <div class="border-bottom mb-4">
                        <p class="font-semibold">Member Information:</p>
                        <p class="indent">Name: ${memberInfo.name}</p>
                        <p class="indent">Card No: ${memberInfo.card_number}</p>
                        <p class="indent">Tier: ${memberInfo.tier}</p>
                    </div>
                ` : ''}

                <div class="mb-4">
                    <p class="font-semibold mb-2">Items:</p>
                    ${receiptItemsHtml}
                </div>

                <div class="border-top border-bottom py-4 mb-4">
                    <div class="flex-between mb-1">
                        <span>Subtotal:</span>
                        <span>${formatCurrency(transaction.subtotal)}</span>
                    </div>
                    <div class="flex-between mb-1">
                        <span>Discount (${transaction.discount_rate * 100}%):</span>
                        <span>- ${formatCurrency(transaction.discount_amount)}</span>
                    </div>
                    <div class="flex-between mb-1">
                        <span>Tax (${taxRate * 100}%):</span>
                        <span>${formatCurrency(transaction.tax_amount)}</span>
                    </div>
                    <div class="flex-between mb-1">
                        <span>Payment Method:</span>
                        <span class="capitalize">${transaction.payment_method}</span>
                    </div>
                </div>

                <div class="flex-between text-3xl font-bold mb-6">
                    <span>TOTAL:</span>
                    <span>${formatCurrency(transaction.final_total)}</span>
                </div>

                <p class="text-center italic">Thank you for your business!</p>
                <p class="text-center italic mt-2">Powered by SCC PoS</p>
            </div>
        </body>
        </html>
    `;
};
