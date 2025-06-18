import React, { useState, useEffect } from 'react';
import {
    Flower, Syringe, Cookie, Cigarette, Megaphone, Leaf, ShoppingBag, MoreHorizontal,
    ShoppingCart, Users, History, Settings, Package, Scan, XCircle, Loader2, Trash2, CheckCircle,
    PlusCircle, Edit2, ChevronDown, ChevronUp, AlertCircle, CircleDashed,
    Grid, Printer, HardDrive, LogIn, PieChart, Coins, CreditCard, QrCode, Atom, Wand2,
    // A smaller, more manageable set for AI suggestions + common usage
    Book, Coffee, Utensils, Gamepad, Dumbbell, Home, Heart, Gift, Lightbulb, Truck,
    Box, Wine, Apple, Pizza, Music, Film, Microscope, FlaskConical,
    Diamond, Scale, Bolt, Sun, Cloud, Moon, Star, Bell, Building, Car, Award,
    BookOpen, Camera, Clipboard, Code, Compass, Database, Droplet, Egg, Factory,
    Feather, Flag, Glasses, Globe, Hammer, Hand, Hash, HeartHandshake,
    Key, LampCeiling, LeafyGreen, Link, Loader, Lock, Mail, MapPin, MessageCircle,
    Monitor, Mountain, Newspaper, Palette, PenTool, Phone, PiggyBank, Plane,
    Puzzle, Rocket, Scissors, Shield, Sparkles, Sprout, Tag, Tent, TreePalm,
    Umbrella, User, CheckCheck, VolumeX, Watch, Wifi, WineOff, Wrench, Zap, GripVertical
} from 'lucide-react';
// Assuming types are defined in '@/types' - these are needed for type safety
import { InventoryItem, Transaction, Member, Order } from '@/types';

interface SalesReportAIProps {
    onClose: () => void;
    transactions: Transaction[];
    inventoryItems: InventoryItem[];
    members: Member[];
    orders: Order[];
    formatCurrency: (amount: number) => string;
    // Add these two new properties
    supabaseUrl: string;
    supabaseAnonKey: string;
}

const SalesReportAI: React.FC<SalesReportAIProps> = ({
    onClose,
    transactions,
    inventoryItems,
    members,
    orders,
    formatCurrency
}) => {
    const [reportContent, setReportContent] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [aiError, setAiError] = useState<string | null>(null);

    useEffect(() => {
        const generateReport = async () => {
            setIsLoading(true);
            setAiError(null);
            setReportContent('');

            try {
                console.log("Using data provided via props for AI report generation...");

                const reportData = {
                    transactions: transactions,
                    inventoryItems: inventoryItems,
                    members: members,
                    orders: orders,
                };

                const prompt = `
                    As an AI assistant for a cannabis dispensary POS system, your task is to generate a comprehensive sales and stock report in Markdown format.
                    Use the following JSON data to create the report. Do not make up any data.
                    
                    **Strict SQL Query Guidelines:**
                    - For "Overall Sales Summary", combine total revenue, discount, and tax.
                    - **Crucially: Do NOT include ANY SQL queries for individual insights or general examples within the "Insights" section. The Insights section should contain only observations and text.**

                    The report should include:
                    1.  **Overall Sales Summary**: Total revenue, total discount given, total tax collected.
                    2.  **Top Selling Items**: List the top 5 items by total quantity sold across all transactions and by total revenue generated.
                    3.  **Low Stock Alerts**: Identify any items from 'inventoryItems' with 'available_stock' less than 10. List item name and current available stock.
                    4.  **Member Activity Summary**: Total number of members, breakdown by tier (Basic, Gold, Supreme) from 'members' table.
                    5.  **Order Status Summary**: Number of 'pending', 'fulfilled', and 'cancelled' orders from 'orders' table.
                    6.  **Insights**: Provide 2-3 brief insights or observations based on the data, e.g., trends in sales, popular payment methods, or stock issues. **REMEMBER: NO SQL QUERIES IN THIS SECTION.**

    

                    JSON Data:
                    ${JSON.stringify(reportData, null, 2)}

                    Please ensure the output is well-formatted using Markdown syntax for headings, lists, and code blocks.
                `;

                // 3. Call Gemini API
                console.log("Calling Gemini API with prepared prompt...");
                const apiKey = "AIzaSyCI_8aLOKtwlCHtCRb79aPvhyF2_uWh-ao"; // Canvas will automatically provide the API key at runtime for gemini-2.0-flash
                const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

                const chatHistory = [];
                chatHistory.push({ role: "user", parts: [{ text: prompt }] });
                const payload = { contents: chatHistory };

                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                const result = await response.json();
                console.log("Gemini API response:", result);

                if (result.candidates && result.candidates.length > 0 &&
                    result.candidates[0].content && result.candidates[0].content.parts &&
                    result.candidates[0].content.parts.length > 0) {
                    const text = result.candidates[0].content.parts[0].text;
                    setReportContent(text);
                } else {
                    setAiError(result.error?.message || 'Failed to generate AI report: No content received from Gemini.');
                    console.error("Gemini API Error details:", result);
                }
            } catch (err: any) {
                setAiError(err.message || 'An error occurred during AI report generation.');
                console.error('AI Report Generation Error:', err);
            } finally {
                setIsLoading(false);
            }
        };

        generateReport();
    }, [transactions, inventoryItems, members, orders]);

    // Removed the 'marked.parse' step. We will display the raw Markdown content.
    // const formattedReport = marked.parse(reportContent);

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-xl border border-gray-700 max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-2xl font-semibold text-white">AI Sales and Stock Report</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <XCircle size={24} />
                    </button>
                </div>
                <div className="flex-grow overflow-y-auto custom-scrollbar pr-2 text-gray-200 text-sm leading-relaxed">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-full">
                            <Loader2 size={32} className="animate-spin text-yellow-400" />
                            <span className="ml-3 text-yellow-400">Generating report...</span>
                        </div>
                    ) : aiError ? (
                        <div className="text-red-400">Error: {aiError}</div>
                    ) : (
                        // Display the raw reportContent inside a <pre> tag to preserve formatting
                        <pre style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>{reportContent}</pre>
                    )}
                </div>
                <div className="mt-6 text-right">
                    <button
                        onClick={onClose}
                        className="px-5 py-2 rounded-lg bg-gray-700 text-gray-200 font-medium hover:bg-gray-600 transition-colors duration-200 shadow"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SalesReportAI;
