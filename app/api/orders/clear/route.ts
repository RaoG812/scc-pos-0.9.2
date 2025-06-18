import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// DELETE all orders
export async function DELETE(request: Request) {
  try {
    const { error } = await supabase
      .from('orders')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all where ID is not a dummy value

    if (error) {
      console.error('Supabase error (DELETE ALL orders):', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'All orders deleted successfully' }, { status: 200 });
  } catch (error: any) {
    console.error('API error (DELETE ALL orders):', error);
    return NextResponse.json({ error: error.message || 'An unexpected error occurred' }, { status: 500 });
  }
}