import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { Order } from '@/types';

// GET all orders
export async function GET(request: Request) {
  try {
    const { data, error } = await supabase.from('orders').select('*');

    if (error) {
      console.error('Supabase error (GET orders):', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('API error (GET orders):', error);
    return NextResponse.json({ error: error.message || 'An unexpected error occurred' }, { status: 500 });
  }
}

// POST a new order
export async function POST(request: Request) {
  try {
    const orderData = await request.json();

    // Ensure items_json is parsed correctly if sent as a string
    const itemsJsonParsed = typeof orderData.items_json === 'string'
      ? JSON.parse(orderData.items_json)
      : orderData.items_json;

    const orderToInsert: Order = {
      id: orderData.id || crypto.randomUUID(),
      member_uid: orderData.member_uid,
      items_json: itemsJsonParsed,
      total_price: parseFloat(orderData.total_price),
      comment: orderData.comment,
      status: orderData.status || 'pending',
      created_at: orderData.created_at || new Date().toISOString(),
    };

    if (!orderToInsert.member_uid || !orderToInsert.items_json || orderToInsert.items_json.length === 0 || isNaN(orderToInsert.total_price)) {
      return NextResponse.json({ error: 'Member UID, items, and total price are required for an order.' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('orders')
      .insert([orderToInsert])
      .select();

    if (error) {
      console.error('Supabase error (POST order):', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data[0], { status: 201 });
  } catch (error: any) {
    console.error('API error (POST order):', error);
    return NextResponse.json({ error: error.message || 'An unexpected error occurred' }, { status: 500 });
  }
}

// PUT to update an order (e.g., status, items)
export async function PUT(request: Request) {
  try {
    const ordersToUpdate: Order[] = await request.json();

    if (!Array.isArray(ordersToUpdate) || ordersToUpdate.length === 0) {
      return NextResponse.json({ error: 'An array of orders is required for PUT operation.' }, { status: 400 });
    }

    const processedOrders = ordersToUpdate.map(order => ({
      ...order,
      // Ensure items_json is an actual object/array for Supabase upsert
      items_json: typeof order.items_json === 'string' ? JSON.parse(order.items_json) : order.items_json
    }));


    const { data, error } = await supabase
      .from('orders')
      .upsert(processedOrders, { onConflict: 'id' })
      .select();

    if (error) {
      console.error('Supabase error (PUT orders):', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error: any) {
    console.error('API error (PUT orders):', error);
    return NextResponse.json({ error: error.message || 'An unexpected error occurred' }, { status: 500 });
  }
}