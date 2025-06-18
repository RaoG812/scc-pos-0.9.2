import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Supabase Configuration - ENSURE THESE MATCH YOURS IN page.tsx
const SUPABASE_URL = "https://lhjaomhlyrmohxsjctri.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxoamFvbWhseXJtb2h4c2pjdHJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk1MjU0NjAsImV4cCI6MjA2NTEwMTQ2MH0.cS9R5DiW2VUISJ1ypuOAr-ALTF-NHD-R12-0LVV-1E";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Define a type for Category to ensure consistency
interface Category {
    id: string;
    name: string;
    icon_name: string;
}

// GET handler to fetch all categories
export async function GET(req: NextRequest) {
    try {
        const { data, error } = await supabase
            .from('categories')
            .select('*');

        if (error) {
            console.error('Supabase error fetching categories:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(data as Category[], { status: 200 });
    } catch (error: any) {
        console.error('Unexpected error in GET /api/categories:', error);
        return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}

// POST handler to add new categories
export async function POST(req: NextRequest) {
    try {
        const newCategory: Category = await req.json();

        // Basic validation
        if (!newCategory.name) {
            return NextResponse.json({ error: 'Category name is required' }, { status: 400 });
        }

        // Add a default icon_name if not provided
        if (!newCategory.icon_name) {
            newCategory.icon_name = 'CircleDashed'; // Or any other default
        }

        const { data, error } = await supabase
            .from('categories')
            .insert([newCategory])
            .select(); // Use select() to return the inserted data

        if (error) {
            console.error('Supabase error adding category:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(data[0] as Category, { status: 201 });
    } catch (error: any) {
        console.error('Unexpected error in POST /api/categories:', error);
        return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}

// DELETE handler for a specific category by ID (if needed, though page.tsx directly uses supabase for delete)
// This is an example if you were to use a route handler for delete, but page.tsx uses direct supabase call.

export async function DELETE(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
        return NextResponse.json({ error: 'Category ID is required' }, { status: 400 });
    }

    try {
        const { error } = await supabase
            .from('categories')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Supabase error deleting category:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ message: 'Category deleted successfully' }, { status: 200 });
    } catch (error: any) {
        console.error('Unexpected error in DELETE /api/categories:', error);
        return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}

